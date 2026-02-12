// cursed-super-castlevania.js — Side-scrolling whip action with shifting castle architecture

import { GameBase } from './game-base.js';
import { input, BUTTONS } from '../core/input.js';
import { sfx } from '../audio/sfx.js';
import state from '../core/state.js';
import { events, EVENTS } from '../core/events.js';

// Cross-game bleed scenes that appear in castle windows
const WINDOW_SCENES = [
    { label: 'EARTHBOUND', color: '#ff44ff', bgColor: '#220044' },
    { label: 'F-ZERO', color: '#44ffff', bgColor: '#002244' },
    { label: 'MARIO', color: '#ff4444', bgColor: '#0000aa' },
    { label: 'ZELDA', color: '#44ff44', bgColor: '#004400' },
    { label: 'METROID', color: '#ff8800', bgColor: '#000044' },
    { label: 'STREET FIGHTER', color: '#ffff44', bgColor: '#442200' },
    { label: 'STAR FOX', color: '#8888ff', bgColor: '#000022' }
];

// Constants
const GRAVITY = 0.45;
const JUMP_FORCE = -8.5;
const MOVE_SPEED = 2.2;
const WHIP_RANGE = 60;
const WHIP_ARC_DURATION = 300;
const TILE_SIZE = 32;
const PLAYER_W = 16;
const PLAYER_H = 28;

export class CursedSuperCastlevania extends GameBase {
    constructor() {
        super({
            id: 'castlevania',
            name: 'CURSED CASTLEVANIA',
            channel: 9,
            titleColor: '#cc2222',
            bgColor: '#0a0000',
            titleText: 'CURSED CASTLEVANIA'
        });

        // Player state
        this.player = {
            x: 80, y: 300, vx: 0, vy: 0,
            w: PLAYER_W, h: PLAYER_H,
            grounded: false, dir: 1, // 1=right, -1=left
            frame: 0, animTimer: 0,
            invincible: 0,
            onStairs: false, stairDir: 0
        };

        // Whip state
        this.whip = {
            active: false, timer: 0, dir: 1,
            length: WHIP_RANGE, segments: [],
            hitEnemies: new Set()
        };
        this.whipGrowth = 0; // Corruption: whip grows infinitely

        // Camera
        this.cameraX = 0;
        this.levelWidth = 2400;
        this.levelHeight = 448;

        // Level geometry
        this.platforms = [];
        this.candles = [];
        this.stairs = [];
        this.windows = [];
        this.movingPlatforms = [];

        // Enemies
        this.enemies = [];
        this.enemySpawnTimer = 0;
        this.maxEnemies = 8;

        // Pickups
        this.pickups = [];

        // Parallax layers
        this.bgLayers = [];

        // Architecture shift corruption
        this.architectureShiftTimer = 0;
        this.architecturePhase = 0;
        this.castleRebuildFlash = 0;

        // Window scene corruption
        this.windowSceneTimer = 0;
        this.activeWindowScenes = [];

        // Candle relight corruption
        this.relightTimer = 0;

        // Visual
        this.deathAnimTimer = 0;
        this.screenFlash = 0;
        this.ambientFlicker = 0;
    }

    onInit() {
        this.generateLevel();
        this.initParallaxLayers();
    }

    generateLevel() {
        this.platforms = [];
        this.candles = [];
        this.stairs = [];
        this.windows = [];
        this.movingPlatforms = [];

        // Ground floor
        for (let x = 0; x < this.levelWidth; x += TILE_SIZE) {
            // Gaps in the floor
            if ((x > 400 && x < 464) || (x > 900 && x < 964) || (x > 1500 && x < 1564)) continue;
            this.platforms.push({ x, y: this.levelHeight - TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE, type: 'stone' });
        }

        // Raised platform sections
        const sections = [
            { sx: 160, sy: 320, count: 4 },
            { sx: 480, sy: 280, count: 3 },
            { sx: 700, sy: 240, count: 5 },
            { sx: 960, sy: 300, count: 3 },
            { sx: 1100, sy: 200, count: 6 },
            { sx: 1400, sy: 260, count: 4 },
            { sx: 1650, sy: 180, count: 5 },
            { sx: 1900, sy: 300, count: 3 },
            { sx: 2050, sy: 220, count: 4 },
            { sx: 2200, sy: 340, count: 3 }
        ];

        for (const sec of sections) {
            for (let i = 0; i < sec.count; i++) {
                this.platforms.push({
                    x: sec.sx + i * TILE_SIZE, y: sec.sy,
                    w: TILE_SIZE, h: TILE_SIZE, type: 'stone'
                });
            }
        }

        // Ceiling blocks for atmosphere
        for (let x = 0; x < this.levelWidth; x += TILE_SIZE) {
            if (Math.random() < 0.7) {
                this.platforms.push({ x, y: 0, w: TILE_SIZE, h: TILE_SIZE, type: 'ceiling' });
            }
        }

        // Wall columns
        const wallPositions = [0, 300, 600, 1000, 1300, 1700, 2000, 2350];
        for (const wx of wallPositions) {
            for (let wy = 0; wy < this.levelHeight; wy += TILE_SIZE) {
                if (Math.random() < 0.3) continue;
                this.platforms.push({ x: wx, y: wy, w: TILE_SIZE, h: TILE_SIZE, type: 'wall' });
            }
        }

        // Candles (drop items when whipped)
        const candlePositions = [
            120, 220, 350, 520, 650, 780, 880, 1050, 1180, 1320,
            1450, 1580, 1720, 1850, 2000, 2120, 2250
        ];
        for (const cx of candlePositions) {
            const candleY = 180 + Math.floor((cx * 17) % 200);
            this.candles.push({
                x: cx, y: candleY, lit: true, respawnTimer: 0,
                dropType: Math.random() < 0.4 ? 'heart' : (Math.random() < 0.5 ? 'whipUp' : 'money')
            });
        }

        // Stairs
        this.stairs = [
            { x: 260, y: 320, w: 64, h: 96, dir: 1 }, // going up-right
            { x: 750, y: 240, w: 64, h: 96, dir: -1 },
            { x: 1200, y: 200, w: 64, h: 128, dir: 1 },
            { x: 1750, y: 180, w: 64, h: 100, dir: -1 }
        ];

        // Windows (for cross-game bleed)
        for (let wx = 100; wx < this.levelWidth; wx += 250 + Math.floor(Math.random() * 150)) {
            const wy = 60 + Math.floor(Math.random() * 150);
            this.windows.push({
                x: wx, y: wy, w: 28, h: 40,
                scene: null, sceneTimer: 0, glowing: false
            });
        }

        // Moving platforms
        this.movingPlatforms = [
            { x: 430, y: 350, w: 48, h: 12, baseX: 430, range: 80, speed: 0.8, phase: 0 },
            { x: 930, y: 280, w: 48, h: 12, baseX: 930, range: 60, speed: 1.0, phase: Math.PI },
            { x: 1530, y: 320, w: 48, h: 12, baseX: 1530, range: 100, speed: 0.6, phase: Math.PI / 2 }
        ];
    }

