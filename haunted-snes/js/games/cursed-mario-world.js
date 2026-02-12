// cursed-mario-world.js — Side-scrolling platformer with haunting corruption
// A Mario-like platformer that progressively degrades as the haunting intensifies

import { GameBase } from './game-base.js';
import { input, BUTTONS } from '../core/input.js';
import { sfx } from '../audio/sfx.js';
import state from '../core/state.js';
import { events, EVENTS } from '../core/events.js';

// Tile size for the world grid
const TILE = 32;
const GRAVITY = 0.55;
const MAX_FALL_SPEED = 12;
const JUMP_FORCE = -10.5;
const RUN_SPEED = 3.2;
const SPRINT_SPEED = 5.0;
const FRICTION = 0.85;
const COIN_SIZE = 12;
const ENEMY_SPEED = 1.2;

// Procedural generation parameters
const CHUNK_WIDTH = 20;    // tiles per chunk
const CHUNK_HEIGHT = 14;   // tiles in height

export class CursedMarioWorld extends GameBase {
    constructor() {
        super({
            id: 'mario-world',
            name: 'CURSED MARIO WORLD',
            channel: 3,
            titleColor: '#ff4444',
            bgColor: '#000020',
            titleText: 'CURSED MARIO WORLD'
        });

        // Player
        this.player = null;

        // World
        this.camera = { x: 0, y: 0 };
        this.platforms = [];
        this.coins = [];
        this.enemies = [];
        this.particles = [];
        this.chunks = [];
        this.lastChunkX = 0;
        this.worldHeight = CHUNK_HEIGHT * TILE;

        // Parallax layers
        this.bgLayers = [];

        // Haunting specifics
        this.playerName = 'MARIO';
        this.ghostEnemies = [];
        this.playerPatternLog = [];
        this.patternLogMax = 120;
        this.spriteCorruption = 0;
        this.nameGlitchTimer = 0;
        this.alexRevealed = false;
        this.deathFlashTimer = 0;
        this.distortionTimer = 0;
    }

    onInit() {
        this.resetWorld();
    }

    onStart() {
        this.resetWorld();
    }

    onStop() {
        this.clearTimers();
    }

    onRestart() {
        this.resetWorld();
    }

    onDeath() {
        this.deathFlashTimer = 0.5;
        this.respawnPlayer();
    }

    onTitleDismiss() {
        sfx.play('confirm');
    }

    resetWorld() {
        this.player = {
            x: 80,
            y: this.worldHeight - TILE * 3,
            vx: 0,
            vy: 0,
            width: 20,
            height: 28,
            onGround: false,
            facing: 1,
            animFrame: 0,
            animTimer: 0,
            invincible: 0,
            dead: false
        };

        this.camera = { x: 0, y: 0 };
        this.platforms = [];
        this.coins = [];
        this.enemies = [];
        this.particles = [];
        this.ghostEnemies = [];
        this.chunks = [];
        this.lastChunkX = -1;
        this.spriteCorruption = 0;
        this.playerPatternLog = [];
        this.nameGlitchTimer = 0;
        this.alexRevealed = false;
        this.deathFlashTimer = 0;
        this.distortionTimer = 0;
        this.score = 0;
        this.lives = 3;

        // Build parallax background layers
        this.bgLayers = [
            { speed: 0.05, color: '#0a0a2e', y: 0, h: this.height },
            { speed: 0.1, color: '#141450', y: 0, h: this.height * 0.5 },
            { speed: 0.25, color: '#1e2e5a', y: this.height * 0.25, h: this.height * 0.35 },
            { speed: 0.4, color: '#2a4a3a', y: this.height * 0.45, h: this.height * 0.2 },
        ];

        // Generate initial chunks
        for (let i = 0; i < 6; i++) {
            this.generateChunk(i);
        }
    }

    respawnPlayer() {
        this.player.x = this.camera.x + 80;
        this.player.y = this.worldHeight - TILE * 4;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.dead = false;
        this.player.invincible = 2.0;
    }

