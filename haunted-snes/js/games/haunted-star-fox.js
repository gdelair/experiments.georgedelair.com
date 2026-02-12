// haunted-star-fox.js — 3D wireframe corridor shooter with haunting corruption

import { GameBase } from './game-base.js';
import { input, BUTTONS } from '../core/input.js';
import { sfx } from '../audio/sfx.js';
import state from '../core/state.js';
import { events, EVENTS } from '../core/events.js';

const SHIP_SPEED = 200;
const BULLET_SPEED = 800;
const ENEMY_SPEED_MIN = 80;
const ENEMY_SPEED_MAX = 200;
const CORRIDOR_WIDTH = 400;
const CORRIDOR_HEIGHT = 300;
const DRAW_DISTANCE = 1200;
const NEAR_PLANE = 50;

// Wireframe colors
const WIRE_GREEN = '#00ff66';
const WIRE_BLUE = '#0088ff';
const WIRE_RED = '#ff3344';
const WIRE_CYAN = '#00cccc';
const WIRE_YELLOW = '#ffcc00';

// Radio messages from dead wingmen
const GHOST_RADIO = [
    { name: 'FALCO', msg: 'FOX... I NEVER MADE IT OUT...' },
    { name: 'PEPPY', msg: 'DO A BARREL ROLL... FOREVER...' },
    { name: 'SLIPPY', msg: 'FOX!! HELP ME!! ...I FORGOT WHY...' },
    { name: 'FALCO', msg: 'BEHIND YOU... ALWAYS BEHIND YOU...' },
    { name: 'PEPPY', msg: 'YOUR FATHER... HE SAW THIS TOO...' },
    { name: 'SLIPPY', msg: 'THE SIGNAL... IT KEEPS REPEATING...' },
    { name: '??????', msg: 'THERE IS NO CORNERIA' },
    { name: '??????', msg: 'ANDROSS SEES YOU PLAYING' },
    { name: 'JAMES', msg: 'NEVER GIVE UP. TRUST YOUR... TRUST...' },
    { name: 'JAMES', msg: 'SON... THE VOID REMEMBERS...' }
];

const ENEMY_SHAPES = [
    // Simple fighter (triangle)
    { name: 'fighter', points: [[-15, -10], [15, -10], [0, 15]], hp: 1, score: 100 },
    // Heavy (diamond)
    { name: 'heavy', points: [[0, -20], [20, 0], [0, 20], [-20, 0]], hp: 3, score: 200 },
    // Fast (thin arrow)
    { name: 'fast', points: [[-8, -15], [8, -15], [3, 15], [-3, 15]], hp: 1, score: 150 },
    // Boss piece (large hexagon)
    { name: 'boss', points: [[-25, -15], [-12, -25], [12, -25], [25, -15], [12, 25], [-12, 25]], hp: 6, score: 500 }
];

function project3D(x, y, z, screenW, screenH, fov, inverted) {
    if (z <= 0) return null;
    const scale = fov / z;
    const factor = inverted ? -1 : 1;
    return {
        x: screenW / 2 + x * scale * factor,
        y: screenH / 2 + y * scale * factor,
        scale: scale
    };
}

export class HauntedStarFox extends GameBase {
    constructor() {
        super({
            id: 'star-fox',
            name: 'HAUNTED STAR FOX',
            channel: 10,
            titleColor: '#00ff66',
            bgColor: '#000010'
        });
    }

    onInit() {
        this.resetGameState();
    }

    resetGameState() {
        // Arwing (player ship)
        this.ship = {
            x: 0, y: 30, z: 0, // 3D position (x,y relative to corridor center)
            vx: 0, vy: 0,
            roll: 0, targetRoll: 0,
            shield: 100, maxShield: 100,
            charging: false, chargeTimer: 0,
            iFrames: 0, barrelRollTimer: 0,
            boostTimer: 0
        };

        // Camera
        this.cameraZ = 0;
        this.cameraSpeed = 150;
        this.fov = 200;

        // Corridor
        this.corridorSegments = [];
        this.corridorOffset = 0;
        this.generateCorridorSegments();

        // Enemies
        this.enemies = [];
        this.spawnTimer = 0;
        this.spawnInterval = 2.0;
        this.enemyWave = 0;

        // Bullets
        this.playerBullets = [];
        this.enemyBullets = [];

        // Explosions
        this.explosions = [];

        // Stars
        this.stars = [];
        for (let i = 0; i < 80; i++) {
            this.stars.push({
                x: (Math.random() - 0.5) * 1000,
                y: (Math.random() - 0.5) * 800,
                z: Math.random() * DRAW_DISTANCE,
                size: 1 + Math.random() * 2,
                isEye: false
            });
        }

        // HUD
        this.shieldFlash = 0;
        this.boostMeter = 100;

        // Corruption state
        this.perspectiveInverted = false;
        this.invertTimer = 0;
        this.controlsInverted = false;
        this.radioMessage = null;
        this.radioTimer = 0;
        this.eyeStarCount = 0;
        this.deadWingmen = [];
        this.ghostShips = [];
        this.staticBursts = [];
        this.distortionWave = 0;
        this.corridorColor = WIRE_GREEN;
        this.warningFlash = 0;

        // Targeting reticle
        this.reticleX = 0;
        this.reticleY = 0;
    }