    initParallaxLayers() {
        this.bgLayers = [
            { speed: 0.05, color: '#0a0000', elements: 'sky' },
            { speed: 0.1, color: '#120000', elements: 'mountains' },
            { speed: 0.2, color: '#1a0808', elements: 'castle_far' },
            { speed: 0.35, color: '#221010', elements: 'castle_near' }
        ];
    }

    onStart() {
        this.player.x = 80;
        this.player.y = 300;
        this.player.vx = 0;
        this.player.vy = 0;
        this.cameraX = 0;
        this.spawnEnemies();
    }

    onStop() {
        this.enemies = [];
    }

    onRestart() {
        this.player.x = 80;
        this.player.y = 300;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.invincible = 0;
        this.whip.active = false;
        this.whipGrowth = 0;
        this.cameraX = 0;
        this.enemies = [];
        this.pickups = [];
        this.architectureShiftTimer = 0;
        this.castleRebuildFlash = 0;
        this.generateLevel();
        this.spawnEnemies();
    }

    onDeath() {
        this.player.x = Math.max(80, this.cameraX + 80);
        this.player.y = 300;
        this.player.vy = 0;
        this.player.invincible = 1500;
        this.deathAnimTimer = 500;
    }

    onTitleDismiss() {
        sfx.play('confirm');
    }

    spawnEnemies() {
        this.enemies = [];
        // Spawn skeletons and bats throughout the level
        for (let ex = 300; ex < this.levelWidth; ex += 200 + Math.floor(Math.random() * 200)) {
            const type = Math.random() < 0.5 ? 'skeleton' : 'bat';
            const ey = type === 'bat' ? 100 + Math.random() * 150 : this.levelHeight - TILE_SIZE - 24;
            this.enemies.push(this.createEnemy(type, ex, ey));
        }
    }

    createEnemy(type, x, y) {
        if (type === 'skeleton') {
            return {
                type: 'skeleton', x, y, w: 16, h: 24,
                vx: 0, vy: 0, hp: 3, dir: -1,
                frame: 0, animTimer: 0, moveTimer: 0,
                patrolLeft: x - 60, patrolRight: x + 60,
                attackTimer: 0, throwing: false, alive: true
            };
        }
        return {
            type: 'bat', x, y, w: 16, h: 12,
            vx: 0, vy: 0, hp: 1, dir: -1,
            frame: 0, animTimer: 0,
            baseY: y, swoopTimer: 0, swooping: false, alive: true,
            phaseOffset: Math.random() * Math.PI * 2
        };
    }

    // --- UPDATE ---

    onUpdate(dt, timestamp) {
        this.updateTimers(dt);

        // Decay timers
        if (this.player.invincible > 0) this.player.invincible -= dt;
        if (this.screenFlash > 0) this.screenFlash -= dt;
        if (this.deathAnimTimer > 0) this.deathAnimTimer -= dt;
        if (this.castleRebuildFlash > 0) this.castleRebuildFlash -= dt;

        this.updatePlayer(dt, timestamp);
        this.updateWhip(dt, timestamp);
        this.updateMovingPlatforms(dt, timestamp);
        this.updateEnemies(dt, timestamp);
        this.updatePickups(dt);
        this.updateCandles(dt);
        this.updateCamera();
        this.updateCorruption(dt, timestamp);

        // Ambient flicker for atmosphere
        this.ambientFlicker = 0.85 + Math.sin(timestamp * 0.01) * 0.05 + Math.random() * 0.1;
    }

