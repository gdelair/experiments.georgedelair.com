// possessed-street-fighter.js — 2D fighting game with haunting corruption
// Two-fighter combat with health bars, AI opponent, and increasing possession

import { GameBase } from './game-base.js';
import { input, BUTTONS } from '../core/input.js';
import { sfx } from '../audio/sfx.js';
import state from '../core/state.js';
import { events, EVENTS } from '../core/events.js';

// Arena constants
const GROUND_Y = 340;
const ARENA_LEFT = 30;
const ARENA_RIGHT = 482;
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const MOVE_SPEED = 3.5;
const PUSH_BACK = 4;

// Attack data
const ATTACKS = {
    punch:   { damage: 8,  range: 50, startup: 4, active: 3, recovery: 8,  hitstun: 12, type: 'high' },
    kick:    { damage: 12, range: 60, startup: 6, active: 4, recovery: 12, hitstun: 16, type: 'low' },
    special: { damage: 20, range: 80, startup: 10, active: 6, recovery: 20, hitstun: 24, type: 'mid' }
};

// Round constants
const MAX_HEALTH = 100;
const ROUND_TIME = 99;
const WIN_ROUNDS = 2;

export class PossessedStreetFighter extends GameBase {
    constructor() {
        super({
            id: 'street-fighter',
            name: 'POSSESSED STREET FIGHTER',
            channel: 7,
            titleColor: '#ff6600',
            bgColor: '#000020',
            titleText: 'POSSESSED STREET FIGHTER'
        });

        // Fighters
        this.player = null;
        this.opponent = null;

        // Round state
        this.roundTimer = ROUND_TIME;
        this.round = 1;
        this.playerWins = 0;
        this.opponentWins = 0;
        this.roundOver = false;
        this.roundEndTimer = 0;
        this.roundStartTimer = 0;
        this.showRoundText = '';
        this.matchOver = false;

        // Combat
        this.hitSparks = [];
        this.particles = [];
        this.comboCounter = 0;
        this.comboTimer = 0;

        // Haunting
        this.inputReadEnabled = false;     // AI reads inputs at stage 2+
        this.healthBarsLie = false;         // Health bars lie at stage 3+
        this.glitchFighter = null;          // 3rd fighter at stage 4
        this.glitchFighterTimer = 0;
        this.possessionFlashes = [];
        this.aiPredictedMove = null;
        this.screenShake = 0;
        this.bloodParticles = [];
        this.crowdAnim = 0;
    }

    onInit() {
        this.resetMatch();
    }

    onStart() {
        this.resetMatch();
    }

    onStop() {
        this.clearTimers();
    }

    onRestart() {
        this.resetMatch();
    }

    onDeath() {
        // No-op for fighting game; handled by round system
    }

    onTitleDismiss() {
        sfx.play('confirm');
    }

    resetMatch() {
        this.round = 1;
        this.playerWins = 0;
        this.opponentWins = 0;
        this.matchOver = false;
        this.comboCounter = 0;
        this.comboTimer = 0;
        this.glitchFighter = null;
        this.glitchFighterTimer = 0;
        this.possessionFlashes = [];
        this.bloodParticles = [];
        this.screenShake = 0;
        this.score = 0;
        this.crowdAnim = 0;

        this.resetRound();
    }

    resetRound() {
        this.player = this.createFighter(120, GROUND_Y, 1, '#3366ff', 'RYU');
        this.opponent = this.createFighter(380, GROUND_Y, -1, '#cc3333', 'KEN');

        this.roundTimer = ROUND_TIME;
        this.roundOver = false;
        this.roundEndTimer = 0;
        this.roundStartTimer = 2.0;
        this.showRoundText = `ROUND ${this.round}`;
        this.hitSparks = [];
        this.particles = [];
        this.comboCounter = 0;
        this.comboTimer = 0;

        // Haunting state
        this.inputReadEnabled = this.hauntStage >= 2;
        this.healthBarsLie = this.hauntStage >= 3;
        this.aiPredictedMove = null;

        // Glitch fighter at stage 4
        if (this.hauntStage >= 4 && !this.glitchFighter) {
            this.glitchFighterTimer = 10 + Math.random() * 15;
        }
    }

    createFighter(x, y, facing, color, name) {
        return {
            x, y,
            vx: 0,
            vy: 0,
            facing,
            color,
            name,
            health: MAX_HEALTH,
            maxHealth: MAX_HEALTH,
            width: 36,
            height: 64,
            onGround: true,
            state: 'idle',
            stateTimer: 0,
            attackType: null,
            attackFrame: 0,
            blockTimer: 0,
            hitstunTimer: 0,
            knockdownTimer: 0,
            animTimer: 0,
            invincible: 0,
            crouching: false,
            specialCharge: 0,
            aiTimer: 0,
            aiAction: null,
            aiReactionTime: 0.15,
            specialCooldown: 0
        };
    }

