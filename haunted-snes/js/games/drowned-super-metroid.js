// drowned-super-metroid.js — Side-view exploration game with rising water corruption

import { GameBase } from './game-base.js';
import { input, BUTTONS } from '../core/input.js';
import { sfx } from '../audio/sfx.js';
import state from '../core/state.js';
import { events, EVENTS } from '../core/events.js';

const TILE = 32;
const GRAVITY = 980;
const JUMP_VEL = -420;
const MOVE_SPEED = 160;
const BULLET_SPEED = 500;
const WATER_RISE_RATE = 4; // pixels per second

// Tile types
const T = { EMPTY: 0, WALL: 1, PLATFORM: 2, DOOR_L: 3, DOOR_R: 4, POWERUP: 5, SPIKE: 6 };

// Enemy types
const ENEMY_TYPES = {
    CRAWLER: { w: 20, h: 16, speed: 40, hp: 2, color: '#8b4513' },
    FLYER:   { w: 16, h: 16, speed: 60, hp: 1, color: '#6a0dad' },
    TURRET:  { w: 24, h: 24, speed: 0,  hp: 3, color: '#c0392b' }
};

const POWERUP_NAMES = ['MISSILES', 'HI-JUMP', 'MORPH BALL', 'VARIA SUIT', 'ICE BEAM'];
const CURSE_NAMES = ['REVERSE CONTROLS', 'SLOW MOVEMENT', 'GRAVITY SHIFT', 'BLIND VISOR', 'PHANTOM SHOTS'];