    generateCorridorSegments() {
        this.corridorSegments = [];
        for (let i = 0; i < 40; i++) {
            const z = i * 60;
            const wobbleX = Math.sin(i * 0.2) * 30;
            const wobbleY = Math.cos(i * 0.15) * 20;
            this.corridorSegments.push({
                z: z,
                cx: wobbleX,
                cy: wobbleY,
                w: CORRIDOR_WIDTH,
                h: CORRIDOR_HEIGHT
            });
        }
    }

    onStart() {}
    onStop() {}

    onRestart() {
        this.resetGameState();
        this.lives = 3;
        this.score = 0;
    }

    onDeath() {
        this.ship.iFrames = 90;
        this.ship.shield = this.ship.maxShield;
        this.ship.x = 0;
        this.ship.y = 30;
        this.shieldFlash = 0.5;
    }

    onTitleDismiss() {
        sfx.play('confirm');
    }

    onUpdate(dt, timestamp) {
        this.updateTimers(dt);
        this.updateShip(dt, timestamp);
        this.updateCamera(dt);
        this.updateBullets(dt);
        this.updateEnemies(dt, timestamp);
        this.updateExplosions(dt);
        this.updateStars(dt);
        this.updateCorruption(dt, timestamp);

        // Spawn enemies
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnEnemy();
            this.spawnTimer = this.spawnInterval;
            this.spawnInterval = Math.max(0.5, this.spawnInterval - 0.02);
            this.enemyWave++;
        }