    onUpdate(dt, timestamp) {
        const dtSec = dt / 1000;
        this.updateTimers(dt);
        this.crowdAnim += dtSec;

        // Round start countdown
        if (this.roundStartTimer > 0) {
            this.roundStartTimer -= dtSec;
            if (this.roundStartTimer <= 0.5 && this.showRoundText.startsWith('ROUND')) {
                this.showRoundText = 'FIGHT!';
            }
            if (this.roundStartTimer <= 0) {
                this.showRoundText = '';
            }
            return;
        }

        // Round end delay
        if (this.roundOver) {
            this.roundEndTimer -= dtSec;
            if (this.roundEndTimer <= 0) {
                this.advanceRound();
            }
            return;
        }

        if (this.matchOver) return;

        // Round timer
        this.roundTimer -= dtSec;
        if (this.roundTimer <= 0) {
            this.roundTimer = 0;
            this.endRound();
            return;
        }

        // Screen shake decay
        this.screenShake *= 0.9;

        // Update fighters
        this.updatePlayer(dtSec, timestamp);
        this.updateOpponent(dtSec, timestamp);

        // Collision between fighters (push apart)
        this.resolveFighterCollision();

        // Attack hit detection
        this.checkAttackHits(this.player, this.opponent);
        this.checkAttackHits(this.opponent, this.player);

        // Check round end conditions
        if (this.player.health <= 0 || this.opponent.health <= 0) {
            this.endRound();
        }

        // Update particles
        this.updateParticles(dtSec);
        this.updateHitSparks(dtSec);

        // Combo timer
        if (this.comboTimer > 0) {
            this.comboTimer -= dtSec;
            if (this.comboTimer <= 0) this.comboCounter = 0;
        }

        // Glitch fighter (stage 4)
        if (this.hauntStage >= 4) {
            this.updateGlitchFighter(dtSec, timestamp);
        }

        // Possession flashes
        for (const flash of this.possessionFlashes) {
            flash.life -= dtSec;
        }
        this.possessionFlashes = this.possessionFlashes.filter(f => f.life > 0);

        // Blood particles
        for (const bp of this.bloodParticles) {
            bp.x += bp.vx;
            bp.y += bp.vy;
            bp.vy += 0.3;
            bp.life -= dtSec;
        }
        this.bloodParticles = this.bloodParticles.filter(bp => bp.life > 0);
    }

    updatePlayer(dtSec, timestamp) {
        const f = this.player;
        f.animTimer += dtSec;
        f.stateTimer += dtSec;

        if (f.invincible > 0) f.invincible -= dtSec;
        if (f.specialCooldown > 0) f.specialCooldown -= dtSec;
        f.specialCharge = Math.min(100, f.specialCharge + dtSec * 10);

        // Handle hitstun
        if (f.hitstunTimer > 0) {
            f.hitstunTimer -= dtSec;
            f.state = 'hitstun';
            f.x += f.vx * 0.5;
            f.vx *= 0.9;
            if (f.hitstunTimer <= 0) f.state = 'idle';
            this.applyGravity(f, dtSec);
            return;
        }

        // Handle knockdown
        if (f.knockdownTimer > 0) {
            f.knockdownTimer -= dtSec;
            f.state = 'knockdown';
            f.x += f.vx;
            f.vx *= 0.85;
            this.applyGravity(f, dtSec);
            if (f.knockdownTimer <= 0) {
                f.state = 'idle';
                f.invincible = 0.5;
            }
            return;
        }

        // Attack state
        if (f.state === 'attacking') {
            f.attackFrame++;
            const atk = ATTACKS[f.attackType];
            const totalFrames = atk.startup + atk.active + atk.recovery;
            if (f.attackFrame >= totalFrames) {
                f.state = 'idle';
                f.attackType = null;
            }
            this.applyGravity(f, dtSec);
            return;
        }

        // --- Input ---
        const dpad = input.getDPad();

        // Facing opponent
        f.facing = f.x < this.opponent.x ? 1 : -1;

        // Block (hold back)
        const holdingBack = (f.facing === 1 && dpad.x < 0) || (f.facing === -1 && dpad.x > 0);
        f.crouching = dpad.y > 0;

        if (holdingBack && f.onGround) {
            f.state = 'blocking';
            f.blockTimer = 0.2;
        } else if (f.blockTimer > 0) {
            f.blockTimer -= dtSec;
            if (f.blockTimer <= 0) f.state = 'idle';
        }

        // Movement
        if (f.state !== 'blocking' && f.state !== 'attacking') {
            if (dpad.x !== 0) {
                f.x += dpad.x * MOVE_SPEED;
                f.state = 'walking';
            } else {
                f.state = f.onGround ? 'idle' : 'jumping';
            }

            // Jump
            if (input.isJustPressed(BUTTONS.UP) && f.onGround) {
                f.vy = JUMP_FORCE;
                f.onGround = false;
                f.state = 'jumping';
                sfx.play('jump');
            }

            // Attacks
            if (input.isJustPressed(BUTTONS.A)) {
                this.startAttack(f, 'punch');
            } else if (input.isJustPressed(BUTTONS.B)) {
                this.startAttack(f, 'kick');
            } else if (input.isJustPressed(BUTTONS.X) && f.specialCharge >= 50) {
                this.startAttack(f, 'special');
                f.specialCharge = 0;
                f.specialCooldown = 1.5;
            }

            // Haunting: log inputs for AI to read at stage 2+
            if (this.inputReadEnabled) {
                if (input.isJustPressed(BUTTONS.A)) this.aiPredictedMove = 'punch';
                else if (input.isJustPressed(BUTTONS.B)) this.aiPredictedMove = 'kick';
                else if (input.isJustPressed(BUTTONS.X)) this.aiPredictedMove = 'special';
                else if (input.isJustPressed(BUTTONS.UP)) this.aiPredictedMove = 'jump';
            }
        }

        // Gravity
        this.applyGravity(f, dtSec);

        // Arena bounds
        f.x = Math.max(ARENA_LEFT, Math.min(ARENA_RIGHT - f.width, f.x));
    }

