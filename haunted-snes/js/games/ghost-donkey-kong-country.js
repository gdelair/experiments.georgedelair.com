// ghost-donkey-kong-country.js — Side-scrolling platformer with pre-rendered style corruption

import { GameBase } from './game-base.js';
import { input, BUTTONS } from '../core/input.js';
import { sfx } from '../audio/sfx.js';
import state from '../core/state.js';
import { events, EVENTS } from '../core/events.js';

const GRAVITY = 1100;
const JUMP_VEL = -500;
const MOVE_SPEED = 200;
const BARREL_LAUNCH_VEL = 650;
const GROUND_Y_BASE = 360;

// DK sprite pixel map (simplified body parts for degradation)
const DK_PARTS = {
    HEAD:     { x: -14, y: -28, w: 28, h: 16, color: '#8B4513' },
    TORSO:    { x: -12, y: -12, w: 24, h: 18, color: '#6B3410' },
    LEFT_ARM: { x: -18, y: -10, w: 8, h: 16, color: '#8B4513' },
    RIGHT_ARM:{ x: 10, y: -10, w: 8, h: 16, color: '#8B4513' },
    LEFT_LEG: { x: -10, y: 6, w: 8, h: 14, color: '#5a2d0c' },
    RIGHT_LEG:{ x: 2, y: 6, w: 8, h: 14, color: '#5a2d0c' },
    TIE:      { x: -4, y: -8, w: 8, h: 10, color: '#cc2222' },
    EYES:     { x: -6, y: -26, w: 12, h: 6, color: '#fff' },
    MOUTH:    { x: -5, y: -20, w: 10, h: 4, color: '#d2a679' }
};

const KREMLING_COLORS = ['#2d5a1e', '#3a7a28', '#1e4a14'];

export class GhostDonkeyKongCountry extends GameBase {
    constructor() {
        super({
            id: 'dkc',
            name: 'GHOST DK COUNTRY',
            channel: 8,
            titleColor: '#ffcc00',
            bgColor: '#1a0a00'
        });
    }

    onInit() {
        this.resetGameState();
    }

    resetGameState() {
        // Player
        this.dk = {
            x: 80, y: GROUND_Y_BASE - 40, vx: 0, vy: 0,
            w: 36, h: 40, onGround: false, facing: 1,
            inBarrel: false, rolling: false, rollTimer: 0,
            missingParts: new Set(), // For visual degradation
            momentum: 0, // DKC has heavier physics
            jumpHeld: false, bounceCount: 0
        };

        // Camera scroll
        this.scrollX = 0;
        this.scrollSpeed = 0;

        // Level geometry
        this.platforms = [];
        this.bananas = [];
        this.barrels = [];
        this.kremlings = [];
        this.ghostEntities = [];
        this.groundSegments = [];

        // Counters
        this.bananaCount = 0;
        this.totalBananas = 0;

        // Effects
        this.bgLayers = [];
        this.particles = [];
        this.screenFlash = 0;
        this.shakeAmount = 0;

        // Corruption state
        this.groundFading = false;
        this.groundOpacity = 1;
        this.barrelGhostChance = 0;
        this.degradeTimer = 0;
        this.ghostMessages = [];
        this.jungleDarkness = 0;

        this.generateLevel();
    }