        // Decay effects
        if (this.shieldFlash > 0) this.shieldFlash -= dt * 3;
        if (this.warningFlash > 0) this.warningFlash -= dt * 2;
    }

    updateShip(dt, timestamp) {
        const ship = this.ship;
        const dpad = input.getDPad();

        let moveX = dpad.x;
        let moveY = dpad.y;

        // Corruption: inverted controls
        if (this.controlsInverted) {
            moveX = -moveX;
            moveY = -moveY;
        }

        // Movement
        ship.vx += moveX * SHIP_SPEED * 3 * dt;
        ship.vy += moveY * SHIP_SPEED * 3 * dt;
        ship.vx *= 0.88;
        ship.vy *= 0.88;
        ship.x += ship.vx * dt;
        ship.y += ship.vy * dt;

        // Clamp to corridor bounds
        const halfW = CORRIDOR_WIDTH * 0.4;
        const halfH = CORRIDOR_HEIGHT * 0.4;
        ship.x = Math.max(-halfW, Math.min(halfW, ship.x));
        ship.y = Math.max(-halfH, Math.min(halfH, ship.y));

        // Roll based on horizontal input
        ship.targetRoll = -moveX * 0.5;
        ship.roll += (ship.targetRoll - ship.roll) * 5 * dt;

        // Barrel roll (double-tap L or R)
        if (input.isJustPressed(BUTTONS.L) || input.isJustPressed(BUTTONS.R)) {
            if (ship.barrelRollTimer <= 0) {
                ship.barrelRollTimer = 0.5;
                sfx.play('boost');
            }
        }
        if (ship.barrelRollTimer > 0) {
            ship.barrelRollTimer -= dt;
            ship.roll += dt * 20;
        }

        // Shoot (B button)
        if (input.isJustPressed(BUTTONS.B)) {
            this.shootPlayerBullet();
        }

        // Charge shot (hold B)
        if (input.isPressed(BUTTONS.B)) {
            ship.chargeTimer += dt;
            if (ship.chargeTimer > 1.5) ship.charging = true;
        }
        if (input.isJustReleased(BUTTONS.B) && ship.charging) {
            this.shootChargedBullet();
            ship.charging = false;
            ship.chargeTimer = 0;
        }
        if (!input.isPressed(BUTTONS.B)) {
            ship.chargeTimer = 0;
            ship.charging = false;
        }

        // Boost (Y button)
        if (input.isPressed(BUTTONS.Y) && this.boostMeter > 0) {
            this.cameraSpeed = 300;
            this.boostMeter = Math.max(0, this.boostMeter - 40 * dt);
            ship.boostTimer = 0.3;
        } else {
            this.cameraSpeed = 150;
            this.boostMeter = Math.min(100, this.boostMeter + 10 * dt);
        }
        if (ship.boostTimer > 0) ship.boostTimer -= dt;

        // iFrames
        if (ship.iFrames > 0) ship.iFrames--;

        // Reticle follows ship position with offset
        this.reticleX = this.width / 2 + ship.x * 0.8;
        this.reticleY = this.height / 2 + ship.y * 0.8 - 40;
    }

    shootPlayerBullet() {
        const ship = this.ship;
        this.playerBullets.push({
            x: ship.x - 12, y: ship.y, z: this.cameraZ + 100,
            vz: BULLET_SPEED, damage: 1, life: 2, size: 3
        });
        this.playerBullets.push({
            x: ship.x + 12, y: ship.y, z: this.cameraZ + 100,
            vz: BULLET_SPEED, damage: 1, life: 2, size: 3
        });
        sfx.play('shoot');
    }

    shootChargedBullet() {
        const ship = this.ship;
        this.playerBullets.push({
            x: ship.x, y: ship.y, z: this.cameraZ + 100,
            vz: BULLET_SPEED * 1.5, damage: 5, life: 3, size: 8,
            charged: true
        });
        sfx.play('boost');
    }

    spawnEnemy() {
        const shapeIdx = this.enemyWave > 10 && Math.random() < 0.15
            ? 3 : Math.floor(Math.random() * 3);
        const shape = ENEMY_SHAPES[shapeIdx];
        const spawnZ = this.cameraZ + DRAW_DISTANCE - 100;

        this.enemies.push({
            x: (Math.random() - 0.5) * CORRIDOR_WIDTH * 0.6,
            y: (Math.random() - 0.5) * CORRIDOR_HEIGHT * 0.4,
            z: spawnZ,
            vx: (Math.random() - 0.5) * 60,
            vy: (Math.random() - 0.5) * 40,
            vz: -(ENEMY_SPEED_MIN + Math.random() * (ENEMY_SPEED_MAX - ENEMY_SPEED_MIN)),
            shape: shape,
            hp: shape.hp,
            alive: true,
            flashTimer: 0,
            shootTimer: 2 + Math.random() * 3,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 3
        });
    }

    updateCamera(dt) {
        this.cameraZ += this.cameraSpeed * dt;

        // Advance corridor
        this.corridorOffset += this.cameraSpeed * dt;
        while (this.corridorSegments.length > 0 &&
               this.corridorSegments[0].z < this.cameraZ - 100) {
            this.corridorSegments.shift();
            const last = this.corridorSegments[this.corridorSegments.length - 1];
            const newZ = last.z + 60;
            const i = newZ / 60;
            this.corridorSegments.push({
                z: newZ,
                cx: Math.sin(i * 0.2) * 30,
                cy: Math.cos(i * 0.15) * 20,
                w: CORRIDOR_WIDTH,
                h: CORRIDOR_HEIGHT
            });
        }
    }

    updateBullets(dt) {
        // Player bullets
        for (let i = this.playerBullets.length - 1; i >= 0; i--) {
            const b = this.playerBullets[i];
            b.z += b.vz * dt;
            b.life -= dt;

            if (b.life <= 0 || b.z > this.cameraZ + DRAW_DISTANCE) {
                this.playerBullets.splice(i, 1);
                continue;
            }

            // Hit enemies
            for (const e of this.enemies) {
                if (!e.alive) continue;
                const dx = b.x - e.x;
                const dy = b.y - e.y;
                const dz = b.z - e.z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                if (dist < 30) {
                    e.hp -= b.damage;
                    e.flashTimer = 5;
                    sfx.play('hit');
                    if (e.hp <= 0) {
                        e.alive = false;
                        this.addScore(e.shape.score);
                        this.spawnExplosion(e.x, e.y, e.z);
                        sfx.play('explosion');
                    }
                    this.playerBullets.splice(i, 1);
                    break;
                }
            }
        }

        // Enemy bullets
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const b = this.enemyBullets[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.z += b.vz * dt;
            b.life -= dt;

            if (b.life <= 0 || b.z < this.cameraZ - 50) {
                this.enemyBullets.splice(i, 1);
                continue;
            }

            // Hit player
            const ship = this.ship;
            if (ship.iFrames <= 0 && ship.barrelRollTimer <= 0) {
                const dx = b.x - ship.x;
                const dy = b.y - ship.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 25 && Math.abs(b.z - this.cameraZ) < 80) {
                    ship.shield -= 15;
                    ship.iFrames = 30;
                    sfx.play('damage');
                    this.shieldFlash = 0.4;
                    this.enemyBullets.splice(i, 1);
                    if (ship.shield <= 0) {
                        ship.shield = 0;
                        this.die();
                    }
                }
            }
        }
    }

    updateEnemies(dt, timestamp) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            if (!e.alive) {
                this.enemies.splice(i, 1);
                continue;
            }

            e.x += e.vx * dt;
            e.y += e.vy * dt;
            e.z += e.vz * dt;
            e.rotation += e.rotSpeed * dt;
            if (e.flashTimer > 0) e.flashTimer--;

            // Bounce off corridor walls
            if (Math.abs(e.x) > CORRIDOR_WIDTH * 0.4) e.vx = -e.vx;
            if (Math.abs(e.y) > CORRIDOR_HEIGHT * 0.4) e.vy = -e.vy;

            // Shoot at player
            e.shootTimer -= dt;
            if (e.shootTimer <= 0 && e.z > this.cameraZ && e.z < this.cameraZ + DRAW_DISTANCE * 0.7) {
                e.shootTimer = 2 + Math.random() * 3;
                const dx = this.ship.x - e.x;
                const dy = this.ship.y - e.y;
                const dz = this.cameraZ - e.z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
                this.enemyBullets.push({
                    x: e.x, y: e.y, z: e.z,
                    vx: (dx / dist) * 200,
                    vy: (dy / dist) * 200,
                    vz: (dz / dist) * 300,
                    life: 4, size: 4
                });
            }

            // Collision with player ship
            if (e.z < this.cameraZ + 30 && e.z > this.cameraZ - 30) {
                const dx = e.x - this.ship.x;
                const dy = e.y - this.ship.y;
                if (Math.sqrt(dx * dx + dy * dy) < 35 && this.ship.iFrames <= 0) {
                    this.ship.shield -= 25;
                    this.ship.iFrames = 45;
                    e.alive = false;
                    this.spawnExplosion(e.x, e.y, e.z);
                    sfx.play('damage');
                    this.shieldFlash = 0.5;
                    if (this.ship.shield <= 0) {
                        this.ship.shield = 0;
                        this.die();
                    }
                }
            }

            // Remove if behind camera
            if (e.z < this.cameraZ - 200) {
                this.enemies.splice(i, 1);
            }
        }
    }

    spawnExplosion(x, y, z) {
        const parts = [];
        for (let i = 0; i < 12; i++) {
            parts.push({
                x, y, z,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200,
                vz: (Math.random() - 0.5) * 100,
                life: 0.5 + Math.random() * 0.5,
                size: 3 + Math.random() * 6
            });
        }
        this.explosions.push(...parts);
    }

    updateExplosions(dt) {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const e = this.explosions[i];
            e.x += e.vx * dt;
            e.y += e.vy * dt;
            e.z += e.vz * dt;
            e.life -= dt;
            if (e.life <= 0) this.explosions.splice(i, 1);
        }
    }

    updateStars(dt) {
        for (const s of this.stars) {
            s.z -= this.cameraSpeed * dt;
            if (s.z < 0) {
                s.z = DRAW_DISTANCE;
                s.x = (Math.random() - 0.5) * 1000;
                s.y = (Math.random() - 0.5) * 800;
                s.isEye = this.hauntStage >= 3 && Math.random() < this.eyeStarCount * 0.02;
            }
        }
    }

    updateCorruption(dt, timestamp) {
        // Stage 1+: occasional radio messages from dead wingmen
        if (this.hauntStage >= 1) {
            this.radioTimer -= dt;
            if (this.radioTimer <= 0 && !this.radioMessage) {
                this.radioTimer = 8 + Math.random() * 12;
                const msg = GHOST_RADIO[Math.floor(Math.random() * GHOST_RADIO.length)];
                this.radioMessage = { ...msg, timer: 4, typedChars: 0, typeTimer: 0 };
                sfx.play('static');
            }
            if (this.radioMessage) {
                this.radioMessage.timer -= dt;
                this.radioMessage.typeTimer += dt;
                if (this.radioMessage.typeTimer > 0.05) {
                    this.radioMessage.typeTimer = 0;
                    this.radioMessage.typedChars = Math.min(
                        this.radioMessage.msg.length,
                        this.radioMessage.typedChars + 1
                    );
                }
                if (this.radioMessage.timer <= 0) {
                    this.radioMessage = null;
                }
            }
        }

        // Stage 2+: perspective breaks/inverts
        if (this.hauntStage >= 2) {
            this.invertTimer -= dt;
            if (this.invertTimer <= 0 && Math.random() < 0.005) {
                this.perspectiveInverted = !this.perspectiveInverted;
                this.invertTimer = 2 + Math.random() * 4;
                sfx.play('glitch');
                this.warningFlash = 0.3;
            }

            this.distortionWave += dt * 2;
        }

        // Stage 2+: controls invert temporarily
        if (this.hauntStage >= 2 && Math.random() < 0.001) {
            this.controlsInverted = !this.controlsInverted;
            if (this.controlsInverted) {
                this.addTimer(() => { this.controlsInverted = false; }, 3000 + Math.random() * 4000);
                sfx.play('glitch');
            }
        }

        // Stage 3+: stars become eyes
        if (this.hauntStage >= 3) {
            this.eyeStarCount = Math.min(30, this.eyeStarCount + dt * 2);
            this.corridorColor = Math.random() < 0.05 ? '#ff0044' : WIRE_GREEN;
        }

        // Stage 3+: ghost wingmen ships appear
        if (this.hauntStage >= 3 && this.ghostShips.length < 2 && Math.random() < 0.002) {
            this.ghostShips.push({
                x: (Math.random() - 0.5) * 200,
                y: (Math.random() - 0.5) * 100,
                z: this.cameraZ + 200 + Math.random() * 400,
                alpha: 0.3, life: 8 + Math.random() * 5,
                name: ['FALCO', 'PEPPY', 'SLIPPY'][Math.floor(Math.random() * 3)]
            });
            sfx.play('ghostVoice');
        }

        // Ghost ships update
        for (let i = this.ghostShips.length - 1; i >= 0; i--) {
            const gs = this.ghostShips[i];
            gs.z -= 20 * dt;
            gs.x += Math.sin(timestamp * 2 + i) * 30 * dt;
            gs.life -= dt;
            gs.alpha = Math.min(0.4, gs.life * 0.1);
            if (gs.life <= 0 || gs.z < this.cameraZ - 100) {
                this.ghostShips.splice(i, 1);
            }
        }

        // Static bursts
        if (this.hauntStage >= 2 && Math.random() < this.corruptionLevel * 0.02) {
            this.staticBursts.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                w: 20 + Math.random() * 100,
                h: 2 + Math.random() * 8,
                life: 0.05 + Math.random() * 0.1
            });
        }

        for (let i = this.staticBursts.length - 1; i >= 0; i--) {
            this.staticBursts[i].life -= dt;
            if (this.staticBursts[i].life <= 0) this.staticBursts.splice(i, 1);
        }

        // Stage 4: corridor color permanently red, constant radio
        if (this.hauntStage >= 4) {
            this.corridorColor = '#ff0022';
            this.eyeStarCount = 40;
        }
    }

    // === RENDERING ===

    onRender(ctx, dt, timestamp) {
        // Background
        ctx.fillStyle = '#000008';
        ctx.fillRect(0, 0, this.width, this.height);

        this.renderStarField(ctx, timestamp);
        this.renderCorridor(ctx, timestamp);
        this.renderEnemies3D(ctx, timestamp);
        this.renderBullets3D(ctx, timestamp);
        this.renderExplosions3D(ctx, timestamp);
        this.renderGhostShips(ctx, timestamp);
        this.renderArwing(ctx, timestamp);
        this.renderReticle(ctx, timestamp);
        this.renderStaticBursts(ctx);
        this.renderRadioBox(ctx, timestamp);
        this.renderStarFoxHUD(ctx, timestamp);
        this.renderHauntOverlay(ctx, timestamp);

        // Warning flash
        if (this.warningFlash > 0) {
            ctx.fillStyle = `rgba(255,0,50,${this.warningFlash})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        // Shield damage flash
        if (this.shieldFlash > 0) {
            ctx.fillStyle = `rgba(255,100,100,${this.shieldFlash})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }
    }

    renderStarField(ctx, timestamp) {
        for (const s of this.stars) {
            const p = project3D(s.x, s.y, s.z, this.width, this.height, this.fov, this.perspectiveInverted);
            if (!p || p.x < 0 || p.x > this.width || p.y < 0 || p.y > this.height) continue;

            if (s.isEye) {
                // Eye staring back
                const eyeSize = Math.max(2, 8 * p.scale);
                ctx.fillStyle = `rgba(200,0,0,${0.3 + Math.sin(timestamp * 3 + s.x) * 0.2})`;
                ctx.beginPath();
                ctx.ellipse(p.x, p.y, eyeSize, eyeSize * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ff0000';
                ctx.beginPath();
                ctx.arc(p.x, p.y, eyeSize * 0.3, 0, Math.PI * 2);
                ctx.fill();
            } else {
                const brightness = Math.min(1, 2 / s.z * 100);
                ctx.fillStyle = `rgba(200,220,255,${brightness})`;
                ctx.fillRect(p.x, p.y, s.size * p.scale * 2, s.size * p.scale * 2);
            }
        }
    }

    renderCorridor(ctx, timestamp) {
        ctx.strokeStyle = this.corridorColor;
        ctx.lineWidth = 1;

        const inv = this.perspectiveInverted;
        const distort = this.hauntStage >= 2 ? Math.sin(this.distortionWave) * this.corruptionLevel * 15 : 0;

        for (let i = 0; i < this.corridorSegments.length - 1; i++) {
            const seg = this.corridorSegments[i];
            const next = this.corridorSegments[i + 1];
            const relZ = seg.z - this.cameraZ;
            const nextRelZ = next.z - this.cameraZ;

            if (relZ < NEAR_PLANE || relZ > DRAW_DISTANCE) continue;
            if (nextRelZ < NEAR_PLANE) continue;

            const hw = seg.w / 2;
            const hh = seg.h / 2;
            const nhw = next.w / 2;
            const nhh = next.h / 2;

            // Project 4 corners of current segment
            const tl = project3D(-hw + seg.cx + distort, -hh + seg.cy, relZ, this.width, this.height, this.fov, inv);
            const tr = project3D(hw + seg.cx + distort, -hh + seg.cy, relZ, this.width, this.height, this.fov, inv);
            const bl = project3D(-hw + seg.cx + distort, hh + seg.cy, relZ, this.width, this.height, this.fov, inv);
            const br = project3D(hw + seg.cx + distort, hh + seg.cy, relZ, this.width, this.height, this.fov, inv);

            // Project 4 corners of next segment
            const ntl = project3D(-nhw + next.cx, -nhh + next.cy, nextRelZ, this.width, this.height, this.fov, inv);
            const ntr = project3D(nhw + next.cx, -nhh + next.cy, nextRelZ, this.width, this.height, this.fov, inv);
            const nbl = project3D(-nhw + next.cx, nhh + next.cy, nextRelZ, this.width, this.height, this.fov, inv);
            const nbr = project3D(nhw + next.cx, nhh + next.cy, nextRelZ, this.width, this.height, this.fov, inv);

            if (!tl || !tr || !bl || !br || !ntl || !ntr || !nbl || !nbr) continue;

            // Fade by distance
            const fade = Math.max(0.1, 1 - relZ / DRAW_DISTANCE);
            ctx.globalAlpha = fade;

            // Draw wireframe quad edges connecting segments
            // Top
            ctx.beginPath();
            ctx.moveTo(tl.x, tl.y); ctx.lineTo(ntl.x, ntl.y);
            ctx.stroke();
            // Bottom
            ctx.beginPath();
            ctx.moveTo(bl.x, bl.y); ctx.lineTo(nbl.x, nbl.y);
            ctx.stroke();
            // Left
            ctx.beginPath();
            ctx.moveTo(tl.x, tl.y); ctx.lineTo(bl.x, bl.y);
            ctx.stroke();
            // Right
            ctx.beginPath();
            ctx.moveTo(tr.x, tr.y); ctx.lineTo(br.x, br.y);
            ctx.stroke();

            // Horizontal cross wires (every other segment)
            if (i % 2 === 0) {
                ctx.beginPath();
                ctx.moveTo(tl.x, tl.y); ctx.lineTo(tr.x, tr.y);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(bl.x, bl.y); ctx.lineTo(br.x, br.y);
                ctx.stroke();
            }
        }
        ctx.globalAlpha = 1;
    }

    renderEnemies3D(ctx, timestamp) {
        // Sort by Z (far to near)
        const sorted = [...this.enemies].filter(e => e.alive).sort((a, b) => b.z - a.z);

        for (const e of sorted) {
            const relZ = e.z - this.cameraZ;
            if (relZ < NEAR_PLANE || relZ > DRAW_DISTANCE) continue;

            const center = project3D(e.x, e.y, relZ, this.width, this.height, this.fov, this.perspectiveInverted);
            if (!center) continue;

            const flash = e.flashTimer > 0 && e.flashTimer % 2 === 0;
            ctx.strokeStyle = flash ? '#fff' : WIRE_RED;
            ctx.lineWidth = Math.max(1, 2 * center.scale);
            ctx.globalAlpha = Math.max(0.2, 1 - relZ / DRAW_DISTANCE);

            // Draw wireframe shape
            ctx.save();
            ctx.translate(center.x, center.y);
            ctx.rotate(e.rotation);
            ctx.scale(center.scale, center.scale);

            ctx.beginPath();
            const pts = e.shape.points;
            ctx.moveTo(pts[0][0], pts[0][1]);
            for (let p = 1; p < pts.length; p++) {
                ctx.lineTo(pts[p][0], pts[p][1]);
            }
            ctx.closePath();
            ctx.stroke();

            // Engine glow
            ctx.fillStyle = flash ? '#fff' : 'rgba(255,100,0,0.5)';
            ctx.fillRect(-3, 8, 6, 4);

            ctx.restore();
            ctx.globalAlpha = 1;
        }
    }

    renderBullets3D(ctx, timestamp) {
        // Player bullets
        ctx.fillStyle = WIRE_YELLOW;
        for (const b of this.playerBullets) {
            const relZ = b.z - this.cameraZ;
            if (relZ < NEAR_PLANE || relZ > DRAW_DISTANCE) continue;
            const p = project3D(b.x, b.y, relZ, this.width, this.height, this.fov, this.perspectiveInverted);
            if (!p) continue;
            const s = Math.max(1, b.size * p.scale);
            if (b.charged) {
                ctx.fillStyle = `rgba(0,200,255,${0.5 + Math.sin(timestamp * 20) * 0.3})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, s * 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = WIRE_YELLOW;
            ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
        }

        // Enemy bullets
        ctx.fillStyle = '#ff4466';
        for (const b of this.enemyBullets) {
            const relZ = b.z - this.cameraZ;
            if (relZ < NEAR_PLANE) continue;
            const p = project3D(b.x, b.y, relZ, this.width, this.height, this.fov, this.perspectiveInverted);
            if (!p) continue;
            const s = Math.max(2, b.size * p.scale);
            ctx.beginPath();
            ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderExplosions3D(ctx, timestamp) {
        for (const e of this.explosions) {
            const relZ = e.z - this.cameraZ;
            if (relZ < NEAR_PLANE) continue;
            const p = project3D(e.x, e.y, relZ, this.width, this.height, this.fov, this.perspectiveInverted);
            if (!p) continue;
            const s = Math.max(1, e.size * p.scale);
            ctx.globalAlpha = Math.max(0, e.life);
            ctx.fillStyle = Math.random() < 0.5 ? '#ff8800' : '#ffcc00';
            ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
        }
        ctx.globalAlpha = 1;
    }

    renderGhostShips(ctx, timestamp) {
        for (const gs of this.ghostShips) {
            const relZ = gs.z - this.cameraZ;
            if (relZ < NEAR_PLANE) continue;
            const p = project3D(gs.x, gs.y, relZ, this.width, this.height, this.fov, this.perspectiveInverted);
            if (!p) continue;

            ctx.globalAlpha = gs.alpha;
            ctx.strokeStyle = '#8800ff';
            ctx.lineWidth = 1;

            // Ghost arwing shape
            const sc = Math.max(0.5, p.scale * 15);
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.scale(sc, sc);
            ctx.beginPath();
            ctx.moveTo(0, -2); ctx.lineTo(-3, 2); ctx.lineTo(-1, 1);
            ctx.lineTo(0, 3); ctx.lineTo(1, 1); ctx.lineTo(3, 2);
            ctx.closePath();
            ctx.stroke();
            ctx.restore();

            // Name label
            ctx.fillStyle = `rgba(136,0,255,${gs.alpha})`;
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(gs.name, p.x, p.y - 15 * sc);
            ctx.textAlign = 'left';
        }
        ctx.globalAlpha = 1;
    }

    renderArwing(ctx, timestamp) {
        const ship = this.ship;
        const cx = this.width / 2 + ship.x * 0.8;
        const cy = this.height * 0.72 + ship.y * 0.5;

        // iFrames flicker
        if (ship.iFrames > 0 && ship.iFrames % 4 < 2) return;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ship.roll);

        // Arwing wireframe
        ctx.strokeStyle = WIRE_CYAN;
        ctx.lineWidth = 2;

        // Main body
        ctx.beginPath();
        ctx.moveTo(0, -18);        // Nose
        ctx.lineTo(-8, 6);         // Left body
        ctx.lineTo(0, 12);         // Tail
        ctx.lineTo(8, 6);          // Right body
        ctx.closePath();
        ctx.stroke();

        // Wings
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(-35, 8);
        ctx.lineTo(-30, 4);
        ctx.lineTo(-8, -2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(35, 8);
        ctx.lineTo(30, 4);
        ctx.lineTo(8, -2);
        ctx.stroke();

        // Wing tips
        ctx.fillStyle = WIRE_RED;
        ctx.fillRect(-36, 6, 4, 4);
        ctx.fillRect(32, 6, 4, 4);

        // Engine glow
        const engineBright = 0.5 + Math.sin(timestamp * 10) * 0.3;
        ctx.fillStyle = `rgba(0,150,255,${engineBright})`;
        ctx.fillRect(-4, 10, 8, 4);

        // Boost effect
        if (ship.boostTimer > 0) {
            ctx.strokeStyle = `rgba(0,200,255,${ship.boostTimer * 2})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-3, 14);
            ctx.lineTo(0, 14 + 20 * ship.boostTimer * 3);
            ctx.lineTo(3, 14);
            ctx.stroke();
        }

        // Charge indicator
        if (ship.charging) {
            ctx.strokeStyle = `rgba(0,200,255,${0.5 + Math.sin(timestamp * 15) * 0.3})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, -18, 8 + ship.chargeTimer * 5, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Barrel roll visual
        if (ship.barrelRollTimer > 0) {
            ctx.strokeStyle = `rgba(0,255,200,${ship.barrelRollTimer * 2})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(0, 0, 40, 20, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    renderReticle(ctx, timestamp) {
        const rx = this.reticleX;
        const ry = this.reticleY;
        const pulse = Math.sin(timestamp * 6) * 2;

        ctx.strokeStyle = 'rgba(0,255,100,0.6)';
        ctx.lineWidth = 1;

        // Crosshair
        const size = 12 + pulse;
        ctx.beginPath();
        ctx.moveTo(rx - size, ry); ctx.lineTo(rx - 4, ry);
        ctx.moveTo(rx + 4, ry); ctx.lineTo(rx + size, ry);
        ctx.moveTo(rx, ry - size); ctx.lineTo(rx, ry - 4);
        ctx.moveTo(rx, ry + 4); ctx.lineTo(rx, ry + size);
        ctx.stroke();

        // Brackets
        ctx.beginPath();
        ctx.arc(rx, ry, size + 2, 0, Math.PI * 2);
        ctx.stroke();
    }

    renderStaticBursts(ctx) {
        for (const s of this.staticBursts) {
            ctx.fillStyle = `rgba(200,200,200,${Math.random() * 0.5})`;
            for (let x = 0; x < s.w; x += 2) {
                if (Math.random() < 0.5) {
                    ctx.fillRect(s.x + x, s.y, 2, s.h);
                }
            }
        }
    }

    renderRadioBox(ctx, timestamp) {
        if (!this.radioMessage) return;

        const msg = this.radioMessage;
        const boxW = 280;
        const boxH = 50;
        const boxX = this.width / 2 - boxW / 2;
        const boxY = this.height - 80;

        // Box background with static
        ctx.fillStyle = 'rgba(0,0,20,0.85)';
        ctx.fillRect(boxX, boxY, boxW, boxH);

        // Border
        ctx.strokeStyle = msg.name === '??????' ? '#ff0044' : '#00aa44';
        ctx.lineWidth = 2;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Static interference
        if (Math.random() < 0.3) {
            ctx.fillStyle = `rgba(100,100,100,${Math.random() * 0.2})`;
            ctx.fillRect(boxX, boxY + Math.random() * boxH, boxW, 2);
        }

        // Name
        ctx.fillStyle = msg.name === '??????' ? '#ff0044' : '#00ff66';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(msg.name + ':', boxX + 8, boxY + 16);

        // Typed message
        const displayText = msg.msg.substring(0, msg.typedChars);
        ctx.fillStyle = '#cccccc';
        ctx.font = '10px monospace';
        ctx.fillText(displayText, boxX + 8, boxY + 34);

        // Cursor blink
        if (msg.typedChars < msg.msg.length && Math.sin(timestamp * 8) > 0) {
            const textWidth = ctx.measureText(displayText).width;
            ctx.fillStyle = '#fff';
            ctx.fillRect(boxX + 8 + textWidth, boxY + 26, 6, 10);
        }
    }

    renderStarFoxHUD(ctx, timestamp) {
        // Shield bar
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(10, 10, 104, 14);
        ctx.strokeStyle = '#00aa44';
        ctx.strokeRect(10, 10, 104, 14);

        const shieldPct = this.ship.shield / this.ship.maxShield;
        const shieldColor = shieldPct > 0.5 ? '#00ff66' : (shieldPct > 0.25 ? '#ffcc00' : '#ff3344');
        ctx.fillStyle = shieldColor;
        ctx.fillRect(12, 12, 100 * shieldPct, 10);

        ctx.fillStyle = '#00ff66';
        ctx.font = '8px monospace';
        ctx.fillText('SHIELD', 12, 10);

        // Boost meter
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(10, 28, 104, 10);
        ctx.strokeStyle = '#0088ff';
        ctx.strokeRect(10, 28, 104, 10);
        ctx.fillStyle = '#0088ff';
        ctx.fillRect(12, 30, this.boostMeter, 6);

        ctx.fillStyle = '#0088ff';
        ctx.font = '8px monospace';
        ctx.fillText('BOOST', 12, 27);

        // Score
        ctx.fillStyle = '#ffcc00';
        ctx.font = '12px monospace';
        ctx.fillText(`SCORE: ${this.score}`, this.width - 150, 20);

        // Controls inverted warning
        if (this.controlsInverted) {
            const blink = Math.sin(timestamp * 8) > 0;
            if (blink) {
                ctx.fillStyle = '#ff0044';
                ctx.font = 'bold 12px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('CONTROLS INVERTED', this.width / 2, 50);
                ctx.textAlign = 'left';
            }
        }
    }

    renderHauntOverlay(ctx, timestamp) {
        if (this.hauntStage < 3) return;

        // Perspective distortion warning
        if (this.perspectiveInverted) {
            ctx.fillStyle = `rgba(100,0,50,${0.05 + Math.sin(timestamp * 3) * 0.03})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        // Stage 4: screen tear lines
        if (this.hauntStage >= 4) {
            for (let i = 0; i < 3; i++) {
                if (Math.random() < 0.1) {
                    const y = Math.random() * this.height;
                    const offset = (Math.random() - 0.5) * 20;
                    ctx.drawImage(ctx.canvas, offset, y, this.width, 3, 0, y, this.width, 3);
                }
            }

            // "THERE IS NO ESCAPE FROM VENOM"
            if (Math.random() < 0.006) {
                const msgs = [
                    'THERE IS NO ESCAPE FROM VENOM',
                    'ANDROSS HAS WON',
                    'YOUR FATHER FAILED TOO',
                    'THE LYLAT SYSTEM IS DEAD',
                    'DO A BARREL ROLL INTO OBLIVION'
                ];
                ctx.fillStyle = `rgba(255,0,50,${0.2 + Math.random() * 0.15})`;
                ctx.font = '14px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(msgs[Math.floor(Math.random() * msgs.length)],
                    this.width / 2 + (Math.random() - 0.5) * 40,
                    this.height / 2 + (Math.random() - 0.5) * 60);
                ctx.textAlign = 'left';
            }
        }
    }
}

export default HauntedStarFox;