    updateOpponent(dtSec, timestamp) {
        const f = this.opponent;
        const p = this.player;
        f.animTimer += dtSec;
        f.stateTimer += dtSec;

        if (f.invincible > 0) f.invincible -= dtSec;
        if (f.specialCooldown > 0) f.specialCooldown -= dtSec;
        f.specialCharge = Math.min(100, f.specialCharge + dtSec * 10);

        // Handle hitstun
        if (f.hitstunTimer > 0) {
            f.hitstunTimer -= dtSec;
            f.state = 'hitstun';
            f.x += f.vx * 0.5;
            f.vx *= 0.9;
            if (f.hitstunTimer <= 0) f.state = 'idle';
            this.applyGravity(f, dtSec);
            return;
        }

        // Handle knockdown
        if (f.knockdownTimer > 0) {
            f.knockdownTimer -= dtSec;
            f.state = 'knockdown';
            f.x += f.vx;
            f.vx *= 0.85;
            this.applyGravity(f, dtSec);
            if (f.knockdownTimer <= 0) {
                f.state = 'idle';
                f.invincible = 0.5;
            }
            return;
        }

        // Attack state
        if (f.state === 'attacking') {
            f.attackFrame++;
            const atk = ATTACKS[f.attackType];
            const totalFrames = atk.startup + atk.active + atk.recovery;
            if (f.attackFrame >= totalFrames) {
                f.state = 'idle';
                f.attackType = null;
            }
            this.applyGravity(f, dtSec);
            return;
        }

        // --- AI Logic ---
        f.facing = f.x < p.x ? 1 : -1;
        f.aiTimer += dtSec;

        const dist = Math.abs(f.x - p.x);
        const aiReact = this.inputReadEnabled ? 0.05 : f.aiReactionTime;

        if (f.aiTimer < aiReact) {
            this.applyGravity(f, dtSec);
            f.x = Math.max(ARENA_LEFT, Math.min(ARENA_RIGHT - f.width, f.x));
            return;
        }

        f.aiTimer = 0;

        // AI reads player inputs at haunt stage 2+
        if (this.inputReadEnabled && this.aiPredictedMove) {
            const predicted = this.aiPredictedMove;
            this.aiPredictedMove = null;

            if (predicted === 'punch' || predicted === 'kick') {
                f.state = 'blocking';
                f.blockTimer = 0.3;
                return;
            } else if (predicted === 'special') {
                if (f.onGround) {
                    f.vy = JUMP_FORCE;
                    f.onGround = false;
                    f.state = 'jumping';
                }
                return;
            }
        }

        // Normal AI behavior
        if (dist > 80) {
            f.x += f.facing * MOVE_SPEED * 0.8;
            f.state = 'walking';
        } else if (dist < 40) {
            if (Math.random() < 0.4) {
                f.x -= f.facing * MOVE_SPEED * 0.5;
            }
        }

        // Attack decision
        if (dist < 80 && f.state !== 'attacking') {
            const attackChance = 0.15 + (this.hauntStage >= 2 ? 0.1 : 0);
            if (Math.random() < attackChance) {
                const roll = Math.random();
                if (roll < 0.4) {
                    this.startAttack(f, 'punch');
                } else if (roll < 0.75) {
                    this.startAttack(f, 'kick');
                } else if (f.specialCharge >= 50) {
                    this.startAttack(f, 'special');
                    f.specialCharge = 0;
                    f.specialCooldown = 2.0;
                }
            }
        }

        // Random jump
        if (f.onGround && Math.random() < 0.02) {
            f.vy = JUMP_FORCE;
            f.onGround = false;
            f.state = 'jumping';
        }

        // Blocking when player attacks
        if (p.state === 'attacking' && dist < 100 && f.state !== 'attacking') {
            if (Math.random() < 0.35 + (this.inputReadEnabled ? 0.3 : 0)) {
                f.state = 'blocking';
                f.blockTimer = 0.4;
            }
        }

        this.applyGravity(f, dtSec);
        f.x = Math.max(ARENA_LEFT, Math.min(ARENA_RIGHT - f.width, f.x));
    }