    generateLevel() {
        // Generate ground with gaps
        let gx = 0;
        while (gx < 8000) {
            const segWidth = 120 + Math.random() * 300;
            const segY = GROUND_Y_BASE + (Math.random() - 0.5) * 30;
            this.groundSegments.push({
                x: gx, y: segY, w: segWidth, h: 80, visible: true
            });
            gx += segWidth + (Math.random() < 0.3 ? 60 + Math.random() * 80 : 0);
        }

        // Platforms
        for (let i = 0; i < 60; i++) {
            const px = 200 + i * 130 + Math.random() * 60;
            const py = 180 + Math.random() * 160;
            this.platforms.push({
                x: px, y: py,
                w: 60 + Math.random() * 80, h: 12,
                type: Math.random() < 0.3 ? 'vine' : 'wood'
            });
        }

        // Bananas
        for (let i = 0; i < 120; i++) {
            const bx = 100 + i * 65 + Math.random() * 30;
            const by = 140 + Math.random() * 200;
            this.bananas.push({
                x: bx, y: by, collected: false,
                bobOffset: Math.random() * Math.PI * 2
            });
            this.totalBananas++;
        }

        // Barrels (launch barrels)
        for (let i = 0; i < 20; i++) {
            const bx = 300 + i * 380 + Math.random() * 100;
            const by = 200 + Math.random() * 120;
            const angle = -0.5 + Math.random() * -0.8; // Upward angle
            this.barrels.push({
                x: bx, y: by, angle: angle,
                w: 32, h: 36, rotateSpeed: 2,
                rotation: 0, active: true,
                hasGhost: false
            });
        }

        // Kremling enemies
        for (let i = 0; i < 35; i++) {
            const kx = 250 + i * 220 + Math.random() * 80;
            this.kremlings.push({
                x: kx, y: GROUND_Y_BASE - 30, vx: -40 - Math.random() * 30,
                w: 24, h: 30, alive: true, facing: -1,
                color: KREMLING_COLORS[Math.floor(Math.random() * KREMLING_COLORS.length)],
                patrolLeft: kx - 80, patrolRight: kx + 80,
                animTimer: Math.random() * Math.PI * 2
            });
        }

        // Background layers (parallax)
        this.bgLayers = [
            { color: '#0a1a05', speedFactor: 0.1, trees: this.generateTrees(20, 0.1) },
            { color: '#0d2208', speedFactor: 0.3, trees: this.generateTrees(15, 0.3) },
            { color: '#112a0a', speedFactor: 0.5, trees: this.generateTrees(10, 0.5) }
        ];
    }

    generateTrees(count, depth) {
        const trees = [];
        for (let i = 0; i < count; i++) {
            trees.push({
                x: Math.random() * 4000,
                height: 80 + Math.random() * 160 * (1 - depth),
                width: 20 + Math.random() * 40
            });
        }
        return trees;
    }

    onStart() {}
    onStop() {}

    onRestart() {
        this.resetGameState();
        this.lives = 3;
        this.score = 0;
    }

    onDeath() {
        this.dk.x = Math.max(this.scrollX + 80, this.dk.x - 200);
        this.dk.y = GROUND_Y_BASE - 40;
        this.dk.vx = 0;
        this.dk.vy = 0;
        this.dk.inBarrel = false;
        this.dk.rolling = false;
        this.shakeAmount = 10;
        this.screenFlash = 0.3;
    }

    onTitleDismiss() {
        sfx.play('confirm');
    }

    onUpdate(dt, timestamp) {
        this.updateTimers(dt);
        this.updatePlayer(dt, timestamp);
        this.updateCamera(dt);
        this.updateEnemies(dt, timestamp);
        this.updateBarrels(dt, timestamp);
        this.updateBananas(dt, timestamp);
        this.updateGhostEntities(dt, timestamp);
        this.updateParticles(dt);
        this.updateCorruption(dt, timestamp);

        // Shake decay
        if (this.shakeAmount > 0) this.shakeAmount *= 0.9;
        if (this.shakeAmount < 0.5) this.shakeAmount = 0;
        if (this.screenFlash > 0) this.screenFlash -= dt * 2;
    }