    updatePlayer(dt, timestamp) {
        const dpad = input.getDPad();

        // Horizontal movement
        if (!this.whip.active || this.hauntStage >= 2) { // at stage>=2 can move while whipping
            this.player.vx = dpad.x * MOVE_SPEED;
            if (dpad.x !== 0) {
                this.player.dir = dpad.x > 0 ? 1 : -1;
                this.player.animTimer += dt;
                if (this.player.animTimer > 150) {
                    this.player.frame = (this.player.frame + 1) % 4;
                    this.player.animTimer = 0;
                }
            }
        } else {
            this.player.vx = 0;
        }

        // Jump
        if (input.isJustPressed(BUTTONS.A) && this.player.grounded) {
            this.player.vy = JUMP_FORCE;
            this.player.grounded = false;
            sfx.play('jump');
        }

        // Whip attack
        if (input.isJustPressed(BUTTONS.B) && !this.whip.active) {
            this.startWhip();
        }

        // Apply gravity
        if (!this.player.grounded) {
            this.player.vy += GRAVITY;
            if (this.player.vy > 12) this.player.vy = 12;
        }

        // Move X
        const newX = this.player.x + this.player.vx;
        let collidedX = false;
        for (const p of this.platforms) {
            if (p.type === 'ceiling') continue;
            if (this.rectOverlap(newX, this.player.y, this.player.w, this.player.h, p.x, p.y, p.w, p.h)) {
                collidedX = true;
                break;
            }
        }
        if (!collidedX) {
            this.player.x = Math.max(0, Math.min(this.levelWidth - this.player.w, newX));
        }

        // Move Y
        const newY = this.player.y + this.player.vy;
        let collidedY = false;
        this.player.grounded = false;

        for (const p of this.platforms) {
            if (p.type === 'ceiling') {
                // Ceiling collision only from below
                if (this.player.vy < 0 && this.rectOverlap(this.player.x, newY, this.player.w, this.player.h, p.x, p.y, p.w, p.h)) {
                    this.player.vy = 0;
                    collidedY = true;
                }
                continue;
            }
            if (this.rectOverlap(this.player.x, newY, this.player.w, this.player.h, p.x, p.y, p.w, p.h)) {
                if (this.player.vy > 0) {
                    // Landing
                    this.player.y = p.y - this.player.h;
                    this.player.vy = 0;
                    this.player.grounded = true;
                } else if (this.player.vy < 0) {
                    // Hit ceiling
                    this.player.vy = 0;
                }
                collidedY = true;
            }
        }

        // Moving platform collision
        for (const mp of this.movingPlatforms) {
            if (this.rectOverlap(this.player.x, newY, this.player.w, this.player.h, mp.x, mp.y, mp.w, mp.h)) {
                if (this.player.vy > 0 && this.player.y + this.player.h <= mp.y + 4) {
                    this.player.y = mp.y - this.player.h;
                    this.player.vy = 0;
                    this.player.grounded = true;
                    collidedY = true;
                }
            }
        }

        if (!collidedY) {
            this.player.y = newY;
        }

        // Pit death
        if (this.player.y > this.levelHeight + 50) {
            this.die();
        }
    }

    startWhip() {
        this.whip.active = true;
        this.whip.timer = 0;
        this.whip.dir = this.player.dir;
        this.whip.hitEnemies.clear();

        // Corruption: whip grows infinitely at stage >= 3
        const currentRange = WHIP_RANGE + this.whipGrowth;
        this.whip.length = currentRange;

        // Generate whip segments for arc animation
        this.whip.segments = [];
        const numSegments = Math.max(6, Math.floor(currentRange / 8));
        for (let i = 0; i < numSegments; i++) {
            this.whip.segments.push({ x: 0, y: 0, angle: 0 });
        }

        sfx.play('whip');

        if (this.hauntStage >= 3) {
            this.whipGrowth += 4;
        }
    }

    updateWhip(dt, timestamp) {
        if (!this.whip.active) return;

        this.whip.timer += dt;
        const progress = this.whip.timer / WHIP_ARC_DURATION;

        if (progress >= 1) {
            this.whip.active = false;
            return;
        }

        // Calculate whip arc
        const baseX = this.player.x + this.player.w / 2;
        const baseY = this.player.y + 6;
        const dir = this.whip.dir;
        const arcAngle = -Math.PI / 2 + progress * Math.PI; // swing from up to forward

        for (let i = 0; i < this.whip.segments.length; i++) {
            const t = i / this.whip.segments.length;
            const segDist = t * this.whip.length;
            const segAngle = arcAngle * (1 - t * 0.3); // slight drag on tip
            const wave = Math.sin(t * Math.PI * 3 + timestamp * 0.02) * 3 * t;

            this.whip.segments[i].x = baseX + dir * Math.cos(segAngle) * segDist;
            this.whip.segments[i].y = baseY + Math.sin(segAngle) * segDist + wave;
        }

        // Check whip-enemy collision (tip region)
        const tipX = this.whip.segments[this.whip.segments.length - 1].x;
        const tipY = this.whip.segments[this.whip.segments.length - 1].y;
        const tipRadius = 12 + this.whipGrowth * 0.2;

        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;
            if (this.whip.hitEnemies.has(enemy)) continue;
            const dist = Math.hypot(enemy.x + enemy.w / 2 - tipX, enemy.y + enemy.h / 2 - tipY);
            if (dist < tipRadius + enemy.w / 2) {
                this.hitEnemy(enemy);
                this.whip.hitEnemies.add(enemy);
            }
        }