    startAttack(fighter, type) {
        fighter.state = 'attacking';
        fighter.attackType = type;
        fighter.attackFrame = 0;
        fighter.stateTimer = 0;

        if (type === 'punch') sfx.play('punch');
        else if (type === 'kick') sfx.play('punch');
        else if (type === 'special') sfx.play('shoot');
    }

    checkAttackHits(attacker, defender) {
        if (attacker.state !== 'attacking' || !attacker.attackType) return;

        const atk = ATTACKS[attacker.attackType];
        const frame = attacker.attackFrame;

        if (frame < atk.startup || frame >= atk.startup + atk.active) return;
        if (frame !== atk.startup) return;

        const hitX = attacker.x + (attacker.facing > 0 ? attacker.width : -atk.range);
        const hitY = attacker.y - attacker.height * 0.5;
        const hitW = atk.range;
        const hitH = attacker.height * 0.6;

        const defX = defender.x;
        const defY = defender.y - defender.height;
        const defW = defender.width;
        const defH = defender.height;

        if (hitX < defX + defW && hitX + hitW > defX &&
            hitY < defY + defH && hitY + hitH > defY) {

            if (defender.state === 'blocking') {
                defender.vx = -defender.facing * PUSH_BACK * 0.5;
                sfx.play('block');
                this.spawnHitSpark(defender.x + defender.facing * 10, defender.y - defender.height * 0.5, '#88aaff');
                if (this.hauntStage >= 3) {
                    defender.health -= Math.floor(atk.damage * 0.15);
                }
                return;
            }

            let damage = atk.damage;
            if (this.healthBarsLie && defender === this.player) {
                damage = Math.floor(damage * 1.3);
            }

            defender.health = Math.max(0, defender.health - damage);
            defender.hitstunTimer = atk.hitstun / 60;
            defender.vx = -defender.facing * PUSH_BACK;
            if (atk.type === 'mid') {
                defender.vy = -4;
            }

            if (attacker.attackType === 'special') {
                defender.knockdownTimer = 0.8;
                defender.vx = -defender.facing * PUSH_BACK * 2;
                defender.vy = -6;
            }

            sfx.play('hit');
            this.screenShake = 5;
            this.comboCounter++;
            this.comboTimer = 0.8;
            this.addScore(damage * 10);

            const sparkX = (attacker.x + defender.x) / 2;
            const sparkY = defender.y - defender.height * 0.5;
            this.spawnHitSpark(sparkX, sparkY, '#ffcc00');

            if (this.hauntStage >= 2) {
                for (let i = 0; i < 5; i++) {
                    this.bloodParticles.push({
                        x: sparkX,
                        y: sparkY,
                        vx: (Math.random() - 0.5) * 6 * -defender.facing,
                        vy: (Math.random() - 1) * 4,
                        life: 0.5 + Math.random() * 0.5,
                        size: 2 + Math.random() * 2
                    });
                }
            }

            if (this.hauntStage >= 3 && Math.random() < 0.2) {
                this.possessionFlashes.push({
                    x: sparkX,
                    y: sparkY,
                    life: 0.3,
                    text: ['SUFFER', 'PAIN', 'MORE', 'YES'][Math.floor(Math.random() * 4)]
                });
            }
        }
    }