    // Procedural chunk generation
    generateChunk(chunkIndex) {
        if (this.chunks.includes(chunkIndex)) return;
        this.chunks.push(chunkIndex);

        const startX = chunkIndex * CHUNK_WIDTH * TILE;
        const seed = chunkIndex * 7919 + 42;

        // Ground layer
        for (let tx = 0; tx < CHUNK_WIDTH; tx++) {
            const worldTx = chunkIndex * CHUNK_WIDTH + tx;
            // Create gaps occasionally (not in the first chunk)
            const gapRng = this.seededRandom(seed + tx * 31);
            if (chunkIndex > 0 && gapRng < 0.12 && tx > 2 && tx < CHUNK_WIDTH - 2) {
                continue; // gap in ground
            }

            this.platforms.push({
                x: startX + tx * TILE,
                y: this.worldHeight - TILE,
                w: TILE,
                h: TILE,
                type: 'ground'
            });
            // Sub-ground fill
            this.platforms.push({
                x: startX + tx * TILE,
                y: this.worldHeight,
                w: TILE,
                h: TILE,
                type: 'ground'
            });
        }

        // Floating platforms
        const numPlatforms = 2 + Math.floor(this.seededRandom(seed + 100) * 4);
        for (let p = 0; p < numPlatforms; p++) {
            const px = startX + 40 + this.seededRandom(seed + p * 53) * (CHUNK_WIDTH - 4) * TILE;
            const py = this.worldHeight - TILE * 3 - this.seededRandom(seed + p * 71) * TILE * 4;
            const pw = TILE * (2 + Math.floor(this.seededRandom(seed + p * 97) * 3));

            this.platforms.push({
                x: px,
                y: py,
                w: pw,
                h: TILE * 0.6,
                type: 'brick'
            });
        }

        // Question blocks with coins
        const numQBlocks = 1 + Math.floor(this.seededRandom(seed + 200) * 3);
        for (let q = 0; q < numQBlocks; q++) {
            const qx = startX + 60 + this.seededRandom(seed + q * 113) * (CHUNK_WIDTH - 4) * TILE;
            const qy = this.worldHeight - TILE * 4 - this.seededRandom(seed + q * 137) * TILE * 2;

            this.platforms.push({
                x: qx,
                y: qy,
                w: TILE,
                h: TILE,
                type: 'question',
                hit: false
            });
        }

        // Coins
        const numCoins = 3 + Math.floor(this.seededRandom(seed + 300) * 5);
        for (let c = 0; c < numCoins; c++) {
            this.coins.push({
                x: startX + 30 + this.seededRandom(seed + c * 151) * (CHUNK_WIDTH - 2) * TILE,
                y: this.worldHeight - TILE * 2 - this.seededRandom(seed + c * 173) * TILE * 5,
                collected: false,
                animTimer: this.seededRandom(seed + c * 191) * Math.PI * 2
            });
        }

        // Enemies (goombas)
        if (chunkIndex > 0) {
            const numEnemies = 1 + Math.floor(this.seededRandom(seed + 400) * 3);
            for (let e = 0; e < numEnemies; e++) {
                const ex = startX + 80 + this.seededRandom(seed + e * 211) * (CHUNK_WIDTH - 4) * TILE;
                this.enemies.push({
                    x: ex,
                    y: this.worldHeight - TILE - 20,
                    vx: ENEMY_SPEED * (this.seededRandom(seed + e * 233) < 0.5 ? 1 : -1),
                    width: 20,
                    height: 20,
                    type: 'goomba',
                    alive: true,
                    squishTimer: 0,
                    patrolLeft: ex - 60,
                    patrolRight: ex + 60,
                    animTimer: 0
                });
            }
        }

        this.lastChunkX = chunkIndex;
    }

    seededRandom(seed) {
        const x = Math.sin(seed) * 43758.5453123;
        return x - Math.floor(x);
    }