function seededRandom(seed) {
    let s = seed;
    return function() {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

function generateRoom(roomId, width, height) {
    const cols = Math.floor(width / TILE);
    const rows = Math.floor(height / TILE);
    const rng = seededRandom(roomId * 7919 + 31);
    const grid = [];

    for (let r = 0; r < rows; r++) {
        grid[r] = [];
        for (let c = 0; c < cols; c++) {
            if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
                grid[r][c] = T.WALL;
            } else {
                grid[r][c] = T.EMPTY;
            }
        }
    }

    // Place platforms
    const platformCount = 4 + Math.floor(rng() * 5);
    for (let i = 0; i < platformCount; i++) {
        const px = 2 + Math.floor(rng() * (cols - 6));
        const py = 3 + Math.floor(rng() * (rows - 6));
        const pw = 2 + Math.floor(rng() * 4);
        for (let c = px; c < Math.min(px + pw, cols - 1); c++) {
            if (grid[py][c] === T.EMPTY) {
                grid[py][c] = T.PLATFORM;
            }
        }
    }

    // Place doors (left and right wall openings)
    const doorYL = 2 + Math.floor(rng() * (rows - 5));
    const doorYR = 2 + Math.floor(rng() * (rows - 5));
    grid[doorYL][0] = T.DOOR_L;
    grid[doorYL + 1][0] = T.DOOR_L;
    grid[doorYR][cols - 1] = T.DOOR_R;
    grid[doorYR + 1][cols - 1] = T.DOOR_R;

    // Place power-ups
    const pupCount = 1 + Math.floor(rng() * 2);
    const powerups = [];
    for (let i = 0; i < pupCount; i++) {
        const px = 2 + Math.floor(rng() * (cols - 4));
        const py = 2 + Math.floor(rng() * (rows - 4));
        if (grid[py][px] === T.EMPTY) {
            grid[py][px] = T.POWERUP;
            powerups.push({ x: px * TILE + TILE / 2, y: py * TILE + TILE / 2, collected: false, id: i });
        }
    }

    // Place spikes
    const spikeCount = Math.floor(rng() * 3);
    for (let i = 0; i < spikeCount; i++) {
        const sx = 2 + Math.floor(rng() * (cols - 4));
        const sy = rows - 2;
        if (grid[sy][sx] === T.EMPTY) grid[sy][sx] = T.SPIKE;
    }

    // Generate enemies
    const enemies = [];
    const enemyCount = 2 + Math.floor(rng() * 3);
    const types = Object.keys(ENEMY_TYPES);
    for (let i = 0; i < enemyCount; i++) {
        const type = types[Math.floor(rng() * types.length)];
        const def = ENEMY_TYPES[type];
        const ex = (3 + Math.floor(rng() * (cols - 6))) * TILE;
        const ey = (2 + Math.floor(rng() * (rows - 5))) * TILE;
        enemies.push({
            type, x: ex, y: ey, vx: def.speed * (rng() > 0.5 ? 1 : -1),
            vy: 0, hp: def.hp, w: def.w, h: def.h, color: def.color,
            alive: true, dir: 1, shootTimer: 0, flashTimer: 0
        });
    }

    return { grid, cols, rows, powerups, enemies, doorYL, doorYR };
}

export class DrownedSuperMetroid extends GameBase {
    constructor() {
        super({
            id: 'super-metroid',
            name: 'DROWNED SUPER METROID',
            channel: 7,
            titleColor: '#00ccff',
            bgColor: '#0a0a1a'
        });
    }

    onInit() {
        this.resetGameState();
    }

    resetGameState() {
        // Player
        this.player = {
            x: 80, y: 200, vx: 0, vy: 0,
            w: 22, h: 30, onGround: false,
            facing: 1, aimAngle: 0, // 0=forward, -1=up, 1=down
            energy: 100, maxEnergy: 100,
            missiles: 5, iFrames: 0,
            suitColor: '#e8a010', visorColor: '#00ff88',
            morphBall: false, curses: []
        };

        // Room state
        this.currentRoom = 0;
        this.roomHistory = [];
        this.rooms = {};
        this.transitionTimer = 0;
        this.transitionDir = 0;

        // Bullets
        this.bullets = [];
        this.enemyBullets = [];

        // Water
        this.waterLevel = 0; // rises from bottom: 0 = no water, height = full
        this.waterRiseSpeed = WATER_RISE_RATE;
        this.bubbles = [];
        this.drowningTimer = 0;

        // Corruption
        this.controlsReversed = false;
        this.blindVisor = false;
        this.slowFactor = 1;
        this.phantomShots = false;
        this.roomLoopCount = 0;
        this.glitchFlashes = [];
        this.warningText = '';
        this.warningTimer = 0;
        this.ambientPulse = 0;

        // Particles
        this.particles = [];

        // Camera shake
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeTimer = 0;

        this.loadRoom(0);
    }

    loadRoom(roomId) {
        if (!this.rooms[roomId]) {
            this.rooms[roomId] = generateRoom(roomId, this.width, this.height);
        }
        this.currentRoom = roomId;
        this.roomHistory.push(roomId);

        const room = this.rooms[roomId];
        // Reset enemy alive status for fresh rooms
        for (const e of room.enemies) {
            if (!e._initialized) {
                e._initialized = true;
            }
        }
    }

    getCurrentRoom() {
        return this.rooms[this.currentRoom];
    }

    onStart() {
        this.waterLevel = 0;
    }

    onStop() {
        this.bullets = [];
        this.enemyBullets = [];
    }

    onRestart() {
        this.resetGameState();
    }

    onDeath() {
        this.player.iFrames = 90;
        this.player.x = 80;
        this.player.y = 200;
        this.player.vx = 0;
        this.player.vy = 0;
        this.waterLevel = Math.max(0, this.waterLevel - 80);
        this.shakeTimer = 15;
    }

    onTitleDismiss() {
        sfx.play('confirm');
    }

    onUpdate(dt, timestamp) {
        this.updateTimers(dt);
        this.ambientPulse += dt * 2;

        // Corruption: update water level
        if (this.hauntStage >= 1) {
            this.waterRiseSpeed = WATER_RISE_RATE + this.hauntStage * 3;
            this.waterLevel = Math.min(this.height - 40, this.waterLevel + this.waterRiseSpeed * dt);
        }

        // Check if player is submerged
        const waterSurface = this.height - this.waterLevel;
        const playerBottom = this.player.y + this.player.h;
        if (playerBottom > waterSurface + 10) {
            this.drowningTimer += dt;
            if (this.drowningTimer > 5) {
                this.player.energy -= 20 * dt;
                if (this.player.energy <= 0) {
                    this.player.energy = 0;
                    this.die();
                }
            }
            // Bubbles
            if (Math.random() < dt * 3) {
                this.bubbles.push({
                    x: this.player.x + Math.random() * this.player.w,
                    y: this.player.y,
                    size: 2 + Math.random() * 4,
                    speed: 40 + Math.random() * 30
                });
            }
        } else {
            this.drowningTimer = Math.max(0, this.drowningTimer - dt * 2);
        }

        // Update bubbles
        for (let i = this.bubbles.length - 1; i >= 0; i--) {
            this.bubbles[i].y -= this.bubbles[i].speed * dt;
            this.bubbles[i].x += Math.sin(this.bubbles[i].y * 0.1) * 0.5;
            if (this.bubbles[i].y < waterSurface - 10) {
                this.bubbles.splice(i, 1);
            }
        }

        this.updatePlayer(dt, timestamp);
        this.updateBullets(dt);
        this.updateEnemies(dt, timestamp);
        this.updateParticles(dt);
        this.updateCorruption(dt, timestamp);

        // Camera shake decay
        if (this.shakeTimer > 0) {
            this.shakeTimer--;
            this.shakeX = (Math.random() - 0.5) * this.shakeTimer;
            this.shakeY = (Math.random() - 0.5) * this.shakeTimer;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
        }

        // Warning text timer
        if (this.warningTimer > 0) {
            this.warningTimer -= dt;
            if (this.warningTimer <= 0) this.warningText = '';
        }
    }

    updatePlayer(dt, timestamp) {
        const p = this.player;
        const room = this.getCurrentRoom();
        if (!room) return;

        const dpad = input.getDPad();
        let moveX = dpad.x;
        let moveY = dpad.y;

        // Corruption: reverse controls
        if (this.controlsReversed) {
            moveX = -moveX;
        }

        // Aim angle
        if (input.isPressed(BUTTONS.UP)) {
            p.aimAngle = -1;
        } else if (input.isPressed(BUTTONS.DOWN)) {
            p.aimAngle = 1;
        } else {
            p.aimAngle = 0;
        }

        // Horizontal movement
        const speed = MOVE_SPEED * this.slowFactor;
        p.vx = moveX * speed;
        if (moveX !== 0) p.facing = moveX > 0 ? 1 : -1;

        // Jump
        if (input.isJustPressed(BUTTONS.A) && p.onGround) {
            p.vy = JUMP_VEL;
            p.onGround = false;
            sfx.play('jump');
        }

        // Gravity (reduced underwater)
        const inWater = (p.y + p.h) > (this.height - this.waterLevel);
        const grav = inWater ? GRAVITY * 0.4 : GRAVITY;
        p.vy += grav * dt;
        if (inWater) {
            p.vy *= 0.95; // water drag
            p.vx *= 0.9;
        }

        // Move and collide
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Tile collision
        p.onGround = false;
        this.resolveCollisions(p, room);

        // Door transitions
        if (p.x <= 2) {
            this.transitionRoom(-1);
        } else if (p.x + p.w >= this.width - 2) {
            this.transitionRoom(1);
        }

        // Shoot (B button)
        if (input.isJustPressed(BUTTONS.B)) {
            this.shootBullet();
        }

        // iFrames
        if (p.iFrames > 0) p.iFrames--;

        // Powerup collision
        for (const pu of room.powerups) {
            if (!pu.collected && this.rectsOverlap(
                p.x, p.y, p.w, p.h,
                pu.x - 8, pu.y - 8, 16, 16
            )) {
                pu.collected = true;
                this.collectPowerup();
            }
        }

        // Spike collision
        for (let r = 0; r < room.rows; r++) {
            for (let c = 0; c < room.cols; c++) {
                if (room.grid[r][c] === T.SPIKE) {
                    if (this.rectsOverlap(p.x, p.y, p.w, p.h, c * TILE, r * TILE, TILE, TILE)) {
                        if (p.iFrames <= 0) {
                            p.energy -= 30;
                            p.iFrames = 60;
                            sfx.play('damage');
                            this.shakeTimer = 8;
                            if (p.energy <= 0) {
                                p.energy = 0;
                                this.die();
                            }
                        }
                    }
                }
            }
        }
    }

    resolveCollisions(p, room) {
        const { grid, cols, rows } = room;

        // Check tiles around player
        const left = Math.max(0, Math.floor(p.x / TILE));
        const right = Math.min(cols - 1, Math.floor((p.x + p.w) / TILE));
        const top = Math.max(0, Math.floor(p.y / TILE));
        const bottom = Math.min(rows - 1, Math.floor((p.y + p.h) / TILE));

        for (let r = top; r <= bottom; r++) {
            for (let c = left; c <= right; c++) {
                const tile = grid[r][c];
                if (tile === T.WALL || tile === T.PLATFORM) {
                    const tx = c * TILE;
                    const ty = r * TILE;
                    if (this.rectsOverlap(p.x, p.y, p.w, p.h, tx, ty, TILE, TILE)) {
                        // Resolve overlap
                        const overlapX = Math.min(p.x + p.w - tx, tx + TILE - p.x);
                        const overlapY = Math.min(p.y + p.h - ty, ty + TILE - p.y);

                        if (tile === T.PLATFORM) {
                            // Platforms: only solid from above
                            if (p.vy > 0 && p.y + p.h - ty < 12) {
                                p.y = ty - p.h;
                                p.vy = 0;
                                p.onGround = true;
                            }
                        } else {
                            if (overlapX < overlapY) {
                                if (p.x + p.w / 2 < tx + TILE / 2) {
                                    p.x = tx - p.w;
                                } else {
                                    p.x = tx + TILE;
                                }
                                p.vx = 0;
                            } else {
                                if (p.y + p.h / 2 < ty + TILE / 2) {
                                    p.y = ty - p.h;
                                    p.vy = 0;
                                    p.onGround = true;
                                } else {
                                    p.y = ty + TILE;
                                    p.vy = 0;
                                }
                            }
                        }
                    }
                }
            }
        }

        // Keep within bounds (except doors)
        if (p.y < 0) { p.y = 0; p.vy = 0; }
        if (p.y + p.h > this.height) { p.y = this.height - p.h; p.vy = 0; p.onGround = true; }
    }

    transitionRoom(dir) {
        const p = this.player;
        let nextRoom = this.currentRoom + dir;

        // Corruption: rooms loop back at stage >= 3
        if (this.hauntStage >= 3) {
            this.roomLoopCount++;
            if (this.roomLoopCount > 2) {
                nextRoom = this.roomHistory.length > 3
                    ? this.roomHistory[this.roomHistory.length - 3]
                    : this.currentRoom;
                this.warningText = 'YOU HAVE BEEN HERE BEFORE';
                this.warningTimer = 2;
                sfx.play('glitch');
            }
        }

        this.loadRoom(nextRoom);

        // Place player at opposite side
        if (dir > 0) {
            p.x = TILE + 4;
        } else {
            p.x = this.width - TILE - p.w - 4;
        }

        this.addScore(10);
        sfx.play('confirm');
    }

    shootBullet() {
        const p = this.player;
        let dx = p.facing;
        let dy = 0;

        if (p.aimAngle === -1) { dx = 0; dy = -1; }
        else if (p.aimAngle === 1) { dx = 0; dy = 1; }

        const bx = p.x + p.w / 2 + dx * 12;
        const by = p.y + p.h / 2 + dy * 12;

        this.bullets.push({
            x: bx, y: by, vx: dx * BULLET_SPEED, vy: dy * BULLET_SPEED,
            life: 1.5, w: 8, h: 4, phantom: this.phantomShots
        });
        sfx.play('shoot');
    }

    updateBullets(dt) {
        const room = this.getCurrentRoom();
        if (!room) return;

        // Player bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.life -= dt;

            if (b.life <= 0 || b.x < 0 || b.x > this.width || b.y < 0 || b.y > this.height) {
                this.bullets.splice(i, 1);
                continue;
            }

            // Tile collision
            const col = Math.floor(b.x / TILE);
            const row = Math.floor(b.y / TILE);
            if (col >= 0 && col < room.cols && row >= 0 && row < room.rows) {
                if (room.grid[row][col] === T.WALL) {
                    this.spawnParticles(b.x, b.y, '#ff0', 3);
                    this.bullets.splice(i, 1);
                    continue;
                }
            }

            // Enemy hit
            if (!b.phantom) {
                for (const e of room.enemies) {
                    if (!e.alive) continue;
                    if (this.rectsOverlap(b.x - 4, b.y - 2, 8, 4, e.x, e.y, e.w, e.h)) {
                        e.hp--;
                        e.flashTimer = 6;
                        sfx.play('hit');
                        this.spawnParticles(b.x, b.y, '#fff', 4);
                        this.bullets.splice(i, 1);
                        if (e.hp <= 0) {
                            e.alive = false;
                            this.addScore(50);
                            this.spawnParticles(e.x + e.w / 2, e.y + e.h / 2, e.color, 8);
                            sfx.play('explosion');
                        }
                        break;
                    }
                }
            }
        }

        // Enemy bullets
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const b = this.enemyBullets[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.life -= dt;

            if (b.life <= 0 || b.x < 0 || b.x > this.width || b.y < 0 || b.y > this.height) {
                this.enemyBullets.splice(i, 1);
                continue;
            }

            // Hit player
            const p = this.player;
            if (p.iFrames <= 0 && this.rectsOverlap(b.x - 3, b.y - 3, 6, 6, p.x, p.y, p.w, p.h)) {
                p.energy -= 15;
                p.iFrames = 45;
                sfx.play('damage');
                this.shakeTimer = 5;
                this.enemyBullets.splice(i, 1);
                if (p.energy <= 0) {
                    p.energy = 0;
                    this.die();
                }
            }
        }
    }

    updateEnemies(dt, timestamp) {
        const room = this.getCurrentRoom();
        if (!room) return;

        for (const e of room.enemies) {
            if (!e.alive) continue;

            if (e.flashTimer > 0) e.flashTimer--;

            if (e.type === 'CRAWLER') {
                e.x += e.vx * dt;
                // Reverse at walls
                const col = Math.floor((e.x + (e.vx > 0 ? e.w : 0)) / TILE);
                const row = Math.floor((e.y + e.h / 2) / TILE);
                if (col <= 0 || col >= room.cols - 1 ||
                    (row >= 0 && row < room.rows && room.grid[row][col] === T.WALL)) {
                    e.vx = -e.vx;
                }
                // Apply gravity
                e.vy += GRAVITY * dt;
                e.y += e.vy * dt;
                // Ground collision
                const groundRow = Math.floor((e.y + e.h) / TILE);
                if (groundRow >= 0 && groundRow < room.rows &&
                    Math.floor(e.x / TILE) >= 0 && Math.floor(e.x / TILE) < room.cols) {
                    if (room.grid[groundRow][Math.floor((e.x + e.w / 2) / TILE)] === T.WALL ||
                        room.grid[groundRow][Math.floor((e.x + e.w / 2) / TILE)] === T.PLATFORM) {
                        e.y = groundRow * TILE - e.h;
                        e.vy = 0;
                    }
                }
            } else if (e.type === 'FLYER') {
                // Float in a sine wave
                e.x += e.vx * dt;
                e.y += Math.sin(timestamp * 3 + e.x * 0.01) * 40 * dt;
                // Reverse at walls
                if (e.x < TILE || e.x + e.w > this.width - TILE) {
                    e.vx = -e.vx;
                }
            } else if (e.type === 'TURRET') {
                // Shoot at player periodically
                e.shootTimer += dt;
                if (e.shootTimer > 2.0) {
                    e.shootTimer = 0;
                    const dx = this.player.x - e.x;
                    const dy = this.player.y - e.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    this.enemyBullets.push({
                        x: e.x + e.w / 2, y: e.y + e.h / 2,
                        vx: (dx / dist) * 200, vy: (dy / dist) * 200,
                        life: 3
                    });
                }
            }

            // Collision with player
            const p = this.player;
            if (p.iFrames <= 0 && this.rectsOverlap(p.x, p.y, p.w, p.h, e.x, e.y, e.w, e.h)) {
                p.energy -= 20;
                p.iFrames = 60;
                p.vy = -200;
                sfx.play('damage');
                this.shakeTimer = 6;
                if (p.energy <= 0) {
                    p.energy = 0;
                    this.die();
                }
            }
        }
    }

    collectPowerup() {
        // At haunt stage >= 2, powerups become curses
        if (this.hauntStage >= 2 && Math.random() < 0.5 + this.corruptionLevel) {
            const curseIdx = Math.floor(Math.random() * CURSE_NAMES.length);
            const curse = CURSE_NAMES[curseIdx];
            this.warningText = 'CURSED: ' + curse;
            this.warningTimer = 3;
            sfx.play('glitch');
            this.shakeTimer = 12;

            switch (curseIdx) {
                case 0: this.controlsReversed = true; break;
                case 1: this.slowFactor = 0.5; break;
                case 2:
                    // Gravity flip for a duration
                    this.addTimer(() => {}, 5000);
                    break;
                case 3: this.blindVisor = true;
                    this.addTimer(() => { this.blindVisor = false; }, 8000);
                    break;
                case 4: this.phantomShots = true;
                    this.addTimer(() => { this.phantomShots = false; }, 10000);
                    break;
            }

            events.emit(EVENTS.HAUNT_GLITCH, { game: this.id, type: 'curse', curse });
        } else {
            const pupIdx = Math.floor(Math.random() * POWERUP_NAMES.length);
            this.warningText = 'GOT: ' + POWERUP_NAMES[pupIdx];
            this.warningTimer = 2;
            sfx.play('powerUp');
            this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 30);
            this.addScore(100);
        }
    }

    updateCorruption(dt, timestamp) {
        // Haunting effects
        if (this.hauntStage >= 2) {
            // Random glitch flashes
            if (Math.random() < this.corruptionLevel * 0.02) {
                this.glitchFlashes.push({
                    x: Math.random() * this.width,
                    y: Math.random() * this.height,
                    w: 20 + Math.random() * 80,
                    h: 2 + Math.random() * 6,
                    life: 0.1 + Math.random() * 0.2
                });
            }
        }

        // Update glitch flashes
        for (let i = this.glitchFlashes.length - 1; i >= 0; i--) {
            this.glitchFlashes[i].life -= dt;
            if (this.glitchFlashes[i].life <= 0) {
                this.glitchFlashes.splice(i, 1);
            }
        }

        // Stage 4: aggressive water + damage
        if (this.hauntStage >= 4) {
            this.waterRiseSpeed = WATER_RISE_RATE * 5;
            if (Math.random() < 0.005) {
                sfx.play('whisper');
            }
        }
    }

    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 200 * dt;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    spawnParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x, y, color,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200 - 50,
                life: 0.3 + Math.random() * 0.4,
                size: 2 + Math.random() * 3
            });
        }
    }

    rectsOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
    }

    // === RENDERING ===

    onRender(ctx, dt, timestamp) {
        ctx.save();
        ctx.translate(this.shakeX, this.shakeY);

        // Background
        this.renderBackground(ctx, timestamp);

        // Room tiles
        this.renderRoom(ctx, timestamp);

        // Power-ups
        this.renderPowerups(ctx, timestamp);

        // Enemies
        this.renderEnemies(ctx, timestamp);

        // Bullets
        this.renderBullets(ctx, timestamp);

        // Particles
        this.renderParticles(ctx);

        // Player
        this.renderPlayer(ctx, timestamp);

        // Water overlay
        this.renderWater(ctx, timestamp);

        // Glitch flashes
        this.renderGlitchFlashes(ctx);

        // Blind visor effect
        if (this.blindVisor) {
            this.renderBlindVisor(ctx, timestamp);
        }

        // HUD overlay
        this.renderMetroidHUD(ctx, timestamp);

        // Warning text
        if (this.warningText) {
            this.renderWarning(ctx, timestamp);
        }

        // Haunting overlays
        if (this.hauntStage >= 3) {
            this.renderHauntOverlay(ctx, timestamp);
        }

        ctx.restore();
    }

    renderBackground(ctx, timestamp) {
        // Dark metallic background
        const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#0a0a1a');
        gradient.addColorStop(1, '#0d1117');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);

        // Background detail: distant wall panels
        ctx.fillStyle = 'rgba(30,40,60,0.3)';
        for (let x = 0; x < this.width; x += 64) {
            for (let y = 0; y < this.height; y += 64) {
                ctx.fillRect(x + 1, y + 1, 62, 62);
            }
        }
    }

    renderRoom(ctx, timestamp) {
        const room = this.getCurrentRoom();
        if (!room) return;

        for (let r = 0; r < room.rows; r++) {
            for (let c = 0; c < room.cols; c++) {
                const tile = room.grid[r][c];
                const x = c * TILE;
                const y = r * TILE;

                if (tile === T.WALL) {
                    // Metallic wall
                    ctx.fillStyle = '#334';
                    ctx.fillRect(x, y, TILE, TILE);
                    ctx.strokeStyle = '#445';
                    ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
                    // Rivet detail
                    ctx.fillStyle = '#556';
                    ctx.fillRect(x + 3, y + 3, 4, 4);
                    ctx.fillRect(x + TILE - 7, y + TILE - 7, 4, 4);
                } else if (tile === T.PLATFORM) {
                    ctx.fillStyle = '#4a4a5a';
                    ctx.fillRect(x, y, TILE, 6);
                    ctx.fillStyle = '#3a3a4a';
                    ctx.fillRect(x, y + 6, TILE, 2);
                } else if (tile === T.DOOR_L || tile === T.DOOR_R) {
                    // Door (blinking)
                    const blink = Math.sin(timestamp * 4) > 0;
                    ctx.fillStyle = blink ? '#0066cc' : '#004488';
                    ctx.fillRect(x, y, TILE, TILE);
                    ctx.fillStyle = '#88ccff';
                    ctx.fillRect(x + TILE / 4, y + 4, TILE / 2, TILE - 8);
                } else if (tile === T.SPIKE) {
                    ctx.fillStyle = '#cc3333';
                    for (let s = 0; s < 4; s++) {
                        const sx = x + s * 8;
                        ctx.beginPath();
                        ctx.moveTo(sx, y + TILE);
                        ctx.lineTo(sx + 4, y + TILE - 12);
                        ctx.lineTo(sx + 8, y + TILE);
                        ctx.fill();
                    }
                }
            }
        }
    }

    renderPowerups(ctx, timestamp) {
        const room = this.getCurrentRoom();
        if (!room) return;

        for (const pu of room.powerups) {
            if (pu.collected) continue;
            const bob = Math.sin(timestamp * 3 + pu.id) * 4;
            const glow = 0.5 + Math.sin(timestamp * 5) * 0.3;

            // Corruption: powerups look sinister at high haunt
            if (this.hauntStage >= 2) {
                ctx.fillStyle = `rgba(255,0,80,${glow})`;
                ctx.beginPath();
                ctx.arc(pu.x, pu.y + bob, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ff0050';
                ctx.font = '10px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('?', pu.x, pu.y + bob + 4);
                ctx.textAlign = 'left';
            } else {
                ctx.fillStyle = `rgba(0,255,136,${glow})`;
                ctx.beginPath();
                ctx.arc(pu.x, pu.y + bob, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#00ff88';
                ctx.fillRect(pu.x - 4, pu.y + bob - 4, 8, 8);
            }
        }
    }

    renderEnemies(ctx, timestamp) {
        const room = this.getCurrentRoom();
        if (!room) return;

        for (const e of room.enemies) {
            if (!e.alive) continue;
            const flash = e.flashTimer > 0 && e.flashTimer % 2 === 0;
            const color = flash ? '#fff' : e.color;

            if (e.type === 'CRAWLER') {
                // Bug-like enemy
                ctx.fillStyle = color;
                ctx.fillRect(e.x, e.y, e.w, e.h);
                // Legs
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                for (let l = 0; l < 3; l++) {
                    const lx = e.x + 4 + l * 7;
                    const legAnim = Math.sin(timestamp * 8 + l) * 3;
                    ctx.beginPath();
                    ctx.moveTo(lx, e.y + e.h);
                    ctx.lineTo(lx - 3, e.y + e.h + 6 + legAnim);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(lx + 4, e.y + e.h);
                    ctx.lineTo(lx + 7, e.y + e.h + 6 - legAnim);
                    ctx.stroke();
                }
                // Eyes
                ctx.fillStyle = '#ff0';
                ctx.fillRect(e.x + 2, e.y + 2, 3, 3);
                ctx.fillRect(e.x + e.w - 5, e.y + 2, 3, 3);
            } else if (e.type === 'FLYER') {
                // Bat-like
                ctx.fillStyle = color;
                const wingSpread = Math.sin(timestamp * 10) * 6;
                ctx.beginPath();
                ctx.moveTo(e.x + e.w / 2, e.y);
                ctx.lineTo(e.x - wingSpread, e.y + e.h / 2);
                ctx.lineTo(e.x + e.w / 2, e.y + e.h);
                ctx.lineTo(e.x + e.w + wingSpread, e.y + e.h / 2);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#f00';
                ctx.fillRect(e.x + 5, e.y + 5, 2, 2);
                ctx.fillRect(e.x + 9, e.y + 5, 2, 2);
            } else if (e.type === 'TURRET') {
                // Cannon
                ctx.fillStyle = color;
                ctx.fillRect(e.x, e.y, e.w, e.h);
                ctx.fillStyle = '#222';
                ctx.fillRect(e.x + 4, e.y + 4, e.w - 8, e.h - 8);
                // Barrel pointing at player
                const dx = this.player.x - e.x;
                const dy = this.player.y - e.y;
                const angle = Math.atan2(dy, dx);
                ctx.strokeStyle = '#ff4444';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(e.x + e.w / 2, e.y + e.h / 2);
                ctx.lineTo(e.x + e.w / 2 + Math.cos(angle) * 16, e.y + e.h / 2 + Math.sin(angle) * 16);
                ctx.stroke();
            }
        }
    }

    renderBullets(ctx, timestamp) {
        // Player bullets
        ctx.fillStyle = this.phantomShots ? 'rgba(255,0,128,0.4)' : '#ffee00';
        for (const b of this.bullets) {
            if (b.phantom) {
                ctx.globalAlpha = 0.3 + Math.sin(timestamp * 15) * 0.2;
            }
            ctx.fillRect(b.x - 4, b.y - 2, 8, 4);
            // Trail
            ctx.fillStyle = this.phantomShots ? 'rgba(255,0,128,0.15)' : 'rgba(255,238,0,0.3)';
            ctx.fillRect(b.x - 4 - b.vx * 0.02, b.y - 1, 6, 2);
            ctx.fillStyle = this.phantomShots ? 'rgba(255,0,128,0.4)' : '#ffee00';
            ctx.globalAlpha = 1;
        }

        // Enemy bullets
        ctx.fillStyle = '#ff3366';
        for (const b of this.enemyBullets) {
            ctx.beginPath();
            ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderParticles(ctx) {
        for (const p of this.particles) {
            ctx.globalAlpha = Math.max(0, p.life / 0.5);
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.globalAlpha = 1;
    }

    renderPlayer(ctx, timestamp) {
        const p = this.player;

        // iFrames flicker
        if (p.iFrames > 0 && p.iFrames % 4 < 2) return;

        ctx.save();
        ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
        if (p.facing < 0) ctx.scale(-1, 1);

        // Suit body
        ctx.fillStyle = p.suitColor;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);

        // Helmet
        ctx.fillStyle = '#cc8800';
        ctx.fillRect(-p.w / 2 + 2, -p.h / 2, p.w - 4, 12);

        // Visor
        ctx.fillStyle = p.visorColor;
        ctx.fillRect(2, -p.h / 2 + 3, 8, 5);

        // Arm cannon (right side in facing direction)
        ctx.fillStyle = '#bb7700';
        const cannonY = p.aimAngle === -1 ? -12 : (p.aimAngle === 1 ? 8 : 0);
        ctx.fillRect(6, cannonY - 3, 10, 6);
        ctx.fillStyle = '#00ff88';
        ctx.fillRect(14, cannonY - 1, 3, 2);

        // Legs animation
        const legAnim = Math.sin(timestamp * 8) * 3;
        ctx.fillStyle = '#996600';
        ctx.fillRect(-4, p.h / 2 - 8, 5, 8);
        ctx.fillRect(2, p.h / 2 - 8, 5, 8);
        if (Math.abs(p.vx) > 10) {
            ctx.fillRect(-4, p.h / 2 - 8 + legAnim, 5, 8);
        }

        // Corruption: suit degradation
        if (this.hauntStage >= 3) {
            ctx.fillStyle = 'rgba(0,0,80,0.4)';
            const glitchH = Math.random() * 10;
            ctx.fillRect(-p.w / 2, -p.h / 2 + Math.random() * p.h, p.w, glitchH);
        }

        ctx.restore();
    }

    renderWater(ctx, timestamp) {
        if (this.waterLevel <= 0) return;

        const waterSurface = this.height - this.waterLevel;

        // Water surface waviness
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, waterSurface);
        for (let x = 0; x <= this.width; x += 8) {
            const wave = Math.sin(x * 0.05 + timestamp * 2) * 4 +
                         Math.sin(x * 0.02 + timestamp * 1.3) * 2;
            ctx.lineTo(x, waterSurface + wave);
        }
        ctx.lineTo(this.width, this.height);
        ctx.lineTo(0, this.height);
        ctx.closePath();

        // Water fill
        const waterGrad = ctx.createLinearGradient(0, waterSurface, 0, this.height);
        const alpha = 0.3 + this.corruptionLevel * 0.2;
        waterGrad.addColorStop(0, `rgba(0,80,160,${alpha})`);
        waterGrad.addColorStop(0.5, `rgba(0,40,120,${alpha + 0.15})`);
        waterGrad.addColorStop(1, `rgba(0,10,60,${alpha + 0.3})`);
        ctx.fillStyle = waterGrad;
        ctx.fill();

        // Corruption: reddish tint in water
        if (this.hauntStage >= 3) {
            ctx.fillStyle = `rgba(80,0,0,${0.1 + this.corruptionLevel * 0.15})`;
            ctx.fill();
        }
        ctx.restore();

        // Bubbles
        ctx.fillStyle = 'rgba(150,200,255,0.6)';
        for (const b of this.bubbles) {
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Surface highlight
        ctx.strokeStyle = 'rgba(100,180,255,0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x <= this.width; x += 8) {
            const wave = Math.sin(x * 0.05 + timestamp * 2) * 4;
            if (x === 0) ctx.moveTo(x, waterSurface + wave);
            else ctx.lineTo(x, waterSurface + wave);
        }
        ctx.stroke();
    }

    renderGlitchFlashes(ctx) {
        for (const g of this.glitchFlashes) {
            ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '255,0,80' : '0,255,200'},${0.3 + Math.random() * 0.4})`;
            ctx.fillRect(g.x, g.y, g.w, g.h);
        }
    }

    renderBlindVisor(ctx, timestamp) {
        // Darkness except small circle around player
        ctx.save();
        const gradient = ctx.createRadialGradient(
            this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, 30,
            this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, 120
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.9)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);

        // Visor static
        if (Math.random() < 0.3) {
            ctx.fillStyle = `rgba(0,255,100,${Math.random() * 0.1})`;
            ctx.fillRect(0, Math.random() * this.height, this.width, 2);
        }
        ctx.restore();
    }

    renderMetroidHUD(ctx, timestamp) {
        // Energy bar
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(8, this.height - 30, 120, 20);
        ctx.strokeStyle = '#00ff88';
        ctx.strokeRect(8, this.height - 30, 120, 20);

        const energyPct = this.player.energy / this.player.maxEnergy;
        const barColor = energyPct > 0.5 ? '#00ff88' : (energyPct > 0.25 ? '#ffcc00' : '#ff3333');
        ctx.fillStyle = barColor;
        ctx.fillRect(10, this.height - 28, 116 * energyPct, 16);

        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.fillText(`EN ${Math.ceil(this.player.energy)}`, 14, this.height - 16);

        // Room number
        ctx.fillStyle = '#888';
        ctx.font = '10px monospace';
        ctx.fillText(`ROOM ${this.currentRoom}`, this.width - 80, this.height - 16);

        // Drowning warning
        if (this.drowningTimer > 3) {
            const blink = Math.sin(timestamp * 8) > 0;
            if (blink) {
                ctx.fillStyle = '#ff0000';
                ctx.font = 'bold 14px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('OXYGEN LOW', this.width / 2, 50);
                ctx.textAlign = 'left';
            }
        }
    }

    renderWarning(ctx, timestamp) {
        const alpha = Math.min(1, this.warningTimer);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.warningText.startsWith('CURSED') ? '#ff0050' : '#00ff88';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.warningText, this.width / 2, this.height / 2 - 60);
        ctx.textAlign = 'left';
        ctx.globalAlpha = 1;
    }

    renderHauntOverlay(ctx, timestamp) {
        // Ghost hands reaching up from water
        if (this.waterLevel > 50) {
            const waterSurface = this.height - this.waterLevel;
            ctx.strokeStyle = `rgba(200,200,255,${0.1 + Math.sin(timestamp) * 0.05})`;
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                const hx = 80 + i * 160 + Math.sin(timestamp + i) * 20;
                const hy = waterSurface;
                ctx.beginPath();
                ctx.moveTo(hx, hy + 20);
                ctx.quadraticCurveTo(hx - 5, hy, hx, hy - 15 - Math.sin(timestamp * 2 + i) * 8);
                ctx.stroke();
                // Fingers
                for (let f = 0; f < 3; f++) {
                    ctx.beginPath();
                    ctx.moveTo(hx + (f - 1) * 4, hy - 15);
                    ctx.lineTo(hx + (f - 1) * 5, hy - 22 - Math.sin(timestamp * 3 + f) * 3);
                    ctx.stroke();
                }
            }
        }

        // Corruption text flickers
        if (this.hauntStage >= 4 && Math.random() < 0.01) {
            const msgs = ['DROWN WITH US', 'THE WATER REMEMBERS', 'YOU CANNOT SURFACE', 'SAMUS IS GONE'];
            ctx.fillStyle = 'rgba(0,100,200,0.3)';
            ctx.font = '20px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(msgs[Math.floor(Math.random() * msgs.length)],
                this.width / 2 + (Math.random() - 0.5) * 40,
                this.height / 2 + (Math.random() - 0.5) * 100);
            ctx.textAlign = 'left';
        }

        // Stage 4: screen flicker
        if (this.hauntStage >= 4 && Math.random() < 0.03) {
            ctx.fillStyle = `rgba(0,50,100,${Math.random() * 0.3})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }
    }
}

export default DrownedSuperMetroid;