    applyGravity(fighter, dtSec) {
        if (!fighter.onGround) {
            fighter.vy += GRAVITY;
            fighter.y += fighter.vy;

            if (fighter.y >= GROUND_Y) {
                fighter.y = GROUND_Y;
                fighter.vy = 0;
                fighter.onGround = true;
                if (fighter.state === 'jumping') fighter.state = 'idle';
            }
        }
    }

    resolveFighterCollision() {
        const p = this.player;
        const o = this.opponent;
        const overlap = (p.width + o.width) * 0.35 - Math.abs(p.x - o.x);

        if (overlap > 0) {
            const push = overlap * 0.5;
            if (p.x < o.x) {
                p.x -= push;
                o.x += push;
            } else {
                p.x += push;
                o.x -= push;
            }
        }
    }

    endRound() {
        this.roundOver = true;
        this.roundEndTimer = 2.5;

        if (this.player.health > this.opponent.health) {
            this.playerWins++;
            this.showRoundText = 'YOU WIN';
            this.addScore(1000);
        } else {
            this.opponentWins++;
            this.showRoundText = this.hauntStage >= 3 ? 'YOU WERE ALWAYS GOING TO LOSE' : 'YOU LOSE';
        }

        if (this.playerWins >= WIN_ROUNDS || this.opponentWins >= WIN_ROUNDS) {
            this.matchOver = true;
            if (this.opponentWins >= WIN_ROUNDS) {
                this.gameOver = true;
            }
        }
    }

    advanceRound() {
        if (this.matchOver) return;
        this.round++;
        this.resetRound();
    }

    spawnHitSpark(x, y, color) {
        for (let i = 0; i < 8; i++) {
            this.hitSparks.push({
                x, y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 0.2 + Math.random() * 0.15,
                color,
                size: 2 + Math.random() * 4
            });
        }
    }

    updateHitSparks(dtSec) {
        for (const s of this.hitSparks) {
            s.x += s.vx;
            s.y += s.vy;
            s.life -= dtSec;
        }
        this.hitSparks = this.hitSparks.filter(s => s.life > 0);
    }

    updateParticles(dtSec) {
        for (const p of this.particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2;
            p.life -= dtSec;
        }
        this.particles = this.particles.filter(p => p.life > 0);
    }

    updateGlitchFighter(dtSec, timestamp) {
        if (this.glitchFighter) {
            const gf = this.glitchFighter;
            gf.timer += dtSec;
            gf.alpha = 0.3 + Math.sin(gf.timer * 8) * 0.2;

            if (Math.random() < 0.02) {
                gf.x = ARENA_LEFT + Math.random() * (ARENA_RIGHT - ARENA_LEFT - 40);
                gf.y = GROUND_Y - Math.random() * 40;
                sfx.play('glitch');
            }

            const dist = Math.abs(gf.x - this.player.x);
            if (dist < 50 && Math.random() < 0.01 && this.player.invincible <= 0) {
                this.player.health = Math.max(0, this.player.health - 5);
                this.player.hitstunTimer = 0.2;
                this.player.vx = -this.player.facing * 3;
                this.screenShake = 8;
                sfx.play('scare');
                this.spawnHitSpark(gf.x, gf.y - 30, '#ff0066');
            }

            if (gf.timer > 8) {
                this.glitchFighter = null;
            }
        } else {
            this.glitchFighterTimer -= dtSec;
            if (this.glitchFighterTimer <= 0 && !this.roundOver) {
                this.glitchFighter = {
                    x: this.width / 2,
                    y: GROUND_Y,
                    alpha: 0.3,
                    timer: 0,
                    width: 34,
                    height: 60
                };
                sfx.play('scare');
                events.emit(EVENTS.HAUNT_GLITCH, { type: 'third_fighter', game: this.id });
                events.emit(EVENTS.NARRATIVE_FRAGMENT, {
                    id: 'sf-glitch',
                    text: 'PLAYER 3 HAS ENTERED THE GAME'
                });
            }
        }
    }

    // ==================== RENDERING ====================

    onRender(ctx, dt, timestamp) {
        ctx.save();

        if (this.screenShake > 0.5) {
            ctx.translate(
                (Math.random() - 0.5) * this.screenShake,
                (Math.random() - 0.5) * this.screenShake
            );
        }

        this.renderArena(ctx, timestamp);

        if (this.glitchFighter) {
            this.renderGlitchFighter(ctx, timestamp);
        }

        this.renderFighter(ctx, this.player, timestamp);
        this.renderFighter(ctx, this.opponent, timestamp);

        this.renderHitSparks(ctx);
        this.renderBloodParticles(ctx);
        this.renderPossessionFlashes(ctx);

        ctx.restore();

        this.renderHealthBars(ctx, timestamp);
        this.renderRoundInfo(ctx, timestamp);

        if (this.comboCounter > 1 && this.comboTimer > 0) {
            ctx.fillStyle = '#ffcc00';
            ctx.font = 'bold 18px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${this.comboCounter} HIT COMBO!`, this.width / 2, this.height - 30);
            ctx.textAlign = 'left';
        }

        this.renderHauntingOverlays(ctx, timestamp);
    }