    onUpdate(dt, timestamp) {
        const dtSec = dt / 1000;

        this.updateTimers(dt);
        this.deathFlashTimer = Math.max(0, this.deathFlashTimer - dtSec);
        this.distortionTimer += dtSec;

        if (this.player.dead) return;

        // Decrease invincibility
        if (this.player.invincible > 0) {
            this.player.invincible -= dtSec;
        }

        // --- Input ---
        const dpad = input.getDPad();
        const holdingB = input.isPressed(BUTTONS.B);
        const speed = holdingB ? SPRINT_SPEED : RUN_SPEED;

        // Horizontal movement
        if (dpad.x !== 0) {
            this.player.vx += dpad.x * speed * 0.3;
            this.player.facing = dpad.x;
        }
        this.player.vx *= FRICTION;

        // Clamp horizontal speed
        const maxSpd = holdingB ? SPRINT_SPEED : RUN_SPEED;
        this.player.vx = Math.max(-maxSpd, Math.min(maxSpd, this.player.vx));

        // Jump
        if (input.isJustPressed(BUTTONS.A) && this.player.onGround) {
            this.player.vy = JUMP_FORCE;
            this.player.onGround = false;
            sfx.play('jump');
        }

        // Variable jump height - release A to cut jump short
        if (input.isJustReleased(BUTTONS.A) && this.player.vy < -3) {
            this.player.vy *= 0.5;
        }

        // Log player pattern for ghost AI
        if (this.hauntStage >= 3) {
            this.playerPatternLog.push({
                x: dpad.x,
                jump: input.isJustPressed(BUTTONS.A),
                y: this.player.y,
                time: timestamp
            });
            if (this.playerPatternLog.length > this.patternLogMax) {
                this.playerPatternLog.shift();
            }
        }

        // --- Physics ---
        // Gravity
        this.player.vy += GRAVITY;
        if (this.player.vy > MAX_FALL_SPEED) this.player.vy = MAX_FALL_SPEED;

        // Move horizontally first
        this.player.x += this.player.vx;
        this.resolveCollisionsX();

        // Move vertically
        this.player.y += this.player.vy;
        this.player.onGround = false;
        this.resolveCollisionsY();

        // Fell off screen
        if (this.player.y > this.worldHeight + 100) {
            this.player.dead = true;
            sfx.play('death');
            this.die();
            return;
        }

        // Animation
        this.player.animTimer += dtSec;
        if (Math.abs(this.player.vx) > 0.5) {
            if (this.player.animTimer > 0.1) {
                this.player.animFrame = (this.player.animFrame + 1) % 4;
                this.player.animTimer = 0;
            }
        } else {
            this.player.animFrame = 0;
        }

        // --- Camera ---
        const targetCamX = this.player.x - this.width * 0.35;
        this.camera.x += (targetCamX - this.camera.x) * 0.08;
        if (this.camera.x < 0) this.camera.x = 0;

        this.camera.y = 0; // Fixed vertical camera for simplicity

        // --- Generate new chunks ahead ---
        const cameraRightChunk = Math.floor((this.camera.x + this.width + TILE * 10) / (CHUNK_WIDTH * TILE));
        while (cameraRightChunk > this.lastChunkX) {
            this.generateChunk(this.lastChunkX + 1);
        }

        // --- Cleanup far-behind objects ---
        const cleanupX = this.camera.x - CHUNK_WIDTH * TILE;
        this.platforms = this.platforms.filter(p => p.x + p.w > cleanupX);
        this.coins = this.coins.filter(c => c.x > cleanupX);
        this.enemies = this.enemies.filter(e => e.x > cleanupX - 100);

        // --- Coin collection ---
        for (const coin of this.coins) {
            if (coin.collected) continue;
            coin.animTimer += dtSec * 3;
            if (this.rectOverlap(
                this.player.x, this.player.y, this.player.width, this.player.height,
                coin.x - COIN_SIZE / 2, coin.y - COIN_SIZE / 2, COIN_SIZE, COIN_SIZE
            )) {
                coin.collected = true;
                this.addScore(100);
                sfx.play('coin');
                this.spawnParticles(coin.x, coin.y, '#ffdd00', 5);
            }
        }

        // --- Question block hits ---
        for (const plat of this.platforms) {
            if (plat.type !== 'question' || plat.hit) continue;
            // Player hitting from below
            if (this.player.vy < 0 &&
                this.player.x + this.player.width > plat.x &&
                this.player.x < plat.x + plat.w &&
                this.player.y <= plat.y + plat.h &&
                this.player.y + this.player.height > plat.y + plat.h) {
                plat.hit = true;
                this.addScore(200);
                sfx.play('coin');
                this.spawnParticles(plat.x + plat.w / 2, plat.y, '#ffdd00', 8);
            }
        }

        // --- Enemies ---
        this.updateEnemies(dtSec, timestamp);

        // --- Ghost enemies (haunt stage 3+) ---
        if (this.hauntStage >= 3) {
            this.updateGhostEnemies(dtSec, timestamp);
        }

        // --- Particles ---
        this.updateParticles(dtSec);

        // --- Haunting updates ---
        this.updateHaunting(dtSec, timestamp);
    }

    resolveCollisionsX() {
        const p = this.player;
        for (const plat of this.platforms) {
            if (!this.rectOverlap(p.x, p.y, p.width, p.height, plat.x, plat.y, plat.w, plat.h)) continue;
            if (p.vx > 0) {
                p.x = plat.x - p.width;
            } else if (p.vx < 0) {
                p.x = plat.x + plat.w;
            }
            p.vx = 0;
        }
    }