    updatePlayer(dt, timestamp) {
        const dk = this.dk;
        const dpad = input.getDPad();

        if (dk.inBarrel) {
            // In barrel: press B to launch
            if (input.isJustPressed(BUTTONS.B) || input.isJustPressed(BUTTONS.A)) {
                this.launchFromBarrel();
            }
            return;
        }

        // Horizontal movement with momentum
        const targetVx = dpad.x * MOVE_SPEED;
        dk.momentum += (targetVx - dk.momentum) * 4 * dt; // Heavier, more momentum
        dk.vx = dk.momentum;
        if (dpad.x !== 0) dk.facing = dpad.x > 0 ? 1 : -1;

        // Jump
        if (input.isJustPressed(BUTTONS.A) && dk.onGround) {
            dk.vy = JUMP_VEL;
            dk.onGround = false;
            dk.jumpHeld = true;
            sfx.play('jump');
        }
        // Variable jump height
        if (dk.jumpHeld && !input.isPressed(BUTTONS.A) && dk.vy < -200) {
            dk.vy *= 0.5;
            dk.jumpHeld = false;
        }

        // Roll attack (Y button)
        if (input.isJustPressed(BUTTONS.Y) && dk.onGround && !dk.rolling) {
            dk.rolling = true;
            dk.rollTimer = 0.5;
            dk.vx = dk.facing * 350;
            sfx.play('boost');
        }
        if (dk.rolling) {
            dk.rollTimer -= dt;
            if (dk.rollTimer <= 0) {
                dk.rolling = false;
            }
        }

        // Gravity
        dk.vy += GRAVITY * dt;
        dk.x += dk.vx * dt;
        dk.y += dk.vy * dt;

        // Ground collision
        dk.onGround = false;
        for (const seg of this.groundSegments) {
            if (!seg.visible) continue;
            if (this.rectsOverlap(dk.x, dk.y, dk.w, dk.h, seg.x, seg.y, seg.w, seg.h)) {
                if (dk.vy > 0 && dk.y + dk.h - seg.y < 20) {
                    dk.y = seg.y - dk.h;
                    dk.vy = 0;
                    dk.onGround = true;
                }
            }
        }

        // Platform collision
        for (const plat of this.platforms) {
            if (dk.vy > 0 &&
                dk.x + dk.w > plat.x && dk.x < plat.x + plat.w &&
                dk.y + dk.h > plat.y && dk.y + dk.h < plat.y + 16) {
                dk.y = plat.y - dk.h;
                dk.vy = 0;
                dk.onGround = true;
            }
        }

        // Fall death
        if (dk.y > this.height + 50) {
            this.die();
        }

        // Barrel entry
        for (const barrel of this.barrels) {
            if (!barrel.active) continue;
            if (this.rectsOverlap(dk.x, dk.y, dk.w, dk.h,
                barrel.x - barrel.w / 2, barrel.y - barrel.h / 2, barrel.w, barrel.h)) {
                dk.inBarrel = true;
                dk.x = barrel.x;
                dk.y = barrel.y;
                dk.vx = 0;
                dk.vy = 0;
                dk._currentBarrel = barrel;
                sfx.play('land');
                break;
            }
        }

        // Enemy bounce/collision
        for (const k of this.kremlings) {
            if (!k.alive) continue;
            if (this.rectsOverlap(dk.x, dk.y, dk.w, dk.h, k.x, k.y, k.w, k.h)) {
                if (dk.vy > 0 && dk.y + dk.h < k.y + k.h / 2) {
                    // Stomp
                    k.alive = false;
                    dk.vy = -300;
                    dk.bounceCount++;
                    this.addScore(100 * dk.bounceCount);
                    sfx.play('hit');
                    this.spawnParticles(k.x + k.w / 2, k.y, '#2d5a1e', 6);
                } else if (dk.rolling) {
                    // Roll kill
                    k.alive = false;
                    this.addScore(200);
                    sfx.play('hit');
                    this.spawnParticles(k.x + k.w / 2, k.y, '#2d5a1e', 8);

                    // Corruption: barrel ghosts on kill
                    if (this.hauntStage >= 2 && Math.random() < this.barrelGhostChance) {
                        this.spawnGhost(k.x, k.y);
                    }
                } else {
                    // Hit by enemy
                    this.takeDamage();
                }
            }
        }
    }

    launchFromBarrel() {
        const dk = this.dk;
        const barrel = dk._currentBarrel;
        if (!barrel) return;

        dk.inBarrel = false;
        dk.vx = Math.cos(barrel.angle) * BARREL_LAUNCH_VEL;
        dk.vy = Math.sin(barrel.angle) * BARREL_LAUNCH_VEL;
        dk.bounceCount = 0;
        sfx.play('boost');
        this.shakeAmount = 5;
        this.spawnParticles(barrel.x, barrel.y, '#ff8800', 6);

        // Corruption: barrels spawn ghosts
        if (this.hauntStage >= 1 && Math.random() < this.barrelGhostChance) {
            barrel.hasGhost = true;
            this.spawnGhost(barrel.x, barrel.y);
            sfx.play('glitch');
        }
    }