    renderArena(ctx, timestamp) {
        const grad = ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, '#1a1030');
        grad.addColorStop(0.6, '#0a0818');
        grad.addColorStop(1, '#000000');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = '#2a2a3a';
        ctx.fillRect(0, GROUND_Y, this.width, this.height - GROUND_Y);

        // Floor pattern
        for (let x = 0; x < this.width; x += 32) {
            ctx.fillStyle = (x / 32) % 2 === 0 ? '#333344' : '#2a2a3a';
            ctx.fillRect(x, GROUND_Y, 32, 4);
        }

        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, GROUND_Y);
        ctx.lineTo(this.width, GROUND_Y);
        ctx.stroke();

        // Background pillars
        for (let i = 0; i < 6; i++) {
            const px = 40 + i * 90;
            ctx.fillStyle = '#1a1a2a';
            ctx.fillRect(px, 60, 20, GROUND_Y - 60);
            ctx.fillStyle = '#222233';
            ctx.fillRect(px - 5, 55, 30, 10);
        }

        // Crowd silhouettes
        for (let i = 0; i < 30; i++) {
            const cx = 10 + i * 17;
            const cy = 80 + Math.sin(i * 2 + this.crowdAnim * 3) * 3;
            ctx.fillStyle = '#111122';
            ctx.beginPath();
            ctx.arc(cx, cy, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(cx - 4, cy + 5, 8, 12);
        }

        // Corruption at stage 3+
        if (this.hauntStage >= 3) {
            const flicker = Math.sin(timestamp / 200) * 0.05;
            ctx.fillStyle = `rgba(100, 0, 30, ${flicker + 0.05})`;
            ctx.fillRect(0, 0, this.width, this.height);

            // Crowd faces turn identical
            for (let i = 0; i < 30; i++) {
                if (Math.random() < 0.08) {
                    const cx = 10 + i * 17;
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                    ctx.beginPath();
                    ctx.arc(cx, 80, 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#000';
                    ctx.fillRect(cx - 3, 78, 2, 2);
                    ctx.fillRect(cx + 1, 78, 2, 2);
                }
            }
        }
    }

    renderFighter(ctx, fighter, timestamp) {
        const f = fighter;
        const x = f.x;
        const y = f.y;
        const facing = f.facing;
        const h = f.height;
        const w = f.width;

        if (f.invincible > 0 && Math.sin(timestamp / 50) > 0) return;

        ctx.save();

        if (f.hitstunTimer > 0) {
            ctx.globalAlpha = 0.7 + Math.sin(timestamp / 30) * 0.3;
        }

        if (f.state === 'knockdown') {
            ctx.translate(x + w / 2, y);
            ctx.rotate(facing * Math.PI * 0.3);
            ctx.translate(-(x + w / 2), -y);
        }

        const bodyY = y - h;
        const crouch = f.crouching ? 10 : 0;
        const bobY = f.state === 'idle' ? Math.sin(f.animTimer * 3) * 2 : 0;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(x + w / 2, GROUND_Y, 20, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Legs
        ctx.fillStyle = f.color === '#3366ff' ? '#1a2266' : '#661a1a';
        const legAnim = f.state === 'walking' ? Math.sin(f.animTimer * 10) * 6 : 0;
        ctx.fillRect(x + 4, y - 22 + crouch, 10, 22 - crouch);
        ctx.fillRect(x + w - 14, y - 22 + crouch + legAnim * 0.5, 10, 22 - crouch);

        // Body
        ctx.fillStyle = f.color;
        ctx.fillRect(x + 2, bodyY + 12 + crouch + bobY, w - 4, 28 - crouch);

        // Head
        ctx.fillStyle = '#DDAA77';
        ctx.fillRect(x + 8, bodyY + crouch + bobY, 20, 16);

        // Headband
        ctx.fillStyle = f.color;
        ctx.fillRect(x + 6, bodyY + 2 + crouch + bobY, 24, 5);
        // Headband tail
        if (facing > 0) {
            ctx.fillRect(x - 6, bodyY + 2 + crouch + bobY, 12, 3);
        } else {
            ctx.fillRect(x + w, bodyY + 2 + crouch + bobY, 12, 3);
        }

        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(x + 12 + facing * 2, bodyY + 7 + crouch + bobY, 3, 3);
        ctx.fillRect(x + 20 + facing * 2, bodyY + 7 + crouch + bobY, 3, 3);

        // Arms and attacks
        const armColor = '#DDAA77';
        ctx.fillStyle = armColor;

        if (f.state === 'attacking') {
            const atk = ATTACKS[f.attackType];
            const progress = f.attackFrame / (atk.startup + atk.active + atk.recovery);

            if (f.attackType === 'punch') {
                const extend = Math.sin(progress * Math.PI) * 30;
                ctx.fillRect(x + w / 2 + facing * extend, bodyY + 18 + crouch + bobY, 12, 8);
                ctx.fillStyle = f.color;
                ctx.fillRect(x + w / 2 + facing * (extend + 8), bodyY + 16 + crouch + bobY, 10, 12);
            } else if (f.attackType === 'kick') {
                const extend = Math.sin(progress * Math.PI) * 35;
                ctx.fillStyle = f.color === '#3366ff' ? '#1a2266' : '#661a1a';
                ctx.fillRect(x + w / 2 + facing * extend, y - 15, 14, 8);
            } else if (f.attackType === 'special') {
                const extend = Math.sin(progress * Math.PI) * 50;
                ctx.fillStyle = '#ffff00';
                ctx.globalAlpha = 0.8;
                ctx.beginPath();
                ctx.arc(x + w / 2 + facing * extend, bodyY + 24 + crouch + bobY, 8 + progress * 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(x + w / 2 + facing * extend, bodyY + 24 + crouch + bobY, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        } else {
            const armBob = Math.sin(f.animTimer * 3) * 2;
            ctx.fillRect(x - 6, bodyY + 16 + crouch + bobY + armBob, 10, 20);
            ctx.fillRect(x + w - 4, bodyY + 16 + crouch + bobY - armBob, 10, 20);
        }

        // Blocking aura
        if (f.state === 'blocking') {
            ctx.fillStyle = 'rgba(100, 150, 255, 0.25)';
            ctx.beginPath();
            ctx.arc(x + w / 2, y - h / 2, h * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    renderGlitchFighter(ctx, timestamp) {
        const gf = this.glitchFighter;
        if (!gf) return;

        ctx.globalAlpha = gf.alpha;

        const hue = (timestamp / 10) % 360;
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;

        const x = gf.x + Math.sin(gf.timer * 20) * 3;
        const y = gf.y;
        const h = gf.height;

        if (Math.sin(timestamp / 200) > 0) {
            ctx.fillRect(x, y - h, gf.width, h);
        } else {
            ctx.beginPath();
            ctx.arc(x + gf.width / 2, y - h / 2, 30, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = '#000';
        ctx.fillRect(x + 8, y - h + 15, 5, 5);
        ctx.fillRect(x + gf.width - 13, y - h + 15, 5, 5);

        // Trail
        ctx.fillStyle = `rgba(255, 0, 100, ${gf.alpha * 0.3})`;
        ctx.fillRect(x - 10, y - h, gf.width + 20, h);

        ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${gf.alpha})`;
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PLAYER 3', x + gf.width / 2, y - h - 8);
        ctx.textAlign = 'left';

        ctx.globalAlpha = 1;
    }

    renderHitSparks(ctx) {
        for (const s of this.hitSparks) {
            ctx.globalAlpha = Math.max(0, s.life * 5);
            ctx.fillStyle = s.color;
            ctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
        }
        ctx.globalAlpha = 1;
    }

    renderBloodParticles(ctx) {
        if (this.hauntStage < 2) return;
        for (const bp of this.bloodParticles) {
            ctx.globalAlpha = Math.max(0, bp.life);
            ctx.fillStyle = '#880000';
            ctx.fillRect(bp.x, bp.y, bp.size, bp.size);
        }
        ctx.globalAlpha = 1;
    }

    renderPossessionFlashes(ctx) {
        for (const flash of this.possessionFlashes) {
            ctx.fillStyle = `rgba(255, 0, 80, ${flash.life * 2})`;
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(flash.text, flash.x, flash.y - 20);
        }
        ctx.textAlign = 'left';
    }

    renderHealthBars(ctx, timestamp) {
        const barY = 20;
        const barH = 16;
        const barW = 180;
        const gap = 20;
        const leftX = this.width / 2 - gap - barW;
        const rightX = this.width / 2 + gap;

        // Player health bar
        const playerHealthPct = this.player.health / MAX_HEALTH;
        let displayPlayerPct = playerHealthPct;

        if (this.healthBarsLie) {
            displayPlayerPct = Math.min(1, playerHealthPct + 0.15 + Math.sin(timestamp / 1000) * 0.05);
        }

        ctx.fillStyle = '#333';
        ctx.fillRect(leftX, barY, barW, barH);
        ctx.fillStyle = playerHealthPct > 0.3 ? '#33cc33' : '#cc3333';
        if (this.hauntStage >= 3 && Math.random() < 0.08) ctx.fillStyle = '#ff00ff';
        ctx.fillRect(leftX + barW * (1 - displayPlayerPct), barY, barW * displayPlayerPct, barH);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(leftX, barY, barW, barH);

        // Opponent health bar
        const oppHealthPct = this.opponent.health / MAX_HEALTH;
        ctx.fillStyle = '#333';
        ctx.fillRect(rightX, barY, barW, barH);
        ctx.fillStyle = oppHealthPct > 0.3 ? '#33cc33' : '#cc3333';
        if (this.hauntStage >= 3 && Math.random() < 0.08) ctx.fillStyle = '#ff00ff';
        ctx.fillRect(rightX, barY, barW * oppHealthPct, barH);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(rightX, barY, barW, barH);

        // Names
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(this.player.name, leftX, barY - 4);
        ctx.textAlign = 'right';
        const oppName = this.hauntStage >= 4 ? 'A\u0335L\u0336E\u0337X' : this.opponent.name;
        ctx.fillText(oppName, rightX + barW, barY - 4);

        // Timer
        ctx.textAlign = 'center';
        ctx.fillStyle = this.roundTimer < 10 ? '#ff4444' : '#ffcc00';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(Math.ceil(this.roundTimer).toString(), this.width / 2, barY + 14);

        // Win markers
        ctx.fillStyle = '#ffcc00';
        for (let i = 0; i < this.playerWins; i++) {
            ctx.beginPath();
            ctx.arc(leftX + barW - 10 - i * 16, barY + barH + 10, 5, 0, Math.PI * 2);
            ctx.fill();
        }
        for (let i = 0; i < this.opponentWins; i++) {
            ctx.beginPath();
            ctx.arc(rightX + 10 + i * 16, barY + barH + 10, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Special charge bar
        ctx.fillStyle = '#222';
        ctx.fillRect(leftX, barY + barH + 20, 80, 6);
        ctx.fillStyle = '#4488ff';
        ctx.fillRect(leftX, barY + barH + 20, 80 * (this.player.specialCharge / 100), 6);
        ctx.fillStyle = '#aaa';
        ctx.font = '8px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('SPECIAL', leftX, barY + barH + 18);

        ctx.textAlign = 'left';
    }

    renderRoundInfo(ctx, timestamp) {
        if (!this.showRoundText) return;

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 28px monospace';
        ctx.textAlign = 'center';

        const scale = this.roundStartTimer > 0 ? 1 + Math.sin(this.roundStartTimer * 10) * 0.1 : 1;
        ctx.save();
        ctx.translate(this.width / 2, this.height / 2);
        ctx.scale(scale, scale);
        ctx.fillText(this.showRoundText, 0, 0);
        ctx.restore();

        ctx.textAlign = 'left';
    }

    renderHauntingOverlays(ctx, timestamp) {
        // Input read warning at stage 2+
        if (this.inputReadEnabled && Math.random() < 0.002) {
            ctx.fillStyle = 'rgba(255, 0, 80, 0.3)';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('I CAN SEE YOUR INPUTS', this.width / 2, this.height - 60);
            ctx.textAlign = 'left';
        }

        // Health bar lie hint at stage 3+
        if (this.healthBarsLie && Math.random() < 0.001) {
            ctx.fillStyle = 'rgba(255, 0, 80, 0.4)';
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('YOUR HEALTH BAR LIES', this.width / 2, 65);
            ctx.textAlign = 'left';
        }

        // Stage 4: screen corruption
        if (this.hauntStage >= 4 && Math.random() < 0.02) {
            const glitchY = Math.random() * this.height;
            const glitchH = 2 + Math.random() * 4;
            const shift = (Math.random() - 0.5) * 20;
            ctx.drawImage(ctx.canvas, shift, glitchY, this.width, glitchH, 0, glitchY, this.width, glitchH);
        }

        // Narrative fragment
        if (this.hauntStage >= 2 && this.round >= 2 && Math.random() < 0.0004) {
            events.emit(EVENTS.NARRATIVE_FRAGMENT, {
                text: 'THE OPPONENT KNOWS WHAT YOU WILL DO BEFORE YOU DO IT',
                game: this.id
            });
        }
    }
}

export default PossessedStreetFighter;