    resolveCollisionsY() {
        const p = this.player;
        for (const plat of this.platforms) {
            if (!this.rectOverlap(p.x, p.y, p.width, p.height, plat.x, plat.y, plat.w, plat.h)) continue;
            if (p.vy > 0) {
                p.y = plat.y - p.height;
                p.vy = 0;
                p.onGround = true;
            } else if (p.vy < 0) {
                p.y = plat.y + plat.h;
                p.vy = 0;
            }
        }
    }

    rectOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
    }

    updateEnemies(dtSec, timestamp) {
        for (const enemy of this.enemies) {
            if (!enemy.alive) {
                enemy.squishTimer -= dtSec;
                continue;
            }

            enemy.animTimer += dtSec;

            // Patrol movement
            enemy.x += enemy.vx;
            if (enemy.x <= enemy.patrolLeft || enemy.x >= enemy.patrolRight) {
                enemy.vx *= -1;
            }

            // Check enemy-platform collisions (stay on platforms)
            let onPlatform = false;
            for (const plat of this.platforms) {
                if (enemy.x + enemy.width > plat.x && enemy.x < plat.x + plat.w &&
                    Math.abs((enemy.y + enemy.height) - plat.y) < 5) {
                    onPlatform = true;
                    break;
                }
            }
            if (!onPlatform) {
                // Simple: reverse if about to walk off edge
                enemy.vx *= -1;
            }

            // Player collision
            if (this.player.invincible <= 0 && !this.player.dead) {
                if (this.rectOverlap(
                    this.player.x, this.player.y, this.player.width, this.player.height,
                    enemy.x, enemy.y, enemy.width, enemy.height
                )) {
                    // Player stomps from above
                    if (this.player.vy > 0 && this.player.y + this.player.height - enemy.y < 12) {
                        enemy.alive = false;
                        enemy.squishTimer = 0.5;
                        this.player.vy = JUMP_FORCE * 0.6;
                        this.addScore(200);
                        sfx.play('hit');
                        this.spawnParticles(enemy.x + enemy.width / 2, enemy.y, '#884422', 6);
                    } else {
                        // Player takes damage
                        this.player.invincible = 2.0;
                        this.player.vx = (this.player.x < enemy.x ? -1 : 1) * 5;
                        this.player.vy = -6;
                        this.deathFlashTimer = 0.3;
                        sfx.play('damage');
                        this.die();
                    }
                }
            }
        }

        // Remove fully squished enemies
        this.enemies = this.enemies.filter(e => e.alive || e.squishTimer > 0);
    }

    updateGhostEnemies(dtSec, timestamp) {
        // Spawn ghost enemies that learn from player patterns
        if (this.ghostEnemies.length < 2 && Math.random() < 0.005) {
            const patternData = this.playerPatternLog.slice(-30);
            const avgJumpRate = patternData.filter(p => p.jump).length / Math.max(patternData.length, 1);

            this.ghostEnemies.push({
                x: this.player.x + this.width * 0.8,
                y: this.worldHeight - TILE - 24,
                vx: -2 - avgJumpRate * 3,
                vy: 0,
                width: 22,
                height: 24,
                alpha: 0.4 + this.corruptionLevel * 0.4,
                learnedJumpRate: avgJumpRate,
                jumpCooldown: 0,
                alive: true,
                flickerTimer: 0
            });
        }

        for (const ghost of this.ghostEnemies) {
            if (!ghost.alive) continue;

            ghost.flickerTimer += dtSec;

            // Move toward player with learned behavior
            const dx = this.player.x - ghost.x;
            ghost.vx += Math.sign(dx) * 0.15;
            ghost.vx *= 0.95;
            ghost.x += ghost.vx;

            // Ghost jumping based on learned player patterns
            ghost.jumpCooldown -= dtSec;
            if (ghost.jumpCooldown <= 0 && Math.random() < ghost.learnedJumpRate * 0.3) {
                ghost.vy = JUMP_FORCE * 0.8;
                ghost.jumpCooldown = 1.0;
            }

            ghost.vy += GRAVITY;
            ghost.y += ghost.vy;

            // Floor collision
            if (ghost.y > this.worldHeight - TILE - ghost.height) {
                ghost.y = this.worldHeight - TILE - ghost.height;
                ghost.vy = 0;
            }

            // Damage player on touch
            if (this.player.invincible <= 0 && !this.player.dead) {
                if (this.rectOverlap(
                    this.player.x, this.player.y, this.player.width, this.player.height,
                    ghost.x, ghost.y, ghost.width, ghost.height
                )) {
                    this.player.invincible = 2.0;
                    this.player.vy = -8;
                    this.player.vx = (this.player.x < ghost.x ? -1 : 1) * 6;
                    sfx.play('scare');
                    this.die();
                    ghost.alive = false;
                }
            }

            // Off screen cleanup
            if (Math.abs(ghost.x - this.player.x) > this.width) {
                ghost.alive = false;
            }
        }

        this.ghostEnemies = this.ghostEnemies.filter(g => g.alive);
    }

    updateHaunting(dtSec, timestamp) {
        // Sprite degradation at stage >= 2
        if (this.hauntStage >= 2) {
            this.spriteCorruption = Math.min(1, this.spriteCorruption + dtSec * 0.02);
        }

        // Name glitch at stage 4
        if (this.hauntStage >= 4) {
            this.nameGlitchTimer += dtSec;
            if (this.nameGlitchTimer > 3 && !this.alexRevealed) {
                this.alexRevealed = true;
                this.playerName = 'ALEX';
                events.emit(EVENTS.HAUNT_GLITCH, { type: 'name_replace', game: this.id });
                sfx.play('glitch');
            }
        }

        // Emit narrative fragments
        if (this.hauntStage >= 2 && this.score > 500 && Math.random() < 0.0005) {
            events.emit(EVENTS.NARRATIVE_FRAGMENT, {
                text: 'HE PLAYED THIS GAME BEFORE YOU',
                game: this.id
            });
        }
    }

    spawnParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 1) * 5,
                life: 0.5 + Math.random() * 0.3,
                color,
                size: 2 + Math.random() * 3
            });
        }
    }

    updateParticles(dtSec) {
        for (const p of this.particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += GRAVITY * 0.5;
            p.life -= dtSec;
        }
        this.particles = this.particles.filter(p => p.life > 0);
    }

    // ==================== RENDERING ====================

    onRender(ctx, dt, timestamp) {
        const camX = this.camera.x;
        const camY = this.camera.y;

        // --- Sky background ---
        this.renderBackground(ctx, timestamp);

        // --- Parallax layers ---
        this.renderParallax(ctx, camX, timestamp);

        ctx.save();
        ctx.translate(-camX, -camY);

        // --- Platforms ---
        this.renderPlatforms(ctx, camX, timestamp);

        // --- Coins ---
        this.renderCoins(ctx, camX, timestamp);

        // --- Enemies ---
        this.renderEnemies(ctx, timestamp);

        // --- Ghost enemies ---
        if (this.hauntStage >= 3) {
            this.renderGhostEnemies(ctx, timestamp);
        }

        // --- Player ---
        this.renderPlayer(ctx, timestamp);

        // --- Particles ---
        this.renderParticles(ctx);

        ctx.restore();

        // --- Death flash ---
        if (this.deathFlashTimer > 0) {
            ctx.fillStyle = `rgba(255,0,0,${this.deathFlashTimer * 0.5})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        // --- Haunting overlays ---
        this.renderHauntingOverlays(ctx, timestamp);
    }

    renderBackground(ctx, timestamp) {
        // Sky gradient
        const grad = ctx.createLinearGradient(0, 0, 0, this.height);
        if (this.hauntStage >= 3) {
            grad.addColorStop(0, '#1a0000');
            grad.addColorStop(1, '#0a0020');
        } else {
            grad.addColorStop(0, '#000030');
            grad.addColorStop(1, '#000818');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);

        // Stars
        const starSeed = 12345;
        for (let i = 0; i < 50; i++) {
            const sx = this.seededRandom(starSeed + i * 7) * this.width;
            const sy = this.seededRandom(starSeed + i * 13) * this.height * 0.5;
            const twinkle = Math.sin(timestamp / 800 + i) * 0.3 + 0.7;
            ctx.globalAlpha = twinkle;
            ctx.fillStyle = this.hauntStage >= 3 ? '#ff4444' : '#ffffff';
            ctx.fillRect(sx, sy, 1.5, 1.5);
        }
        ctx.globalAlpha = 1;
    }

    renderParallax(ctx, camX, timestamp) {
        for (let i = 0; i < this.bgLayers.length; i++) {
            const layer = this.bgLayers[i];
            let effectiveSpeed = layer.speed;

            // Corruption: parallax breaks at hauntStage >= 2
            if (this.hauntStage >= 2 && i < 3) {
                const corruptAmt = this.corruptionLevel * 0.5;
                if (i === 1 && Math.sin(timestamp / 2000) > 0.5) {
                    effectiveSpeed = -layer.speed * (1 + corruptAmt);
                }
                if (i === 2 && this.corruptionLevel > 0.3) {
                    effectiveSpeed = layer.speed * (2 + Math.sin(timestamp / 1000) * corruptAmt);
                }
            }

            const offset = camX * effectiveSpeed;
            const layerY = layer.y;

            ctx.fillStyle = layer.color;

            // Mountains / hills shapes
            ctx.beginPath();
            ctx.moveTo(0, layerY + layer.h);
            const numPeaks = 8;
            const peakSpacing = (this.width + 200) / numPeaks;
            for (let p = 0; p <= numPeaks; p++) {
                const px = p * peakSpacing - (offset % peakSpacing);
                const peakH = this.seededRandom(i * 1000 + p * 37) * layer.h * 0.6;
                const cpx = px + peakSpacing / 2;
                const cpy = layerY + layer.h - peakH;
                ctx.quadraticCurveTo(cpx, cpy, px + peakSpacing, layerY + layer.h);
            }
            ctx.lineTo(this.width + 100, this.height);
            ctx.lineTo(0, this.height);
            ctx.closePath();
            ctx.fill();
        }
    }

    renderPlatforms(ctx, camX, timestamp) {
        const viewLeft = camX - TILE;
        const viewRight = camX + this.width + TILE;

        for (const plat of this.platforms) {
            if (plat.x + plat.w < viewLeft || plat.x > viewRight) continue;

            switch (plat.type) {
                case 'ground':
                    this.drawGroundTile(ctx, plat, timestamp);
                    break;
                case 'brick':
                    this.drawBrickPlatform(ctx, plat, timestamp);
                    break;
                case 'question':
                    this.drawQuestionBlock(ctx, plat, timestamp);
                    break;
            }
        }
    }

    drawGroundTile(ctx, plat, timestamp) {
        // Brown ground with darker top edge
        ctx.fillStyle = '#8B5A2B';
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = '#6B3A1B';
        ctx.fillRect(plat.x, plat.y, plat.w, 3);

        // Corruption: ground tiles shift color
        if (this.hauntStage >= 3 && Math.random() < 0.02) {
            ctx.fillStyle = `rgba(${128 + Math.random() * 127}, 0, 0, 0.3)`;
            ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        }
    }

    drawBrickPlatform(ctx, plat, timestamp) {
        ctx.fillStyle = '#A0522D';
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);

        // Brick pattern
        ctx.strokeStyle = '#6B3A1B';
        ctx.lineWidth = 1;
        const brickW = 16;
        for (let bx = plat.x; bx < plat.x + plat.w; bx += brickW) {
            ctx.strokeRect(bx, plat.y, brickW, plat.h);
        }

        // Highlight top edge
        ctx.fillStyle = '#C07040';
        ctx.fillRect(plat.x, plat.y, plat.w, 2);
    }

    drawQuestionBlock(ctx, plat, timestamp) {
        if (plat.hit) {
            ctx.fillStyle = '#555';
            ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            return;
        }

        // Animated golden block
        const pulse = Math.sin(timestamp / 300) * 0.15 + 0.85;
        const r = Math.floor(220 * pulse);
        const g = Math.floor(180 * pulse);
        ctx.fillStyle = `rgb(${r},${g},30)`;
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);

        // Question mark
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        const qText = this.hauntStage >= 4 ? '!' : '?';
        ctx.fillText(qText, plat.x + plat.w / 2, plat.y + plat.h - 6);
        ctx.textAlign = 'left';

        // Border
        ctx.strokeStyle = '#AA8800';
        ctx.lineWidth = 2;
        ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
    }

    renderCoins(ctx, camX, timestamp) {
        const viewLeft = camX - 20;
        const viewRight = camX + this.width + 20;

        for (const coin of this.coins) {
            if (coin.collected) continue;
            if (coin.x < viewLeft || coin.x > viewRight) continue;

            // Spinning coin effect
            const scale = Math.abs(Math.cos(coin.animTimer));
            const cx = coin.x;
            const cy = coin.y;

            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.ellipse(cx, cy, COIN_SIZE / 2 * scale, COIN_SIZE / 2, 0, 0, Math.PI * 2);
            ctx.fill();

            // Shine
            ctx.fillStyle = '#FFF8DC';
            ctx.beginPath();
            ctx.ellipse(cx - 2 * scale, cy - 2, 2 * scale, 2, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderEnemies(ctx, timestamp) {
        for (const enemy of this.enemies) {
            if (!enemy.alive) {
                if (enemy.squishTimer > 0) {
                    // Squished goomba
                    ctx.fillStyle = '#884422';
                    ctx.fillRect(enemy.x, enemy.y + enemy.height - 6, enemy.width, 6);
                }
                continue;
            }

            // Goomba body
            const bobY = Math.sin(enemy.animTimer * 6) * 1.5;
            ctx.fillStyle = '#884422';
            ctx.fillRect(enemy.x, enemy.y + bobY, enemy.width, enemy.height);

            // Feet
            const walkCycle = Math.sin(enemy.animTimer * 8);
            ctx.fillStyle = '#553311';
            ctx.fillRect(enemy.x + 2 + walkCycle * 2, enemy.y + enemy.height - 4 + bobY, 6, 4);
            ctx.fillRect(enemy.x + enemy.width - 8 - walkCycle * 2, enemy.y + enemy.height - 4 + bobY, 6, 4);

            // Eyes
            ctx.fillStyle = '#fff';
            ctx.fillRect(enemy.x + 4, enemy.y + 4 + bobY, 5, 5);
            ctx.fillRect(enemy.x + 11, enemy.y + 4 + bobY, 5, 5);

            // Pupils (look toward player)
            const lookDir = Math.sign(this.player.x - enemy.x);
            ctx.fillStyle = '#000';
            ctx.fillRect(enemy.x + 5 + lookDir, enemy.y + 6 + bobY, 2, 3);
            ctx.fillRect(enemy.x + 12 + lookDir, enemy.y + 6 + bobY, 2, 3);

            // Angry eyebrows at haunt stage 3+
            if (this.hauntStage >= 3) {
                ctx.strokeStyle = '#ff0000';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(enemy.x + 3, enemy.y + 3 + bobY);
                ctx.lineTo(enemy.x + 9, enemy.y + 5 + bobY);
                ctx.moveTo(enemy.x + 17, enemy.y + 3 + bobY);
                ctx.lineTo(enemy.x + 11, enemy.y + 5 + bobY);
                ctx.stroke();
            }
        }
    }

    renderGhostEnemies(ctx, timestamp) {
        for (const ghost of this.ghostEnemies) {
            if (!ghost.alive) continue;

            const flicker = Math.sin(ghost.flickerTimer * 15) * 0.2;
            ctx.globalAlpha = ghost.alpha + flicker;

            // Ghostly silhouette - resembles the player but wrong
            ctx.fillStyle = '#880044';
            ctx.fillRect(ghost.x, ghost.y, ghost.width, ghost.height);

            // Glowing eyes
            ctx.fillStyle = '#ff0066';
            ctx.fillRect(ghost.x + 4, ghost.y + 6, 4, 4);
            ctx.fillRect(ghost.x + ghost.width - 8, ghost.y + 6, 4, 4);

            // Trailing effect
            ctx.fillStyle = 'rgba(136, 0, 68, 0.2)';
            ctx.fillRect(ghost.x - ghost.vx * 3, ghost.y, ghost.width, ghost.height);
            ctx.fillRect(ghost.x - ghost.vx * 6, ghost.y, ghost.width, ghost.height);

            ctx.globalAlpha = 1;
        }
    }

    renderPlayer(ctx, timestamp) {
        const p = this.player;
        if (p.dead) return;

        // Invincibility blink
        if (p.invincible > 0 && Math.sin(timestamp / 50) > 0) return;

        ctx.save();

        // Sprite corruption at haunt stage 2+
        if (this.spriteCorruption > 0 && this.hauntStage >= 2) {
            const corr = this.spriteCorruption * 0.3;
            if (Math.random() < corr) {
                ctx.translate(
                    (Math.random() - 0.5) * corr * 8,
                    (Math.random() - 0.5) * corr * 4
                );
            }
        }

        // Body color - degrades over time
        let bodyColor = '#ff0000';
        let pantsColor = '#0000cc';
        if (this.hauntStage >= 2) {
            const desat = this.spriteCorruption * 0.5;
            bodyColor = `rgb(${Math.floor(255 - desat * 100)}, ${Math.floor(desat * 60)}, ${Math.floor(desat * 60)})`;
            pantsColor = `rgb(${Math.floor(desat * 60)}, ${Math.floor(desat * 60)}, ${Math.floor(204 - desat * 100)})`;
        }
        if (this.hauntStage >= 4) {
            bodyColor = '#440022';
            pantsColor = '#220044';
        }

        const fx = p.facing;
        const px = p.x;
        const py = p.y;

        // Legs
        ctx.fillStyle = pantsColor;
        const legOffset = p.onGround ? Math.sin(p.animTimer * 12) * 3 : 2;
        ctx.fillRect(px + 3, py + 18, 6, 10);
        ctx.fillRect(px + 11, py + 18, 6, 10);
        // Feet
        ctx.fillStyle = '#553311';
        ctx.fillRect(px + 2 + (fx > 0 ? legOffset : -legOffset), py + 25, 7, 3);
        ctx.fillRect(px + 11 + (fx > 0 ? -legOffset : legOffset), py + 25, 7, 3);

        // Body
        ctx.fillStyle = bodyColor;
        ctx.fillRect(px + 3, py + 8, 14, 12);

        // Head
        ctx.fillStyle = '#FFCC99';
        ctx.fillRect(px + 4, py, 12, 10);

        // Hat
        ctx.fillStyle = bodyColor;
        ctx.fillRect(px + 2, py - 2, 16, 5);
        ctx.fillRect(px + (fx > 0 ? 10 : -2), py - 2, 10, 3);

        // Eyes
        ctx.fillStyle = '#000';
        const eyeX = fx > 0 ? px + 12 : px + 6;
        ctx.fillRect(eyeX, py + 3, 2, 3);

        // Mustache
        ctx.fillStyle = '#553311';
        ctx.fillRect(px + 6, py + 7, 8, 2);

        // Arms (animated)
        ctx.fillStyle = bodyColor;
        const armSwing = p.onGround ? Math.sin(p.animTimer * 12) * 4 : -3;
        ctx.fillRect(px - 2, py + 10 + armSwing, 5, 8);
        ctx.fillRect(px + 17, py + 10 - armSwing, 5, 8);

        // Hands
        ctx.fillStyle = '#FFCC99';
        ctx.fillRect(px - 2, py + 16 + armSwing, 4, 3);
        ctx.fillRect(px + 18, py + 16 - armSwing, 4, 3);

        ctx.restore();
    }

    renderParticles(ctx) {
        for (const p of this.particles) {
            ctx.globalAlpha = Math.max(0, p.life * 2);
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.globalAlpha = 1;
    }

    renderHauntingOverlays(ctx, timestamp) {
        // Name display
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';

        let displayName = this.playerName;
        if (this.hauntStage >= 3 && !this.alexRevealed) {
            // Name glitches between MARIO and ALEX
            if (Math.random() < 0.03) {
                const chars = 'ALEX'.split('');
                const marioChars = 'MARIO'.split('');
                displayName = marioChars.map((c, i) =>
                    Math.random() < 0.3 && chars[i] ? chars[i] : c
                ).join('');
            }
        }

        ctx.fillStyle = '#fff';
        ctx.fillText(`${displayName} x ${this.lives}`, 10, 35);

        // Haunting text overlays
        if (this.hauntStage >= 2 && Math.random() < 0.002) {
            const messages = [
                'WHY DO YOU KEEP RUNNING?',
                'THE COINS AREN\'T REAL',
                'HE DIED HERE',
                'LEVEL -1',
                'SAVE HIM'
            ];
            const msg = messages[Math.floor(Math.random() * messages.length)];
            ctx.fillStyle = `rgba(255, 0, 60, ${0.3 + Math.random() * 0.3})`;
            ctx.font = '16px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(msg, this.width / 2 + (Math.random() - 0.5) * 20, this.height / 2 + (Math.random() - 0.5) * 40);
            ctx.textAlign = 'left';
        }

        // Stage 4: Alex overlay
        if (this.alexRevealed) {
            ctx.fillStyle = `rgba(255, 0, 80, ${Math.sin(timestamp / 500) * 0.1 + 0.1})`;
            ctx.font = 'bold 32px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('ALEX', this.width / 2, this.height / 2 - 60);
            ctx.font = '12px monospace';
            ctx.fillText('HE WAS HERE BEFORE YOU', this.width / 2, this.height / 2 - 40);
            ctx.textAlign = 'left';
        }

        // Scanline distortion at high corruption
        if (this.corruptionLevel > 0.4) {
            const numLines = Math.floor(this.corruptionLevel * 8);
            for (let i = 0; i < numLines; i++) {
                const ly = Math.random() * this.height;
                const shift = (Math.random() - 0.5) * this.corruptionLevel * 30;
                ctx.drawImage(ctx.canvas, shift, ly, this.width, 2, 0, ly, this.width, 2);
            }
        }
    }
}

export default CursedMarioWorld;