    takeDamage() {
        const dk = this.dk;
        dk.vy = -250;
        dk.vx = -dk.facing * 150;
        this.shakeAmount = 8;
        sfx.play('damage');
        this.die();
    }

    spawnGhost(x, y) {
        this.ghostEntities.push({
            x, y, vx: (Math.random() - 0.5) * 60,
            vy: -20 - Math.random() * 30,
            size: 20 + Math.random() * 20,
            alpha: 0.6, life: 5 + Math.random() * 5,
            type: Math.random() < 0.5 ? 'dk_shadow' : 'kremling_ghost',
            wobble: Math.random() * Math.PI * 2
        });
    }

    updateCamera(dt) {
        const targetScroll = this.dk.x - this.width * 0.35;
        this.scrollSpeed += (targetScroll - this.scrollX) * 3 * dt;
        this.scrollSpeed *= 0.85;
        this.scrollX += this.scrollSpeed;
        if (this.scrollX < 0) this.scrollX = 0;
    }

    updateEnemies(dt, timestamp) {
        for (const k of this.kremlings) {
            if (!k.alive) continue;
            k.animTimer += dt * 4;
            k.x += k.vx * dt;
            if (k.x < k.patrolLeft || k.x > k.patrolRight) {
                k.vx = -k.vx;
                k.facing = k.vx > 0 ? 1 : -1;
            }
        }
    }

    updateBarrels(dt, timestamp) {
        for (const b of this.barrels) {
            b.rotation += b.rotateSpeed * dt;
        }
    }

    updateBananas(dt, timestamp) {
        const dk = this.dk;
        for (const b of this.bananas) {
            if (b.collected) continue;
            const bx = b.x;
            const by = b.y + Math.sin(timestamp * 3 + b.bobOffset) * 4;
            if (this.rectsOverlap(dk.x, dk.y, dk.w, dk.h, bx - 8, by - 8, 16, 16)) {
                b.collected = true;
                this.bananaCount++;
                this.addScore(10);
                sfx.play('coin');
                this.spawnParticles(bx, by, '#ffcc00', 3);
                // Extra life per 100
                if (this.bananaCount % 100 === 0) {
                    this.lives++;
                    sfx.play('levelUp');
                }
            }
        }
    }

    updateGhostEntities(dt, timestamp) {
        for (let i = this.ghostEntities.length - 1; i >= 0; i--) {
            const g = this.ghostEntities[i];
            g.x += g.vx * dt;
            g.y += g.vy * dt;
            g.vy += 5 * dt; // Slow drift down
            g.wobble += dt * 2;
            g.life -= dt;
            g.alpha = Math.min(0.6, g.life * 0.2);

            if (g.life <= 0) {
                this.ghostEntities.splice(i, 1);
                continue;
            }

            // Ghost collision with player (at higher haunt stages)
            if (this.hauntStage >= 3) {
                const dk = this.dk;
                if (this.rectsOverlap(dk.x, dk.y, dk.w, dk.h,
                    g.x - g.size / 2, g.y - g.size / 2, g.size, g.size)) {
                    this.takeDamage();
                    g.life = 0;
                }
            }
        }
    }

    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 300 * dt;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    updateCorruption(dt, timestamp) {
        this.barrelGhostChance = this.hauntStage * 0.15;

        // Stage 2+: DK loses body parts
        if (this.hauntStage >= 2) {
            this.degradeTimer += dt;
            if (this.degradeTimer > 8) {
                this.degradeTimer = 0;
                const parts = Object.keys(DK_PARTS).filter(p =>
                    !this.dk.missingParts.has(p) && p !== 'TORSO' && p !== 'HEAD'
                );
                if (parts.length > 0) {
                    const part = parts[Math.floor(Math.random() * parts.length)];
                    this.dk.missingParts.add(part);
                    sfx.play('glitch');
                    this.ghostMessages.push({
                        text: part.replace('_', ' ') + ' LOST',
                        timer: 2, x: this.dk.x, y: this.dk.y - 40
                    });
                }
            }
        }

        // Stage 3+: ground starts disappearing
        if (this.hauntStage >= 3) {
            this.groundFading = true;
            this.groundOpacity = Math.max(0.2, this.groundOpacity - dt * 0.02);
            // Randomly hide ground segments ahead of player
            for (const seg of this.groundSegments) {
                if (seg.x > this.scrollX + this.width && seg.visible && Math.random() < 0.001) {
                    seg.visible = false;
                }
            }
        }

        // Jungle gets darker over time
        this.jungleDarkness = Math.min(0.6, this.hauntStage * 0.12 + this.corruptionLevel * 0.2);

        // Ghost messages decay
        for (let i = this.ghostMessages.length - 1; i >= 0; i--) {
            this.ghostMessages[i].timer -= dt;
            if (this.ghostMessages[i].timer <= 0) {
                this.ghostMessages.splice(i, 1);
            }
        }
    }

    spawnParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x, y, color,
                vx: (Math.random() - 0.5) * 200,
                vy: -100 - Math.random() * 150,
                life: 0.3 + Math.random() * 0.3,
                size: 2 + Math.random() * 4
            });
        }
    }

    rectsOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
    }

    // === RENDERING ===

    onRender(ctx, dt, timestamp) {
        ctx.save();
        const sx = this.shakeAmount > 0 ? (Math.random() - 0.5) * this.shakeAmount : 0;
        const sy = this.shakeAmount > 0 ? (Math.random() - 0.5) * this.shakeAmount : 0;
        ctx.translate(sx, sy);

        this.renderBackground(ctx, timestamp);
        this.renderLevel(ctx, timestamp);
        this.renderBananas(ctx, timestamp);
        this.renderBarrels(ctx, timestamp);
        this.renderKremlings(ctx, timestamp);
        this.renderGhostEntities(ctx, timestamp);
        this.renderDK(ctx, timestamp);
        this.renderParticles(ctx);
        this.renderGhostMessages(ctx);
        this.renderDarknessOverlay(ctx, timestamp);
        this.renderDKCHUD(ctx, timestamp);

        // Screen flash
        if (this.screenFlash > 0) {
            ctx.fillStyle = `rgba(255,255,255,${this.screenFlash})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        ctx.restore();
    }

    renderBackground(ctx, timestamp) {
        // Gradient sky / jungle canopy
        const grad = ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, '#050d02');
        grad.addColorStop(0.3, '#0a1a05');
        grad.addColorStop(1, '#071407');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);

        // Parallax tree layers
        for (const layer of this.bgLayers) {
            const offsetX = this.scrollX * layer.speedFactor;
            ctx.fillStyle = layer.color;
            for (const tree of layer.trees) {
                const tx = tree.x - offsetX;
                const wrapped = ((tx % 2000) + 2000) % 2000 - 200;
                if (wrapped < -100 || wrapped > this.width + 100) continue;

                // Tree trunk
                ctx.fillRect(wrapped, this.height - tree.height, tree.width * 0.3, tree.height);
                // Canopy
                ctx.beginPath();
                ctx.arc(wrapped + tree.width * 0.15, this.height - tree.height, tree.width * 0.6, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    renderLevel(ctx, timestamp) {
        // Ground segments
        for (const seg of this.groundSegments) {
            if (!seg.visible) continue;
            const sx = seg.x - this.scrollX;
            if (sx > this.width + 50 || sx + seg.w < -50) continue;

            ctx.globalAlpha = this.groundFading ? this.groundOpacity : 1;
            // Ground with "pre-rendered" detail
            const groundGrad = ctx.createLinearGradient(sx, seg.y, sx, seg.y + seg.h);
            groundGrad.addColorStop(0, '#4a3520');
            groundGrad.addColorStop(0.2, '#3a2510');
            groundGrad.addColorStop(1, '#1a0a00');
            ctx.fillStyle = groundGrad;
            ctx.fillRect(sx, seg.y, seg.w, seg.h);

            // Grass top
            ctx.fillStyle = '#2a6a15';
            ctx.fillRect(sx, seg.y, seg.w, 4);

            // Texture detail
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            for (let dx = 0; dx < seg.w; dx += 16) {
                ctx.fillRect(sx + dx, seg.y + 8 + Math.sin(dx * 0.3) * 3, 8, 2);
            }
            ctx.globalAlpha = 1;
        }

        // Platforms
        for (const plat of this.platforms) {
            const px = plat.x - this.scrollX;
            if (px > this.width + 50 || px + plat.w < -50) continue;

            if (plat.type === 'vine') {
                ctx.fillStyle = '#3a7a28';
                ctx.fillRect(px, plat.y, plat.w, plat.h);
                // Vine detail
                ctx.strokeStyle = '#2a5a18';
                ctx.lineWidth = 2;
                for (let vx = 0; vx < plat.w; vx += 12) {
                    ctx.beginPath();
                    ctx.moveTo(px + vx, plat.y);
                    ctx.quadraticCurveTo(px + vx + 6, plat.y - 8, px + vx + 12, plat.y);
                    ctx.stroke();
                }
            } else {
                ctx.fillStyle = '#5a4030';
                ctx.fillRect(px, plat.y, plat.w, plat.h);
                ctx.strokeStyle = '#3a2818';
                ctx.strokeRect(px, plat.y, plat.w, plat.h);
                // Wood grain
                ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                ctx.lineWidth = 1;
                for (let gy = 2; gy < plat.h; gy += 4) {
                    ctx.beginPath();
                    ctx.moveTo(px, plat.y + gy);
                    ctx.lineTo(px + plat.w, plat.y + gy);
                    ctx.stroke();
                }
            }
        }
    }

    renderBananas(ctx, timestamp) {
        for (const b of this.bananas) {
            if (b.collected) continue;
            const bx = b.x - this.scrollX;
            if (bx < -20 || bx > this.width + 20) continue;
            const by = b.y + Math.sin(timestamp * 3 + b.bobOffset) * 4;

            // Banana shape
            ctx.fillStyle = '#ffdd00';
            ctx.save();
            ctx.translate(bx, by);
            ctx.rotate(Math.sin(timestamp * 2 + b.bobOffset) * 0.2);
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0.3, Math.PI - 0.3);
            ctx.arc(0, -2, 5, Math.PI - 0.3, 0.3, true);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // Glow
            ctx.fillStyle = 'rgba(255,221,0,0.15)';
            ctx.beginPath();
            ctx.arc(bx, by, 10, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderBarrels(ctx, timestamp) {
        for (const b of this.barrels) {
            const bx = b.x - this.scrollX;
            if (bx < -50 || bx > this.width + 50) continue;

            ctx.save();
            ctx.translate(bx, b.y);
            ctx.rotate(b.rotation);

            // Barrel body
            ctx.fillStyle = b.hasGhost ? '#4a0030' : '#8B4513';
            ctx.beginPath();
            ctx.ellipse(0, 0, b.w / 2, b.h / 2, 0, 0, Math.PI * 2);
            ctx.fill();

            // Barrel bands
            ctx.strokeStyle = b.hasGhost ? '#ff0050' : '#d4a060';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(0, -6, b.w / 2 - 2, 4, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(0, 6, b.w / 2 - 2, 4, 0, 0, Math.PI * 2);
            ctx.stroke();

            // DK logo
            ctx.fillStyle = b.hasGhost ? '#ff0050' : '#ffcc00';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('DK', 0, 4);
            ctx.textAlign = 'left';

            ctx.restore();

            // Ghost barrel aura
            if (b.hasGhost) {
                ctx.fillStyle = `rgba(255,0,80,${0.1 + Math.sin(timestamp * 4) * 0.05})`;
                ctx.beginPath();
                ctx.arc(bx, b.y, 30, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    renderKremlings(ctx, timestamp) {
        for (const k of this.kremlings) {
            if (!k.alive) continue;
            const kx = k.x - this.scrollX;
            if (kx < -40 || kx > this.width + 40) continue;

            ctx.save();
            ctx.translate(kx + k.w / 2, k.y + k.h / 2);
            if (k.facing < 0) ctx.scale(-1, 1);

            // Body
            ctx.fillStyle = k.color;
            ctx.fillRect(-k.w / 2, -k.h / 2, k.w, k.h);

            // Belly
            ctx.fillStyle = '#8aa840';
            ctx.fillRect(-k.w / 2 + 4, -k.h / 2 + 8, k.w - 8, k.h - 12);

            // Head crest
            ctx.fillStyle = k.color;
            ctx.beginPath();
            ctx.moveTo(-4, -k.h / 2);
            ctx.lineTo(0, -k.h / 2 - 8);
            ctx.lineTo(4, -k.h / 2);
            ctx.fill();

            // Eye
            ctx.fillStyle = '#ff4444';
            ctx.fillRect(4, -k.h / 2 + 4, 5, 4);
            ctx.fillStyle = '#000';
            ctx.fillRect(6, -k.h / 2 + 5, 2, 2);

            // Legs walk anim
            const legY = Math.sin(k.animTimer) * 3;
            ctx.fillStyle = k.color;
            ctx.fillRect(-6, k.h / 2 - 4, 5, 6 + legY);
            ctx.fillRect(2, k.h / 2 - 4, 5, 6 - legY);

            ctx.restore();
        }
    }

    renderGhostEntities(ctx, timestamp) {
        for (const g of this.ghostEntities) {
            const gx = g.x - this.scrollX;
            if (gx < -50 || gx > this.width + 50) continue;

            ctx.save();
            ctx.globalAlpha = g.alpha;
            ctx.translate(gx, g.y);

            if (g.type === 'dk_shadow') {
                // Ghost DK silhouette
                ctx.fillStyle = 'rgba(100,0,0,0.6)';
                ctx.beginPath();
                ctx.arc(0, 0, g.size / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(-4, -4, 3, 3);
                ctx.fillRect(2, -4, 3, 3);
            } else {
                // Kremling ghost
                ctx.fillStyle = 'rgba(0,100,0,0.5)';
                ctx.fillRect(-g.size / 3, -g.size / 2, g.size * 0.66, g.size);
                ctx.fillStyle = 'rgba(255,0,0,0.6)';
                ctx.fillRect(-2, -g.size / 3, 2, 2);
                ctx.fillRect(2, -g.size / 3, 2, 2);
            }

            // Wobble trail
            const wobble = Math.sin(g.wobble) * 8;
            ctx.fillStyle = `rgba(200,0,200,${g.alpha * 0.3})`;
            ctx.fillRect(-g.size / 2 + wobble, g.size / 3, g.size, 3);

            ctx.restore();
        }
    }

    renderDK(ctx, timestamp) {
        const dk = this.dk;
        const dkx = dk.x - this.scrollX;

        ctx.save();
        ctx.translate(dkx + dk.w / 2, dk.y + dk.h / 2);
        if (dk.facing < 0) ctx.scale(-1, 1);

        if (dk.rolling) {
            ctx.rotate(timestamp * 15);
        }

        // Draw each body part (skip missing ones for corruption)
        for (const [name, part] of Object.entries(DK_PARTS)) {
            if (dk.missingParts.has(name)) {
                // Render glitch static where part was
                if (Math.random() < 0.3) {
                    ctx.fillStyle = `rgba(255,0,80,${Math.random() * 0.3})`;
                    ctx.fillRect(part.x, part.y, part.w, part.h);
                }
                continue;
            }

            ctx.fillStyle = part.color;
            ctx.fillRect(part.x, part.y, part.w, part.h);
        }

        // Eye pupils (if head exists)
        if (!dk.missingParts.has('EYES') && !dk.missingParts.has('HEAD')) {
            ctx.fillStyle = '#000';
            ctx.fillRect(-3, -25, 4, 3);
            ctx.fillRect(3, -25, 4, 3);
        }

        // Fur texture detail
        if (!dk.missingParts.has('TORSO')) {
            ctx.fillStyle = 'rgba(100,50,10,0.3)';
            for (let fy = -10; fy < 6; fy += 4) {
                ctx.fillRect(-10 + Math.sin(fy) * 2, fy, 2, 2);
                ctx.fillRect(4 + Math.cos(fy) * 2, fy, 2, 2);
            }
        }

        ctx.restore();

        // In-barrel indicator
        if (dk.inBarrel) {
            ctx.fillStyle = 'rgba(255,200,0,0.3)';
            ctx.beginPath();
            ctx.arc(dkx + dk.w / 2, dk.y + dk.h / 2, 25, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderParticles(ctx) {
        for (const p of this.particles) {
            const px = p.x - this.scrollX;
            ctx.globalAlpha = Math.max(0, p.life / 0.4);
            ctx.fillStyle = p.color;
            ctx.fillRect(px - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.globalAlpha = 1;
    }

    renderGhostMessages(ctx) {
        for (const msg of this.ghostMessages) {
            const mx = msg.x - this.scrollX;
            ctx.globalAlpha = Math.min(1, msg.timer);
            ctx.fillStyle = '#ff0050';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(msg.text, mx, msg.y - (2 - msg.timer) * 20);
            ctx.textAlign = 'left';
        }
        ctx.globalAlpha = 1;
    }

    renderDarknessOverlay(ctx, timestamp) {
        if (this.jungleDarkness <= 0) return;

        ctx.fillStyle = `rgba(0,0,0,${this.jungleDarkness})`;
        ctx.fillRect(0, 0, this.width, this.height);

        // Spotlight around DK
        const dkScreenX = this.dk.x - this.scrollX + this.dk.w / 2;
        const dkScreenY = this.dk.y + this.dk.h / 2;
        const grad = ctx.createRadialGradient(dkScreenX, dkScreenY, 20, dkScreenX, dkScreenY, 150);
        grad.addColorStop(0, `rgba(0,0,0,${this.jungleDarkness * 0.8})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.globalCompositeOperation = 'source-over';

        // Haunting eyes in darkness
        if (this.hauntStage >= 3 && Math.random() < 0.02) {
            const eyeX = Math.random() * this.width;
            const eyeY = Math.random() * (this.height * 0.6);
            ctx.fillStyle = 'rgba(255,0,0,0.3)';
            ctx.fillRect(eyeX, eyeY, 4, 3);
            ctx.fillRect(eyeX + 8, eyeY, 4, 3);
        }

        // Stage 4: "CRANKY SAYS: THEY NEVER LEFT THE JUNGLE"
        if (this.hauntStage >= 4 && Math.random() < 0.005) {
            const msgs = [
                'CRANKY SAYS: THEY NEVER LEFT',
                'THE JUNGLE GREW BACK',
                'DK IS JUST PIXELS NOW',
                'DO YOU HEAR THE DRUMS?'
            ];
            ctx.fillStyle = 'rgba(150,100,0,0.2)';
            ctx.font = '14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(msgs[Math.floor(Math.random() * msgs.length)], this.width / 2, this.height / 2);
            ctx.textAlign = 'left';
        }
    }

    renderDKCHUD(ctx, timestamp) {
        // Banana counter
        ctx.fillStyle = '#ffdd00';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`BANANAS: ${this.bananaCount}`, this.width - 160, 20);

        // Lives
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.fillText(`DK x ${this.lives}`, 10, this.height - 12);

        // Ground fade warning
        if (this.groundFading && this.groundOpacity < 0.6) {
            const blink = Math.sin(timestamp * 6) > 0;
            if (blink) {
                ctx.fillStyle = '#ff3333';
                ctx.font = '12px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('GROUND UNSTABLE', this.width / 2, 40);
                ctx.textAlign = 'left';
            }
        }
    }
}

export default GhostDonkeyKongCountry;