        // Check whip-candle collision
        for (const candle of this.candles) {
            if (!candle.lit) continue;
            const dist = Math.hypot(candle.x - tipX, candle.y - tipY);
            if (dist < 16) {
                this.breakCandle(candle);
            }
        }
    }

    hitEnemy(enemy) {
        enemy.hp--;
        if (enemy.hp <= 0) {
            enemy.alive = false;
            this.addScore(100);
            sfx.play('hit');
            this.screenFlash = 80;
            // Drop chance
            if (Math.random() < 0.3) {
                this.pickups.push({ x: enemy.x, y: enemy.y, type: 'heart', timer: 5000 });
            }
        } else {
            sfx.play('hit');
            enemy.x += this.whip.dir * 10; // knockback
        }
    }

    breakCandle(candle) {
        candle.lit = false;
        candle.respawnTimer = 0;
        sfx.play('hit');
        // Drop item
        this.pickups.push({ x: candle.x, y: candle.y, type: candle.dropType, timer: 6000, vy: -3 });
    }

    updateMovingPlatforms(dt, timestamp) {
        for (const mp of this.movingPlatforms) {
            mp.phase += mp.speed * dt * 0.003;
            mp.x = mp.baseX + Math.sin(mp.phase) * mp.range;
        }
    }

    updateEnemies(dt, timestamp) {
        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;

            if (enemy.type === 'skeleton') {
                this.updateSkeleton(enemy, dt, timestamp);
            } else if (enemy.type === 'bat') {
                this.updateBat(enemy, dt, timestamp);
            }

            // Collision with player
            if (this.player.invincible <= 0 &&
                this.rectOverlap(this.player.x, this.player.y, this.player.w, this.player.h,
                                 enemy.x, enemy.y, enemy.w, enemy.h)) {
                this.playerHit();
            }
        }

        // Respawn enemies that scroll off too far
        this.enemySpawnTimer += dt;
        if (this.enemySpawnTimer > 3000) {
            this.enemySpawnTimer = 0;
            const aliveCount = this.enemies.filter(e => e.alive).length;
            if (aliveCount < this.maxEnemies) {
                const spawnX = this.cameraX + this.width + 50 + Math.random() * 100;
                if (spawnX < this.levelWidth - 50) {
                    const type = Math.random() < 0.5 ? 'skeleton' : 'bat';
                    const ey = type === 'bat' ? 80 + Math.random() * 150 : this.levelHeight - TILE_SIZE - 24;
                    this.enemies.push(this.createEnemy(type, spawnX, ey));
                }
            }
        }
    }

    updateSkeleton(sk, dt, timestamp) {
        sk.moveTimer += dt;
        sk.animTimer += dt;
        if (sk.animTimer > 200) {
            sk.frame = (sk.frame + 1) % 4;
            sk.animTimer = 0;
        }

        // Patrol between bounds
        sk.x += sk.dir * 0.8;
        if (sk.x <= sk.patrolLeft) sk.dir = 1;
        if (sk.x >= sk.patrolRight) sk.dir = -1;

        // Gravity
        sk.vy = (sk.vy || 0) + GRAVITY * 0.5;
        const newSkY = sk.y + sk.vy;
        let skGrounded = false;
        for (const p of this.platforms) {
            if (p.type === 'ceiling') continue;
            if (this.rectOverlap(sk.x, newSkY, sk.w, sk.h, p.x, p.y, p.w, p.h)) {
                if (sk.vy >= 0) {
                    sk.y = p.y - sk.h;
                    sk.vy = 0;
                    skGrounded = true;
                }
            }
        }
        if (!skGrounded) sk.y = newSkY;

        // Turn to face player if close
        const distToPlayer = this.player.x - sk.x;
        if (Math.abs(distToPlayer) < 150) {
            sk.dir = distToPlayer > 0 ? 1 : -1;
        }
    }

    updateBat(bat, dt, timestamp) {
        bat.animTimer += dt;
        if (bat.animTimer > 100) {
            bat.frame = (bat.frame + 1) % 2;
            bat.animTimer = 0;
        }

        // Sine wave flight pattern
        const distToPlayer = Math.hypot(this.player.x - bat.x, this.player.y - bat.y);
        bat.swoopTimer += dt;

        if (distToPlayer < 180 && !bat.swooping) {
            bat.swooping = true;
            bat.swoopTimer = 0;
        }

        if (bat.swooping) {
            // Dive toward player
            const angle = Math.atan2(this.player.y - bat.y, this.player.x - bat.x);
            bat.x += Math.cos(angle) * 2.5;
            bat.y += Math.sin(angle) * 2.5;

            if (bat.swoopTimer > 2000 || distToPlayer > 300) {
                bat.swooping = false;
                bat.swoopTimer = 0;
            }
        } else {
            // Idle floating
            bat.x += bat.dir * 0.5;
            bat.y = bat.baseY + Math.sin(timestamp * 0.003 + bat.phaseOffset) * 20;

            // Random direction change
            if (Math.random() < 0.005) bat.dir *= -1;
        }
    }

    playerHit() {
        if (this.player.invincible > 0) return;
        this.player.invincible = 1200;
        this.player.vy = -4;
        this.screenFlash = 150;
        sfx.play('damage');
        this.die();
    }

    updatePickups(dt) {
        for (let i = this.pickups.length - 1; i >= 0; i--) {
            const p = this.pickups[i];
            p.timer -= dt;
            if (p.vy !== undefined) {
                p.vy += 0.2;
                p.y += p.vy;
                // Ground stop
                if (p.y > this.levelHeight - TILE_SIZE - 8) {
                    p.y = this.levelHeight - TILE_SIZE - 8;
                    p.vy = 0;
                }
            }
            if (p.timer <= 0) {
                this.pickups.splice(i, 1);
                continue;
            }

            // Player collection
            if (this.rectOverlap(this.player.x, this.player.y, this.player.w, this.player.h,
                                 p.x - 8, p.y - 8, 16, 16)) {
                if (p.type === 'heart') {
                    this.addScore(50);
                    sfx.play('coin');
                } else if (p.type === 'whipUp') {
                    this.whipGrowth += 15;
                    sfx.play('powerUp');
                } else if (p.type === 'money') {
                    this.addScore(200);
                    sfx.play('coin');
                }
                this.pickups.splice(i, 1);
            }
        }
    }

    updateCandles(dt) {
        for (const candle of this.candles) {
            if (!candle.lit) {
                candle.respawnTimer += dt;
                // Corruption: candles relight themselves at stage >= 2
                if (this.hauntStage >= 2 && candle.respawnTimer > 3000 + Math.random() * 2000) {
                    candle.lit = true;
                    candle.respawnTimer = 0;
                }
            }
        }
    }

    updateCamera() {
        const targetX = this.player.x - this.width / 3;
        this.cameraX += (targetX - this.cameraX) * 0.08;
        this.cameraX = Math.max(0, Math.min(this.levelWidth - this.width, this.cameraX));
    }

    updateCorruption(dt, timestamp) {
        // Architecture shift at stage >= 2
        if (this.hauntStage >= 2) {
            this.architectureShiftTimer += dt;
            if (this.architectureShiftTimer > 8000 + Math.random() * 5000) {
                this.architectureShiftTimer = 0;
                this.shiftArchitecture();
            }
        }

        // Window scenes from other games at stage >= 2
        if (this.hauntStage >= 2) {
            this.windowSceneTimer += dt;
            if (this.windowSceneTimer > 4000) {
                this.windowSceneTimer = 0;
                const window = this.windows[Math.floor(Math.random() * this.windows.length)];
                if (window) {
                    window.scene = WINDOW_SCENES[Math.floor(Math.random() * WINDOW_SCENES.length)];
                    window.sceneTimer = 3000 + Math.random() * 4000;
                    window.glowing = true;
                    events.emit(EVENTS.CROSS_GAME_BLEED, {
                        source: this.id,
                        text: window.scene.label,
                        color: window.scene.color
                    });
                }
            }
        }

        // Decay window scenes
        for (const w of this.windows) {
            if (w.scene) {
                w.sceneTimer -= dt;
                if (w.sceneTimer <= 0) {
                    w.scene = null;
                    w.glowing = false;
                }
            }
        }
    }

    shiftArchitecture() {
        this.castleRebuildFlash = 400;
        sfx.play('glitch');
        this.architecturePhase++;

        // Shift some platforms
        const shiftCount = 3 + Math.floor(this.hauntStage * 2);
        for (let i = 0; i < shiftCount; i++) {
            const idx = Math.floor(Math.random() * this.platforms.length);
            const p = this.platforms[idx];
            if (p.type === 'stone' && p.y < this.levelHeight - TILE_SIZE) {
                p.y += (Math.random() - 0.5) * TILE_SIZE * 2;
                p.x += (Math.random() - 0.5) * TILE_SIZE;
                p.y = Math.max(TILE_SIZE, Math.min(this.levelHeight - TILE_SIZE * 2, p.y));
            }
        }

        // At stage 3+, more dramatic shifts
        if (this.hauntStage >= 3) {
            // Add new random platforms
            for (let i = 0; i < 3; i++) {
                this.platforms.push({
                    x: this.cameraX + Math.random() * this.width,
                    y: 100 + Math.random() * 300,
                    w: TILE_SIZE, h: TILE_SIZE, type: 'stone'
                });
            }
        }
    }

    // --- RENDERING ---

    onRender(ctx, dt, timestamp) {
        // Dark castle background
        this.renderParallaxBackground(ctx, timestamp);

        ctx.save();
        ctx.translate(-Math.floor(this.cameraX), 0);

        // Apply ambient flicker
        ctx.globalAlpha = this.ambientFlicker;

        // Castle rebuild flash
        if (this.castleRebuildFlash > 0) {
            const flashAlpha = this.castleRebuildFlash / 400;
            ctx.fillStyle = `rgba(255,255,255,${flashAlpha * 0.3})`;
            ctx.fillRect(this.cameraX, 0, this.width, this.height);
        }

        // Platforms (stone blocks)
        this.renderPlatforms(ctx, timestamp);

        // Windows
        this.renderWindows(ctx, timestamp);

        // Stairs
        this.renderStairs(ctx);

        // Moving platforms
        this.renderMovingPlatforms(ctx, timestamp);

        // Candles
        this.renderCandles(ctx, timestamp);

        // Pickups
        this.renderPickups(ctx, timestamp);

        // Enemies
        this.renderEnemies(ctx, timestamp);

        // Player
        this.renderPlayerChar(ctx, timestamp);

        // Whip
        if (this.whip.active) {
            this.renderWhip(ctx, timestamp);
        }

        ctx.globalAlpha = 1;
        ctx.restore();

        // Screen flash overlay
        if (this.screenFlash > 0) {
            ctx.fillStyle = `rgba(255,255,255,${this.screenFlash / 300})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        // Corruption: whip length indicator at stage >= 3
        if (this.hauntStage >= 3 && this.whipGrowth > 30) {
            ctx.fillStyle = 'rgba(255,0,0,0.3)';
            ctx.font = '8px monospace';
            ctx.fillText(`WHIP: ${Math.floor(WHIP_RANGE + this.whipGrowth)}px`, this.width - 100, 20);
        }
    }

    renderParallaxBackground(ctx, timestamp) {
        // Layer 0: Sky
        const grad = ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, '#0a0008');
        grad.addColorStop(0.4, '#150010');
        grad.addColorStop(1, '#0a0000');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);

        // Stars (red-tinted)
        for (let i = 0; i < 30; i++) {
            const seed = i * 7919;
            const sx = ((seed * 13) % this.width + this.cameraX * 0.03 + this.width * 10) % this.width;
            const sy = seed * 17 % 180;
            const twinkle = Math.sin(timestamp * 0.002 + seed) * 0.3 + 0.7;
            ctx.globalAlpha = twinkle;
            ctx.fillStyle = this.hauntStage >= 3 ? '#ff4444' : '#aa8888';
            ctx.fillRect(Math.floor(sx), sy, 1, 1);
        }
        ctx.globalAlpha = 1;

        // Layer 1: Distant mountains / castle silhouette
        ctx.fillStyle = '#120808';
        ctx.beginPath();
        ctx.moveTo(0, this.height);
        const mtOffset = this.cameraX * 0.1;
        for (let x = 0; x <= this.width; x += 40) {
            const seed = Math.floor((x + mtOffset) / 40) * 3571;
            const peakH = 120 + (seed % 80);
            const midH = 160 + (seed * 3 % 40);
            if (x % 80 === 0) {
                ctx.lineTo(x, this.height - peakH);
            } else {
                ctx.lineTo(x, this.height - midH);
            }
        }
        ctx.lineTo(this.width, this.height);
        ctx.closePath();
        ctx.fill();

        // Layer 2: Far castle towers
        ctx.fillStyle = '#1a0a0a';
        const towerOffset = this.cameraX * 0.15;
        for (let i = 0; i < 6; i++) {
            const tx = i * 120 - (towerOffset % 120) - 30;
            const seed = Math.floor((towerOffset / 120 + i)) * 2713;
            const th = 100 + (seed % 100);
            ctx.fillRect(tx, this.height - th, 30, th);
            // Battlement
            ctx.fillRect(tx - 5, this.height - th - 8, 40, 8);
            for (let b = 0; b < 4; b++) {
                ctx.fillRect(tx - 5 + b * 10, this.height - th - 16, 6, 8);
            }
        }

        // Layer 3: Near castle wall
        ctx.fillStyle = '#221010';
        const wallOffset = this.cameraX * 0.3;
        ctx.fillRect(0, this.height - 80, this.width, 80);
        for (let x = 0; x < this.width; x += 50) {
            const wx = x - (wallOffset % 50);
            ctx.fillRect(wx, this.height - 90, 35, 10);
        }

        // Moon
        ctx.fillStyle = this.hauntStage >= 3 ? '#880000' : '#ddccaa';
        ctx.beginPath();
        ctx.arc(this.width - 80 + this.cameraX * 0.02, 50, 25, 0, Math.PI * 2);
        ctx.fill();
    }

    renderPlatforms(ctx, timestamp) {
        for (const p of this.platforms) {
            // Cull off-screen
            if (p.x + p.w < this.cameraX - 20 || p.x > this.cameraX + this.width + 20) continue;

            if (p.type === 'ceiling') {
                ctx.fillStyle = '#2a1a1a';
                ctx.fillRect(p.x, p.y, p.w, p.h);
                // Stalactite detail
                ctx.fillStyle = '#3a2a2a';
                ctx.beginPath();
                ctx.moveTo(p.x, p.y + p.h);
                ctx.lineTo(p.x + p.w / 2, p.y + p.h + 6);
                ctx.lineTo(p.x + p.w, p.y + p.h);
                ctx.fill();
            } else if (p.type === 'wall') {
                ctx.fillStyle = '#2a2a2a';
                ctx.fillRect(p.x, p.y, p.w, p.h);
                ctx.strokeStyle = '#1a1a1a';
                ctx.lineWidth = 1;
                ctx.strokeRect(p.x, p.y, p.w, p.h);
            } else {
                // Stone block
                ctx.fillStyle = '#555555';
                ctx.fillRect(p.x, p.y, p.w, p.h);
                // Brick pattern
                ctx.strokeStyle = '#444444';
                ctx.lineWidth = 1;
                ctx.strokeRect(p.x, p.y, p.w, p.h);
                ctx.beginPath();
                ctx.moveTo(p.x + p.w / 2, p.y);
                ctx.lineTo(p.x + p.w / 2, p.y + p.h / 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(p.x, p.y + p.h / 2);
                ctx.lineTo(p.x + p.w, p.y + p.h / 2);
                ctx.stroke();
                // Highlight
                ctx.fillStyle = '#666666';
                ctx.fillRect(p.x + 1, p.y + 1, p.w - 2, 2);
            }

            // Corruption: architecture glitch visual
            if (this.hauntStage >= 2 && Math.random() < 0.003) {
                ctx.fillStyle = 'rgba(100,0,0,0.3)';
                ctx.fillRect(p.x, p.y, p.w, p.h);
            }
        }
    }

    renderWindows(ctx, timestamp) {
        for (const w of this.windows) {
            if (w.x < this.cameraX - 40 || w.x > this.cameraX + this.width + 40) continue;

            // Window frame
            ctx.fillStyle = '#1a1a2a';
            ctx.fillRect(w.x - 2, w.y - 2, w.w + 4, w.h + 4);

            if (w.scene && this.hauntStage >= 2) {
                // Cross-game bleed: show scene from another game
                ctx.fillStyle = w.scene.bgColor;
                ctx.fillRect(w.x, w.y, w.w, w.h);
                ctx.fillStyle = w.scene.color;
                ctx.font = '6px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(w.scene.label, w.x + w.w / 2, w.y + w.h / 2 + 2);
                ctx.textAlign = 'left';

                // Glowing border
                if (w.glowing) {
                    ctx.strokeStyle = w.scene.color;
                    ctx.lineWidth = 1;
                    ctx.globalAlpha = 0.5 + Math.sin(timestamp * 0.005) * 0.3;
                    ctx.strokeRect(w.x - 3, w.y - 3, w.w + 6, w.h + 6);
                    ctx.globalAlpha = this.ambientFlicker;
                }
            } else {
                // Normal dark window
                ctx.fillStyle = '#0a0a1a';
                ctx.fillRect(w.x, w.y, w.w, w.h);
                // Moonlight reflection
                ctx.fillStyle = 'rgba(100,80,60,0.1)';
                ctx.fillRect(w.x + 2, w.y + 2, w.w / 2 - 2, w.h / 2 - 2);
            }

            // Window cross
            ctx.fillStyle = '#333';
            ctx.fillRect(w.x + w.w / 2 - 1, w.y, 2, w.h);
            ctx.fillRect(w.x, w.y + w.h / 2 - 1, w.w, 2);
        }
    }

    renderStairs(ctx) {
        for (const s of this.stairs) {
            if (s.x + s.w < this.cameraX || s.x > this.cameraX + this.width) continue;
            ctx.fillStyle = '#665544';
            const steps = Math.floor(s.h / 12);
            for (let i = 0; i < steps; i++) {
                const stepX = s.dir === 1 ? s.x + i * (s.w / steps) : s.x + s.w - i * (s.w / steps) - s.w / steps;
                const stepY = s.y + s.h - i * 12 - 12;
                ctx.fillRect(stepX, stepY, s.w / steps, 12);
                ctx.strokeStyle = '#554433';
                ctx.lineWidth = 1;
                ctx.strokeRect(stepX, stepY, s.w / steps, 12);
            }
        }
    }

    renderMovingPlatforms(ctx, timestamp) {
        for (const mp of this.movingPlatforms) {
            if (mp.x + mp.w < this.cameraX || mp.x > this.cameraX + this.width) continue;
            ctx.fillStyle = '#777766';
            ctx.fillRect(mp.x, mp.y, mp.w, mp.h);
            ctx.strokeStyle = '#999988';
            ctx.lineWidth = 1;
            ctx.strokeRect(mp.x, mp.y, mp.w, mp.h);
            // Chain visual
            ctx.strokeStyle = '#555544';
            ctx.beginPath();
            ctx.moveTo(mp.x + mp.w / 2, mp.y);
            ctx.lineTo(mp.x + mp.w / 2, 0);
            ctx.stroke();
        }
    }

    renderCandles(ctx, timestamp) {
        for (const candle of this.candles) {
            if (candle.x < this.cameraX - 20 || candle.x > this.cameraX + this.width + 20) continue;

            if (candle.lit) {
                // Candle holder
                ctx.fillStyle = '#886644';
                ctx.fillRect(candle.x - 3, candle.y, 6, 12);
                // Candle body
                ctx.fillStyle = '#ccbb88';
                ctx.fillRect(candle.x - 2, candle.y - 8, 4, 8);
                // Flame
                const flicker = Math.sin(timestamp * 0.02 + candle.x) * 2;
                ctx.fillStyle = '#ffaa00';
                ctx.beginPath();
                ctx.ellipse(candle.x, candle.y - 11 + flicker, 3, 5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffff44';
                ctx.beginPath();
                ctx.ellipse(candle.x, candle.y - 12 + flicker, 1.5, 3, 0, 0, Math.PI * 2);
                ctx.fill();

                // Light glow
                ctx.globalAlpha = 0.1 + Math.sin(timestamp * 0.015 + candle.x) * 0.05;
                const glowGrad = ctx.createRadialGradient(candle.x, candle.y - 8, 0, candle.x, candle.y - 8, 40);
                glowGrad.addColorStop(0, 'rgba(255,170,0,0.3)');
                glowGrad.addColorStop(1, 'rgba(255,170,0,0)');
                ctx.fillStyle = glowGrad;
                ctx.beginPath();
                ctx.arc(candle.x, candle.y - 8, 40, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = this.ambientFlicker;

                // Corruption: relit candles have red flame
                if (this.hauntStage >= 2 && candle.respawnTimer === 0 && Math.random() < 0.01) {
                    // Candle was relit by corruption - brief red flicker
                    ctx.fillStyle = 'rgba(255,0,0,0.3)';
                    ctx.beginPath();
                    ctx.arc(candle.x, candle.y - 10, 6, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else {
                // Broken candle
                ctx.fillStyle = '#665533';
                ctx.fillRect(candle.x - 3, candle.y, 6, 12);
                ctx.fillStyle = '#887755';
                ctx.fillRect(candle.x - 1, candle.y + 2, 2, 4);
            }
        }
    }

    renderPickups(ctx, timestamp) {
        for (const p of this.pickups) {
            if (p.x < this.cameraX - 20 || p.x > this.cameraX + this.width + 20) continue;
            const bob = Math.sin(timestamp * 0.005 + p.x) * 3;

            if (p.type === 'heart') {
                ctx.fillStyle = '#ff4444';
                // Simple heart shape
                ctx.beginPath();
                ctx.arc(p.x - 3, p.y + bob - 3, 4, 0, Math.PI * 2);
                ctx.arc(p.x + 3, p.y + bob - 3, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(p.x - 7, p.y + bob - 2);
                ctx.lineTo(p.x, p.y + bob + 6);
                ctx.lineTo(p.x + 7, p.y + bob - 2);
                ctx.fill();
            } else if (p.type === 'whipUp') {
                ctx.fillStyle = '#ffaa00';
                ctx.fillRect(p.x - 2, p.y + bob - 6, 4, 12);
                ctx.fillStyle = '#ffcc44';
                ctx.fillRect(p.x - 4, p.y + bob - 8, 8, 4);
            } else if (p.type === 'money') {
                ctx.fillStyle = '#ffdd00';
                ctx.beginPath();
                ctx.arc(p.x, p.y + bob, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ccaa00';
                ctx.font = '8px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('$', p.x, p.y + bob + 3);
                ctx.textAlign = 'left';
            }
        }
    }

    renderEnemies(ctx, timestamp) {
        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;
            if (enemy.x + enemy.w < this.cameraX - 20 || enemy.x > this.cameraX + this.width + 20) continue;

            if (enemy.type === 'skeleton') {
                this.renderSkeleton(ctx, enemy, timestamp);
            } else if (enemy.type === 'bat') {
                this.renderBat(ctx, enemy, timestamp);
            }
        }
    }

    renderSkeleton(ctx, sk, timestamp) {
        const flip = sk.dir;
        // Body
        ctx.fillStyle = '#ccccaa';
        ctx.fillRect(sk.x, sk.y, sk.w, sk.h);
        // Skull
        ctx.fillStyle = '#ddddbb';
        ctx.beginPath();
        ctx.arc(sk.x + sk.w / 2, sk.y - 2, 7, 0, Math.PI * 2);
        ctx.fill();
        // Eye sockets
        ctx.fillStyle = this.hauntStage >= 3 ? '#ff0000' : '#220000';
        ctx.fillRect(sk.x + 3, sk.y - 5, 3, 3);
        ctx.fillRect(sk.x + sk.w - 6, sk.y - 5, 3, 3);
        // Ribs
        ctx.strokeStyle = '#aaaaaa';
        ctx.lineWidth = 1;
        for (let r = 0; r < 3; r++) {
            ctx.beginPath();
            ctx.moveTo(sk.x + 2, sk.y + 6 + r * 5);
            ctx.lineTo(sk.x + sk.w - 2, sk.y + 6 + r * 5);
            ctx.stroke();
        }
        // Legs (animated)
        const legOffset = sk.frame % 2 === 0 ? 2 : -2;
        ctx.fillStyle = '#bbbbaa';
        ctx.fillRect(sk.x + 2, sk.y + sk.h, 4, 6 + legOffset);
        ctx.fillRect(sk.x + sk.w - 6, sk.y + sk.h, 4, 6 - legOffset);
    }

    renderBat(ctx, bat, timestamp) {
        const wingAngle = bat.frame === 0 ? 0.3 : -0.3;
        const bx = bat.x + bat.w / 2;
        const by = bat.y + bat.h / 2;

        // Wings
        ctx.fillStyle = this.hauntStage >= 3 ? '#660033' : '#442244';
        // Left wing
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx - 14, by - 6 + wingAngle * 10);
        ctx.lineTo(bx - 10, by + 2);
        ctx.closePath();
        ctx.fill();
        // Right wing
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + 14, by - 6 + wingAngle * 10);
        ctx.lineTo(bx + 10, by + 2);
        ctx.closePath();
        ctx.fill();

        // Body
        ctx.fillStyle = '#553355';
        ctx.beginPath();
        ctx.ellipse(bx, by, 5, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(bx - 3, by - 2, 2, 2);
        ctx.fillRect(bx + 1, by - 2, 2, 2);
    }

    renderPlayerChar(ctx, timestamp) {
        const px = this.player.x;
        const py = this.player.y;

        // Invincibility flash
        if (this.player.invincible > 0 && Math.floor(this.player.invincible / 80) % 2 === 0) {
            ctx.globalAlpha = 0.4;
        }

        const dir = this.player.dir;

        // Legs
        const legAnim = this.player.frame;
        ctx.fillStyle = '#333366';
        const legOff = this.player.grounded ? (legAnim % 2 === 0 ? 2 : -2) : 0;
        ctx.fillRect(px + 2, py + 18, 5, 10 + legOff);
        ctx.fillRect(px + 9, py + 18, 5, 10 - legOff);

        // Body (armor)
        ctx.fillStyle = '#aa4422';
        ctx.fillRect(px, py + 4, PLAYER_W, 16);
        // Chest plate
        ctx.fillStyle = '#884422';
        ctx.fillRect(px + 3, py + 6, 10, 8);

        // Head
        ctx.fillStyle = '#eebb88';
        ctx.beginPath();
        ctx.arc(px + PLAYER_W / 2, py + 2, 7, 0, Math.PI * 2);
        ctx.fill();
        // Hair
        ctx.fillStyle = '#553300';
        ctx.beginPath();
        ctx.arc(px + PLAYER_W / 2, py - 1, 7, Math.PI, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#000';
        const eyeX = dir === 1 ? px + 10 : px + 4;
        ctx.fillRect(eyeX, py + 1, 2, 2);

        // Boots
        ctx.fillStyle = '#664422';
        ctx.fillRect(px + 1, py + PLAYER_H - 4, 6, 4);
        ctx.fillRect(px + PLAYER_W - 7, py + PLAYER_H - 4, 6, 4);

        ctx.globalAlpha = this.ambientFlicker;
    }

    renderWhip(ctx, timestamp) {
        if (this.whip.segments.length < 2) return;

        // Draw whip chain
        ctx.strokeStyle = '#aa8855';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.whip.segments[0].x, this.whip.segments[0].y);
        for (let i = 1; i < this.whip.segments.length; i++) {
            ctx.lineTo(this.whip.segments[i].x, this.whip.segments[i].y);
        }
        ctx.stroke();

        // Whip tip glow
        const tip = this.whip.segments[this.whip.segments.length - 1];
        ctx.fillStyle = '#ffcc44';
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Corruption: infinite whip trail
        if (this.hauntStage >= 3 && this.whipGrowth > 30) {
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = '#ff4400';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(this.whip.segments[0].x, this.whip.segments[0].y);
            for (let i = 1; i < this.whip.segments.length; i++) {
                const noise = (Math.random() - 0.5) * this.whipGrowth * 0.1;
                ctx.lineTo(this.whip.segments[i].x + noise, this.whip.segments[i].y + noise);
            }
            ctx.stroke();
            ctx.globalAlpha = this.ambientFlicker;
        }
    }

    rectOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
    }
}

export default CursedSuperCastlevania;
