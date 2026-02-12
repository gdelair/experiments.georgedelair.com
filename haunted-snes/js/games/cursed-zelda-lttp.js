// cursed-zelda-lttp.js — Top-down adventure game with Dark World corruption

import { GameBase } from './game-base.js';
import { input, BUTTONS } from '../core/input.js';
import { sfx } from '../audio/sfx.js';
import state from '../core/state.js';
import { events, EVENTS } from '../core/events.js';

const TILE = 32;
const MOVE_SPEED = 120;
const SWORD_DURATION = 0.25;
const SWORD_RANGE = 28;
const ENEMY_SPEED = 50;

// Tile types
const T = {
    GRASS: 0, WALL: 1, TREE: 2, WATER: 3, DOOR: 4,
    PATH: 5, BUSH: 6, CHEST: 7, STAIRS: 8, DARK_GRASS: 9,
    DARK_WALL: 10, DARK_TREE: 11, DARK_WATER: 12, DARK_SKULL: 13
};

// Light World tile colors
const LIGHT_COLORS = {
    [T.GRASS]:  '#4a8c3f',
    [T.WALL]:   '#8a7a6a',
    [T.TREE]:   '#2d5a1e',
    [T.WATER]:  '#2266aa',
    [T.DOOR]:   '#6a4a2a',
    [T.PATH]:   '#c4a060',
    [T.BUSH]:   '#3a7030',
    [T.CHEST]:  '#aa7722',
    [T.STAIRS]: '#666'
};

// Dark World tile colors
const DARK_COLORS = {
    [T.DARK_GRASS]:  '#3a2040',
    [T.DARK_WALL]:   '#4a2030',
    [T.DARK_TREE]:   '#2a1030',
    [T.DARK_WATER]:  '#3a1050',
    [T.DARK_SKULL]:  '#5a3040'
};

// Map link: light -> dark
const LIGHT_TO_DARK = {
    [T.GRASS]: T.DARK_GRASS,
    [T.WALL]: T.DARK_WALL,
    [T.TREE]: T.DARK_TREE,
    [T.WATER]: T.DARK_WATER,
    [T.PATH]: T.DARK_GRASS,
    [T.BUSH]: T.DARK_SKULL,
    [T.CHEST]: T.CHEST,
    [T.DOOR]: T.DOOR,
    [T.STAIRS]: T.STAIRS
};

const ITEMS = ['BOOMERANG', 'BOW', 'BOMB', 'HOOKSHOT', 'LAMP'];
const DIR_OFFSETS = [
    { x: 0, y: -1 }, // up
    { x: 0, y: 1 },  // down
    { x: -1, y: 0 }, // left
    { x: 1, y: 0 }   // right
];

function seededRandom(seed) {
    let s = seed;
    return function() {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

function generateMap(seed, cols, rows, isDark) {
    const rng = seededRandom(seed);
    const grid = [];

    for (let r = 0; r < rows; r++) {
        grid[r] = [];
        for (let c = 0; c < cols; c++) {
            // Border walls
            if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
                grid[r][c] = isDark ? T.DARK_WALL : T.WALL;
                continue;
            }
            const val = rng();
            if (val < 0.6) grid[r][c] = isDark ? T.DARK_GRASS : T.GRASS;
            else if (val < 0.72) grid[r][c] = isDark ? T.DARK_TREE : T.TREE;
            else if (val < 0.78) grid[r][c] = isDark ? T.DARK_WATER : T.WATER;
            else if (val < 0.88) grid[r][c] = isDark ? T.DARK_GRASS : T.PATH;
            else if (val < 0.93) grid[r][c] = isDark ? T.DARK_SKULL : T.BUSH;
            else if (val < 0.95) grid[r][c] = isDark ? T.DARK_WALL : T.WALL;
            else grid[r][c] = isDark ? T.DARK_GRASS : T.GRASS;
        }
    }

    // Carve paths
    const pathY = 2 + Math.floor(rng() * (rows - 4));
    for (let c = 1; c < cols - 1; c++) {
        grid[pathY][c] = isDark ? T.DARK_GRASS : T.PATH;
        if (rng() < 0.3 && pathY + 1 < rows - 1) {
            grid[pathY + 1][c] = isDark ? T.DARK_GRASS : T.PATH;
        }
    }
    const pathX = 2 + Math.floor(rng() * (cols - 4));
    for (let r = 1; r < rows - 1; r++) {
        grid[r][pathX] = isDark ? T.DARK_GRASS : T.PATH;
    }

    // Place doors (to adjacent screens)
    grid[pathY][0] = T.DOOR;
    grid[pathY][cols - 1] = T.DOOR;
    grid[0][pathX] = T.DOOR;
    grid[rows - 1][pathX] = T.DOOR;

    // Place chests
    const chests = [];
    for (let i = 0; i < 2; i++) {
        const cx = 3 + Math.floor(rng() * (cols - 6));
        const cy = 3 + Math.floor(rng() * (rows - 6));
        if (grid[cy][cx] === (isDark ? T.DARK_GRASS : T.GRASS) ||
            grid[cy][cx] === (isDark ? T.DARK_GRASS : T.PATH)) {
            grid[cy][cx] = T.CHEST;
            chests.push({ x: cx, y: cy, opened: false });
        }
    }

    return { grid, chests };
}

function generateEnemies(seed, cols, rows, isDark, count) {
    const rng = seededRandom(seed + 999);
    const enemies = [];
    for (let i = 0; i < count; i++) {
        const ex = (2 + Math.floor(rng() * (cols - 4))) * TILE + TILE / 2;
        const ey = (2 + Math.floor(rng() * (rows - 4))) * TILE + TILE / 2;
        enemies.push({
            x: ex, y: ey, w: 20, h: 20,
            dir: Math.floor(rng() * 4),
            speed: ENEMY_SPEED + rng() * 30,
            hp: isDark ? 3 : 2,
            type: isDark ? 'dark_soldier' : 'soldier',
            alive: true, flashTimer: 0,
            moveTimer: 0, moveDuration: 1 + rng() * 2,
            attackCooldown: 0, color: isDark ? '#8a2040' : '#2244aa',
            sightRange: 120
        });
    }
    return enemies;
}

export class CursedZeldaLttP extends GameBase {
    constructor() {
        super({
            id: 'zelda-lttp',
            name: 'CURSED ZELDA: LttP',
            channel: 9,
            titleColor: '#ffcc00',
            bgColor: '#1a1a2e'
        });
    }

    onInit() {
        this.resetGameState();
    }

    resetGameState() {
        // Player (Link)
        this.link = {
            x: 128, y: 200, w: 20, h: 20,
            dir: 0, // 0=up,1=down,2=left,3=right
            speed: MOVE_SPEED,
            swinging: false, swingTimer: 0,
            usingItem: false, itemTimer: 0,
            currentItem: 0, // index into ITEMS
            hp: 6, maxHp: 6, // hearts (half-hearts)
            rupees: 0, keys: 0,
            iFrames: 0, knockbackVx: 0, knockbackVy: 0,
            animFrame: 0, animTimer: 0
        };

        // World
        this.inDarkWorld = false;
        this.currentScreen = { x: 0, y: 0 };
        this.lightMaps = {};
        this.darkMaps = {};
        this.lightEnemies = {};
        this.darkEnemies = {};

        // Transition
        this.transitioning = false;
        this.transitionTimer = 0;
        this.transitionType = ''; // 'world_warp', 'screen_scroll'
        this.transitionDir = 0;

        // Map dimensions
        this.mapCols = Math.floor(this.width / TILE);
        this.mapRows = Math.floor(this.height / TILE);

        // Items / projectiles
        this.projectiles = [];
        this.swordHitbox = null;
        this.pickups = [];
        this.itemUseEffects = [];

        // Corruption
        this.bleedTiles = []; // tiles that have swapped between worlds
        this.darkWorldLeaking = false;
        this.warpStuckTimer = 0;
        this.warpStuck = false;
        this.darkEnemiesInLight = [];
        this.corruptionFlickers = [];
        this.mirrorCrackLevel = 0;

        // Particles
        this.particles = [];

        this.loadScreen(0, 0);
    }

    getScreenKey(sx, sy) { return `${sx},${sy}`; }

    loadScreen(sx, sy) {
        const key = this.getScreenKey(sx, sy);
        const seed = sx * 1000 + sy * 7 + 42;

        if (!this.lightMaps[key]) {
            this.lightMaps[key] = generateMap(seed, this.mapCols, this.mapRows, false);
            this.lightEnemies[key] = generateEnemies(seed, this.mapCols, this.mapRows, false, 4 + Math.floor(Math.random() * 3));
        }
        if (!this.darkMaps[key]) {
            this.darkMaps[key] = generateMap(seed + 5000, this.mapCols, this.mapRows, true);
            this.darkEnemies[key] = generateEnemies(seed + 5000, this.mapCols, this.mapRows, true, 5 + Math.floor(Math.random() * 4));
        }

        this.currentScreen = { x: sx, y: sy };
        this.projectiles = [];
        this.swordHitbox = null;
        this.pickups = [];
    }

    getCurrentMap() {
        const key = this.getScreenKey(this.currentScreen.x, this.currentScreen.y);
        return this.inDarkWorld ? this.darkMaps[key] : this.lightMaps[key];
    }

    getCurrentEnemies() {
        const key = this.getScreenKey(this.currentScreen.x, this.currentScreen.y);
        return this.inDarkWorld ? this.darkEnemies[key] : this.lightEnemies[key];
    }

    getTile(col, row) {
        const map = this.getCurrentMap();
        if (!map || row < 0 || row >= this.mapRows || col < 0 || col >= this.mapCols) return T.WALL;
        return map.grid[row][col];
    }

    isSolid(tile) {
        return tile === T.WALL || tile === T.TREE || tile === T.WATER ||
               tile === T.DARK_WALL || tile === T.DARK_TREE || tile === T.DARK_WATER;
    }

    onStart() {}
    onStop() {}

    onRestart() {
        this.resetGameState();
        this.lives = 3;
        this.score = 0;
    }

    onDeath() {
        this.link.iFrames = 90;
        this.link.hp = this.link.maxHp;
    }

    onTitleDismiss() {
        sfx.play('confirm');
    }

    onUpdate(dt, timestamp) {
        this.updateTimers(dt);

        if (this.transitioning) {
            this.updateTransition(dt, timestamp);
            return;
        }

        this.updateLink(dt, timestamp);
        this.updateSword(dt);
        this.updateProjectiles(dt);
        this.updateEnemies(dt, timestamp);
        this.updatePickups(dt);
        this.updateCorruption(dt, timestamp);
        this.updateParticles(dt);
    }

    updateLink(dt, timestamp) {
        const link = this.link;
        const dpad = input.getDPad();

        // Knockback
        if (link.knockbackVx !== 0 || link.knockbackVy !== 0) {
            link.x += link.knockbackVx * dt;
            link.y += link.knockbackVy * dt;
            link.knockbackVx *= 0.85;
            link.knockbackVy *= 0.85;
            if (Math.abs(link.knockbackVx) < 5) link.knockbackVx = 0;
            if (Math.abs(link.knockbackVy) < 5) link.knockbackVy = 0;
        }

        // Movement (only when not attacking)
        if (!link.swinging && !link.usingItem) {
            let mx = dpad.x * link.speed * dt;
            let my = dpad.y * link.speed * dt;

            // Update direction
            if (dpad.y < 0) link.dir = 0;
            else if (dpad.y > 0) link.dir = 1;
            else if (dpad.x < 0) link.dir = 2;
            else if (dpad.x > 0) link.dir = 3;

            // Try to move (axis-separate collision)
            if (mx !== 0) {
                const newX = link.x + mx;
                const col1 = Math.floor(newX / TILE);
                const col2 = Math.floor((newX + link.w) / TILE);
                const rowT = Math.floor(link.y / TILE);
                const rowB = Math.floor((link.y + link.h) / TILE);
                if (!this.isSolid(this.getTile(col1, rowT)) && !this.isSolid(this.getTile(col2, rowT)) &&
                    !this.isSolid(this.getTile(col1, rowB)) && !this.isSolid(this.getTile(col2, rowB))) {
                    link.x = newX;
                }
            }
            if (my !== 0) {
                const newY = link.y + my;
                const colL = Math.floor(link.x / TILE);
                const colR = Math.floor((link.x + link.w) / TILE);
                const row1 = Math.floor(newY / TILE);
                const row2 = Math.floor((newY + link.h) / TILE);
                if (!this.isSolid(this.getTile(colL, row1)) && !this.isSolid(this.getTile(colR, row1)) &&
                    !this.isSolid(this.getTile(colL, row2)) && !this.isSolid(this.getTile(colR, row2))) {
                    link.y = newY;
                }
            }

            // Walk animation
            if (dpad.x !== 0 || dpad.y !== 0) {
                link.animTimer += dt * 6;
                link.animFrame = Math.floor(link.animTimer) % 4;
            }
        }

        // Sword (B button)
        if (input.isJustPressed(BUTTONS.B) && !link.swinging && !link.usingItem) {
            link.swinging = true;
            link.swingTimer = SWORD_DURATION;
            sfx.play('sword');
            const off = DIR_OFFSETS[link.dir];
            this.swordHitbox = {
                x: link.x + link.w / 2 + off.x * SWORD_RANGE - 10,
                y: link.y + link.h / 2 + off.y * SWORD_RANGE - 10,
                w: 20, h: 20, timer: SWORD_DURATION
            };
        }

        // Use item (A button)
        if (input.isJustPressed(BUTTONS.A) && !link.swinging && !link.usingItem) {
            this.useItem();
        }

        // Cycle item (L/R)
        if (input.isJustPressed(BUTTONS.L)) {
            link.currentItem = (link.currentItem - 1 + ITEMS.length) % ITEMS.length;
            sfx.play('menuMove');
        }
        if (input.isJustPressed(BUTTONS.R)) {
            link.currentItem = (link.currentItem + 1) % ITEMS.length;
            sfx.play('menuMove');
        }

        // World warp (Select)
        if (input.isJustPressed(BUTTONS.SELECT)) {
            this.startWorldWarp();
        }

        // Screen transitions at edges
        if (link.x < 0) { this.scrollScreen(2); return; }
        if (link.x + link.w > this.width) { this.scrollScreen(3); return; }
        if (link.y < 0) { this.scrollScreen(0); return; }
        if (link.y + link.h > this.height) { this.scrollScreen(1); return; }

        // Chest interaction
        const map = this.getCurrentMap();
        if (map) {
            const centerCol = Math.floor((link.x + link.w / 2) / TILE);
            const centerRow = Math.floor((link.y + link.h / 2) / TILE);
            const frontCol = centerCol + DIR_OFFSETS[link.dir].x;
            const frontRow = centerRow + DIR_OFFSETS[link.dir].y;
            if (frontRow >= 0 && frontRow < this.mapRows && frontCol >= 0 && frontCol < this.mapCols) {
                if (map.grid[frontRow][frontCol] === T.CHEST) {
                    for (const chest of map.chests) {
                        if (chest.x === frontCol && chest.y === frontRow && !chest.opened) {
                            if (input.isJustPressed(BUTTONS.A) || input.isJustPressed(BUTTONS.B)) {
                                chest.opened = true;
                                link.rupees += 20 + Math.floor(Math.random() * 30);
                                this.addScore(50);
                                sfx.play('coin');
                                this.spawnParticles(frontCol * TILE + TILE / 2, frontRow * TILE + TILE / 2, '#ffcc00', 6);
                            }
                        }
                    }
                }
            }
        }

        // iFrames
        if (link.iFrames > 0) link.iFrames--;
    }

    useItem() {
        const link = this.link;
        const item = ITEMS[link.currentItem];
        const off = DIR_OFFSETS[link.dir];

        link.usingItem = true;
        link.itemTimer = 0.3;
        this.addTimer(() => { link.usingItem = false; }, 300);

        switch (item) {
            case 'BOOMERANG':
                this.projectiles.push({
                    x: link.x + link.w / 2, y: link.y + link.h / 2,
                    vx: off.x * 250, vy: off.y * 250,
                    type: 'boomerang', life: 1.0, returning: false, damage: 1,
                    w: 8, h: 8
                });
                sfx.play('shoot');
                break;
            case 'BOW':
                this.projectiles.push({
                    x: link.x + link.w / 2, y: link.y + link.h / 2,
                    vx: off.x * 400, vy: off.y * 400,
                    type: 'arrow', life: 1.5, damage: 2,
                    w: 6, h: 6
                });
                sfx.play('shoot');
                break;
            case 'BOMB':
                this.projectiles.push({
                    x: link.x + off.x * 24 + link.w / 2,
                    y: link.y + off.y * 24 + link.h / 2,
                    vx: 0, vy: 0,
                    type: 'bomb', life: 2.0, damage: 4, radius: 48,
                    w: 12, h: 12
                });
                sfx.play('land');
                break;
            case 'HOOKSHOT':
                this.projectiles.push({
                    x: link.x + link.w / 2, y: link.y + link.h / 2,
                    vx: off.x * 500, vy: off.y * 500,
                    type: 'hookshot', life: 0.4, damage: 1,
                    startX: link.x + link.w / 2, startY: link.y + link.h / 2,
                    w: 8, h: 8
                });
                sfx.play('shoot');
                break;
            case 'LAMP':
                // Light up area
                this.itemUseEffects.push({
                    type: 'lamp', x: link.x + off.x * 20, y: link.y + off.y * 20,
                    radius: 80, timer: 3
                });
                sfx.play('powerUp');
                break;
        }
    }

    startWorldWarp() {
        // Corruption: warp gets stuck
        if (this.hauntStage >= 3 && Math.random() < 0.4) {
            this.warpStuck = true;
            this.warpStuckTimer = 1.5 + Math.random() * 2;
            sfx.play('glitch');
            events.emit(EVENTS.HAUNT_GLITCH, { game: this.id, type: 'warp_stuck' });
            return;
        }

        this.transitioning = true;
        this.transitionTimer = 0;
        this.transitionType = 'world_warp';
        sfx.play('powerUp');
    }

    scrollScreen(dir) {
        const link = this.link;
        const dx = [0, 0, -1, 1][dir];
        const dy = [-1, 1, 0, 0][dir];

        this.loadScreen(this.currentScreen.x + dx, this.currentScreen.y + dy);

        // Place link at opposite edge
        if (dir === 0) link.y = this.height - link.h - TILE;
        else if (dir === 1) link.y = TILE;
        else if (dir === 2) link.x = this.width - link.w - TILE;
        else if (dir === 3) link.x = TILE;

        this.addScore(5);
    }

    updateTransition(dt, timestamp) {
        this.transitionTimer += dt;

        if (this.transitionType === 'world_warp') {
            if (this.transitionTimer >= 1.0) {
                this.inDarkWorld = !this.inDarkWorld;
                this.transitioning = false;
                sfx.play('confirm');

                if (this.inDarkWorld) {
                    events.emit(EVENTS.HAUNT_GLITCH, { game: this.id, type: 'dark_world_enter' });
                }
            }
        }
    }

    updateSword(dt) {
        if (this.link.swinging) {
            this.link.swingTimer -= dt;
            if (this.link.swingTimer <= 0) {
                this.link.swinging = false;
                this.swordHitbox = null;
            }
        }

        if (this.swordHitbox) {
            this.swordHitbox.timer -= dt;
            // Check enemy hits
            const enemies = this.getCurrentEnemies();
            if (enemies) {
                for (const e of enemies) {
                    if (!e.alive) continue;
                    if (this.rectsOverlap(this.swordHitbox.x, this.swordHitbox.y, this.swordHitbox.w, this.swordHitbox.h,
                        e.x - e.w / 2, e.y - e.h / 2, e.w, e.h)) {
                        e.hp -= 1;
                        e.flashTimer = 8;
                        sfx.play('hit');
                        this.spawnParticles(e.x, e.y, '#fff', 3);
                        if (e.hp <= 0) {
                            e.alive = false;
                            this.addScore(30);
                            this.spawnParticles(e.x, e.y, e.color, 6);
                            sfx.play('explosion');
                            // Drop
                            if (Math.random() < 0.4) {
                                this.pickups.push({
                                    x: e.x, y: e.y,
                                    type: Math.random() < 0.5 ? 'heart' : 'rupee',
                                    life: 5
                                });
                            }
                        }
                    }
                }
            }

            // Also check dark enemies in light world (corruption)
            for (const de of this.darkEnemiesInLight) {
                if (!de.alive) continue;
                if (this.rectsOverlap(this.swordHitbox.x, this.swordHitbox.y, this.swordHitbox.w, this.swordHitbox.h,
                    de.x - de.w / 2, de.y - de.h / 2, de.w, de.h)) {
                    de.hp -= 1;
                    de.flashTimer = 8;
                    sfx.play('hit');
                    if (de.hp <= 0) {
                        de.alive = false;
                        this.addScore(50);
                        sfx.play('explosion');
                    }
                }
            }
        }
    }

    updateProjectiles(dt) {
        const link = this.link;
        const enemies = this.getCurrentEnemies() || [];

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;

            if (p.type === 'boomerang' && p.life < 0.4 && !p.returning) {
                p.returning = true;
                p.vx = -p.vx;
                p.vy = -p.vy;
            }

            if (p.type === 'bomb' && p.life <= 0) {
                // Explode
                sfx.play('explosion');
                this.spawnParticles(p.x, p.y, '#ff8800', 12);
                // Damage enemies in radius
                for (const e of enemies) {
                    if (!e.alive) continue;
                    const dist = Math.sqrt((e.x - p.x) ** 2 + (e.y - p.y) ** 2);
                    if (dist < p.radius) {
                        e.hp -= p.damage;
                        e.flashTimer = 10;
                        if (e.hp <= 0) {
                            e.alive = false;
                            this.addScore(30);
                        }
                    }
                }
                this.projectiles.splice(i, 1);
                continue;
            }

            if (p.life <= 0 || p.x < 0 || p.x > this.width || p.y < 0 || p.y > this.height) {
                this.projectiles.splice(i, 1);
                continue;
            }

            // Hit enemies
            if (p.type !== 'bomb') {
                for (const e of enemies) {
                    if (!e.alive) continue;
                    if (this.rectsOverlap(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h,
                        e.x - e.w / 2, e.y - e.h / 2, e.w, e.h)) {
                        e.hp -= p.damage;
                        e.flashTimer = 8;
                        sfx.play('hit');
                        if (e.hp <= 0) {
                            e.alive = false;
                            this.addScore(30);
                            sfx.play('explosion');
                        }
                        if (p.type !== 'boomerang') {
                            this.projectiles.splice(i, 1);
                        }
                        break;
                    }
                }
            }
        }
    }

    updateEnemies(dt, timestamp) {
        const enemies = this.getCurrentEnemies();
        if (!enemies) return;
        const link = this.link;

        for (const e of enemies) {
            if (!e.alive) continue;
            if (e.flashTimer > 0) e.flashTimer--;

            // Simple AI: patrol, chase if player nearby
            const dx = link.x - e.x;
            const dy = link.y - e.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < e.sightRange) {
                // Chase
                const nx = dx / (dist || 1);
                const ny = dy / (dist || 1);
                e.x += nx * e.speed * 1.2 * dt;
                e.y += ny * e.speed * 1.2 * dt;
                if (Math.abs(dx) > Math.abs(dy)) {
                    e.dir = dx > 0 ? 3 : 2;
                } else {
                    e.dir = dy > 0 ? 1 : 0;
                }
            } else {
                // Patrol
                e.moveTimer -= dt;
                if (e.moveTimer <= 0) {
                    e.dir = Math.floor(Math.random() * 4);
                    e.moveTimer = e.moveDuration;
                }
                const off = DIR_OFFSETS[e.dir];
                const newX = e.x + off.x * e.speed * dt;
                const newY = e.y + off.y * e.speed * dt;
                const col = Math.floor(newX / TILE);
                const row = Math.floor(newY / TILE);
                if (!this.isSolid(this.getTile(col, row))) {
                    e.x = newX;
                    e.y = newY;
                } else {
                    e.dir = (e.dir + 1) % 4;
                }
            }

            // Damage player
            if (link.iFrames <= 0 &&
                this.rectsOverlap(link.x, link.y, link.w, link.h,
                    e.x - e.w / 2, e.y - e.h / 2, e.w, e.h)) {
                link.hp -= 1;
                link.iFrames = 45;
                const kAngle = Math.atan2(link.y - e.y, link.x - e.x);
                link.knockbackVx = Math.cos(kAngle) * 200;
                link.knockbackVy = Math.sin(kAngle) * 200;
                sfx.play('damage');
                if (link.hp <= 0) {
                    link.hp = 0;
                    this.die();
                }
            }
        }

        // Dark enemies that have leaked into light world
        for (const de of this.darkEnemiesInLight) {
            if (!de.alive) continue;
            if (de.flashTimer > 0) de.flashTimer--;

            const dx = link.x - de.x;
            const dy = link.y - de.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
                de.x += (dx / (dist || 1)) * de.speed * 1.5 * dt;
                de.y += (dy / (dist || 1)) * de.speed * 1.5 * dt;
            }

            if (link.iFrames <= 0 &&
                this.rectsOverlap(link.x, link.y, link.w, link.h,
                    de.x - de.w / 2, de.y - de.h / 2, de.w, de.h)) {
                link.hp -= 2;
                link.iFrames = 60;
                sfx.play('damage');
                if (link.hp <= 0) { link.hp = 0; this.die(); }
            }
        }
    }

    updatePickups(dt) {
        const link = this.link;
        for (let i = this.pickups.length - 1; i >= 0; i--) {
            const p = this.pickups[i];
            p.life -= dt;
            if (p.life <= 0) { this.pickups.splice(i, 1); continue; }

            if (this.rectsOverlap(link.x, link.y, link.w, link.h, p.x - 6, p.y - 6, 12, 12)) {
                if (p.type === 'heart') {
                    link.hp = Math.min(link.maxHp, link.hp + 2);
                    sfx.play('heal');
                } else {
                    link.rupees += 5;
                    sfx.play('coin');
                }
                this.pickups.splice(i, 1);
            }
        }
    }

    updateCorruption(dt, timestamp) {
        // Warp stuck effect
        if (this.warpStuck) {
            this.warpStuckTimer -= dt;
            if (this.warpStuckTimer <= 0) {
                this.warpStuck = false;
            }
        }

        // Stage 2+: Dark World tiles bleed into Light World
        if (this.hauntStage >= 2 && !this.inDarkWorld) {
            if (Math.random() < this.corruptionLevel * 0.01) {
                const map = this.getCurrentMap();
                if (map) {
                    const col = Math.floor(Math.random() * this.mapCols);
                    const row = Math.floor(Math.random() * this.mapRows);
                    const tile = map.grid[row][col];
                    if (LIGHT_TO_DARK[tile] !== undefined) {
                        this.bleedTiles.push({ col, row, original: tile, dark: LIGHT_TO_DARK[tile] });
                        map.grid[row][col] = LIGHT_TO_DARK[tile];
                    }
                }
            }
        }

        // Stage 3+: dark enemies appear in light world
        if (this.hauntStage >= 3 && !this.inDarkWorld) {
            if (this.darkEnemiesInLight.length < 3 && Math.random() < 0.002) {
                this.darkEnemiesInLight.push({
                    x: Math.random() * this.width,
                    y: Math.random() * this.height,
                    w: 22, h: 22, speed: 60 + Math.random() * 30,
                    hp: 3, alive: true, flashTimer: 0,
                    color: '#8a2040', dir: Math.floor(Math.random() * 4)
                });
                sfx.play('scare');
            }
        }

        // Corruption flickers
        if (this.hauntStage >= 2 && Math.random() < this.corruptionLevel * 0.03) {
            this.corruptionFlickers.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                w: 10 + Math.random() * 50,
                h: 10 + Math.random() * 50,
                life: 0.1 + Math.random() * 0.2,
                dark: true
            });
        }

        for (let i = this.corruptionFlickers.length - 1; i >= 0; i--) {
            this.corruptionFlickers[i].life -= dt;
            if (this.corruptionFlickers[i].life <= 0) {
                this.corruptionFlickers.splice(i, 1);
            }
        }

        // Item effects decay
        for (let i = this.itemUseEffects.length - 1; i >= 0; i--) {
            this.itemUseEffects[i].timer -= dt;
            if (this.itemUseEffects[i].timer <= 0) {
                this.itemUseEffects.splice(i, 1);
            }
        }

        // Mirror crack level
        this.mirrorCrackLevel = Math.min(1, this.hauntStage * 0.2 + this.corruptionLevel * 0.3);
    }

    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    spawnParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x, y, color,
                vx: (Math.random() - 0.5) * 150,
                vy: (Math.random() - 0.5) * 150,
                life: 0.3 + Math.random() * 0.3,
                size: 2 + Math.random() * 3
            });
        }
    }

    rectsOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
    }

    // === RENDERING ===

    onRender(ctx, dt, timestamp) {
        // World warp transition
        if (this.transitioning && this.transitionType === 'world_warp') {
            this.renderWarpTransition(ctx, timestamp);
            return;
        }

        // Warp stuck effect
        if (this.warpStuck) {
            this.renderWarpStuck(ctx, timestamp);
            return;
        }

        this.renderTiles(ctx, timestamp);
        this.renderPickups(ctx, timestamp);
        this.renderProjectiles(ctx, timestamp);
        this.renderEnemies(ctx, timestamp);
        this.renderDarkEnemiesInLight(ctx, timestamp);
        this.renderLink(ctx, timestamp);
        this.renderSwordSwing(ctx, timestamp);
        this.renderParticles(ctx);
        this.renderCorruptionFlickers(ctx);
        this.renderLampEffects(ctx);
        this.renderZeldaHUD(ctx, timestamp);
        this.renderHauntOverlay(ctx, timestamp);
    }

    renderTiles(ctx, timestamp) {
        const map = this.getCurrentMap();
        if (!map) return;
        const allColors = { ...LIGHT_COLORS, ...DARK_COLORS };

        for (let r = 0; r < this.mapRows; r++) {
            for (let c = 0; c < this.mapCols; c++) {
                const tile = map.grid[r][c];
                const x = c * TILE;
                const y = r * TILE;
                const baseColor = allColors[tile] || '#333';

                ctx.fillStyle = baseColor;
                ctx.fillRect(x, y, TILE, TILE);

                // Tile details
                if (tile === T.GRASS || tile === T.DARK_GRASS) {
                    // Grass blades
                    ctx.fillStyle = 'rgba(0,0,0,0.1)';
                    ctx.fillRect(x + 8, y + 12, 2, 6);
                    ctx.fillRect(x + 20, y + 8, 2, 5);
                } else if (tile === T.TREE || tile === T.DARK_TREE) {
                    // Trunk
                    ctx.fillStyle = '#5a3a1a';
                    ctx.fillRect(x + 12, y + 16, 8, 16);
                    // Canopy
                    ctx.fillStyle = tile === T.DARK_TREE ? '#1a0820' : '#1a4a10';
                    ctx.beginPath();
                    ctx.arc(x + 16, y + 12, 12, 0, Math.PI * 2);
                    ctx.fill();
                } else if (tile === T.WATER || tile === T.DARK_WATER) {
                    // Water shimmer
                    const shimmer = Math.sin(timestamp * 3 + c * 0.5 + r * 0.3) * 0.15;
                    ctx.fillStyle = `rgba(255,255,255,${0.05 + shimmer})`;
                    ctx.fillRect(x + 4, y + 8 + Math.sin(timestamp * 2 + c) * 2, 12, 2);
                } else if (tile === T.WALL || tile === T.DARK_WALL) {
                    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                    ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
                    // Brick lines
                    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
                    ctx.beginPath();
                    ctx.moveTo(x, y + TILE / 2);
                    ctx.lineTo(x + TILE, y + TILE / 2);
                    ctx.moveTo(x + TILE / 2, y);
                    ctx.lineTo(x + TILE / 2, y + TILE / 2);
                    ctx.stroke();
                } else if (tile === T.DOOR) {
                    ctx.fillStyle = '#4a3020';
                    ctx.fillRect(x + 4, y + 2, TILE - 8, TILE - 4);
                    ctx.fillStyle = '#ffcc00';
                    ctx.fillRect(x + TILE / 2 - 2, y + TILE / 2, 4, 4);
                } else if (tile === T.CHEST) {
                    const map2 = this.getCurrentMap();
                    const isOpened = map2 && map2.chests.find(ch => ch.x === c && ch.y === r && ch.opened);
                    ctx.fillStyle = isOpened ? '#6a5522' : '#aa7722';
                    ctx.fillRect(x + 6, y + 8, TILE - 12, TILE - 12);
                    ctx.strokeStyle = '#554411';
                    ctx.strokeRect(x + 6, y + 8, TILE - 12, TILE - 12);
                    if (!isOpened) {
                        ctx.fillStyle = '#ffdd44';
                        ctx.fillRect(x + TILE / 2 - 2, y + TILE / 2 - 2, 4, 4);
                    }
                } else if (tile === T.BUSH) {
                    ctx.fillStyle = '#2a5a20';
                    ctx.beginPath();
                    ctx.arc(x + 16, y + 16, 12, 0, Math.PI * 2);
                    ctx.fill();
                } else if (tile === T.DARK_SKULL) {
                    ctx.fillStyle = '#5a3040';
                    ctx.fillRect(x + 8, y + 8, 16, 12);
                    ctx.fillStyle = '#2a1020';
                    ctx.fillRect(x + 10, y + 10, 4, 4);
                    ctx.fillRect(x + 18, y + 10, 4, 4);
                    ctx.fillRect(x + 13, y + 16, 6, 4);
                }
            }
        }
    }

    renderLink(ctx, timestamp) {
        const link = this.link;

        // iFrames flicker
        if (link.iFrames > 0 && link.iFrames % 4 < 2) return;

        ctx.save();
        ctx.translate(link.x + link.w / 2, link.y + link.h / 2);

        // Body
        ctx.fillStyle = '#3a8a3a';
        ctx.fillRect(-link.w / 2, -link.h / 2, link.w, link.h);

        // Tunic detail
        ctx.fillStyle = '#2a6a2a';
        ctx.fillRect(-link.w / 2 + 2, -2, link.w - 4, link.h / 2);

        // Head (above body)
        ctx.fillStyle = '#d4a060';
        ctx.fillRect(-5, -link.h / 2 - 6, 10, 8);

        // Hair
        ctx.fillStyle = '#cc8844';
        ctx.fillRect(-6, -link.h / 2 - 8, 12, 4);

        // Hat (direction-based)
        ctx.fillStyle = '#3a8a3a';
        if (link.dir === 0 || link.dir === 3) {
            ctx.fillRect(3, -link.h / 2 - 10, 8, 4);
        } else if (link.dir === 2) {
            ctx.fillRect(-11, -link.h / 2 - 10, 8, 4);
        }

        // Eyes
        ctx.fillStyle = '#000';
        const eyeOff = DIR_OFFSETS[link.dir];
        ctx.fillRect(-3 + eyeOff.x * 2, -link.h / 2 - 3 + eyeOff.y, 2, 2);
        ctx.fillRect(1 + eyeOff.x * 2, -link.h / 2 - 3 + eyeOff.y, 2, 2);

        // Shield (left side for right-facing, etc.)
        ctx.fillStyle = '#2244aa';
        if (link.dir === 3) ctx.fillRect(-link.w / 2 - 4, -4, 6, 10);
        else if (link.dir === 2) ctx.fillRect(link.w / 2 - 2, -4, 6, 10);

        ctx.restore();
    }

    renderSwordSwing(ctx, timestamp) {
        if (!this.swordHitbox) return;
        const s = this.swordHitbox;
        const progress = 1 - (s.timer / SWORD_DURATION);

        ctx.save();
        ctx.translate(s.x + 10, s.y + 10);
        ctx.rotate(progress * Math.PI * 0.6 - 0.3);

        // Sword blade
        ctx.fillStyle = '#ccccdd';
        ctx.fillRect(-2, -16, 4, 20);
        // Hilt
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(-4, 4, 8, 4);
        // Swing arc
        ctx.strokeStyle = `rgba(200,220,255,${0.6 - progress * 0.6})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 14, -0.5, progress * 1.2);
        ctx.stroke();

        ctx.restore();
    }

    renderEnemies(ctx, timestamp) {
        const enemies = this.getCurrentEnemies();
        if (!enemies) return;

        for (const e of enemies) {
            if (!e.alive) continue;
            const flash = e.flashTimer > 0 && e.flashTimer % 2 === 0;

            ctx.save();
            ctx.translate(e.x, e.y);

            // Body
            ctx.fillStyle = flash ? '#fff' : e.color;
            ctx.fillRect(-e.w / 2, -e.h / 2, e.w, e.h);

            // Armor detail
            ctx.fillStyle = flash ? '#ddd' : (e.type === 'dark_soldier' ? '#6a1030' : '#1a3488');
            ctx.fillRect(-e.w / 2 + 2, -e.h / 2 + 2, e.w - 4, 8);

            // Eyes
            ctx.fillStyle = e.type === 'dark_soldier' ? '#ff0000' : '#fff';
            ctx.fillRect(-3, -6, 2, 2);
            ctx.fillRect(1, -6, 2, 2);

            // Spear
            const off = DIR_OFFSETS[e.dir];
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(off.x * 16, off.y * 16);
            ctx.stroke();
            ctx.fillStyle = '#aaa';
            ctx.fillRect(off.x * 14 - 2, off.y * 14 - 2, 4, 4);

            ctx.restore();
        }
    }

    renderDarkEnemiesInLight(ctx, timestamp) {
        for (const de of this.darkEnemiesInLight) {
            if (!de.alive) continue;
            ctx.save();
            ctx.globalAlpha = 0.6 + Math.sin(timestamp * 5) * 0.2;
            ctx.translate(de.x, de.y);

            // Ghostly dark soldier
            ctx.fillStyle = '#6a0030';
            ctx.fillRect(-de.w / 2, -de.h / 2, de.w, de.h);
            ctx.fillStyle = '#ff0040';
            ctx.fillRect(-3, -6, 2, 2);
            ctx.fillRect(1, -6, 2, 2);

            // Aura
            ctx.strokeStyle = 'rgba(100,0,50,0.3)';
            ctx.beginPath();
            ctx.arc(0, 0, 16, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
        }
    }

    renderProjectiles(ctx, timestamp) {
        for (const p of this.projectiles) {
            ctx.save();
            ctx.translate(p.x, p.y);

            switch (p.type) {
                case 'arrow':
                    ctx.fillStyle = '#8b4513';
                    ctx.fillRect(-3, -1, 10, 2);
                    ctx.fillStyle = '#aaa';
                    ctx.fillRect(5, -2, 4, 4);
                    break;
                case 'boomerang':
                    ctx.rotate(timestamp * 10);
                    ctx.fillStyle = '#4488ff';
                    ctx.fillRect(-6, -2, 12, 4);
                    ctx.fillRect(-2, -6, 4, 12);
                    break;
                case 'bomb':
                    ctx.fillStyle = '#222';
                    ctx.beginPath();
                    ctx.arc(0, 0, 6, 0, Math.PI * 2);
                    ctx.fill();
                    // Fuse spark
                    if (p.life < 1) {
                        ctx.fillStyle = p.life % 0.2 < 0.1 ? '#ff4400' : '#ff8800';
                        ctx.fillRect(-1, -8, 2, 4);
                    }
                    break;
                case 'hookshot':
                    // Chain
                    ctx.strokeStyle = '#888';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(p.startX - p.x, p.startY - p.y);
                    ctx.stroke();
                    // Head
                    ctx.fillStyle = '#aaa';
                    ctx.fillRect(-4, -4, 8, 8);
                    break;
            }
            ctx.restore();
        }
    }

    renderPickups(ctx, timestamp) {
        for (const p of this.pickups) {
            const bob = Math.sin(timestamp * 4 + p.x) * 2;
            if (p.type === 'heart') {
                ctx.fillStyle = '#ff3366';
                ctx.beginPath();
                ctx.arc(p.x - 3, p.y + bob - 2, 4, 0, Math.PI * 2);
                ctx.arc(p.x + 3, p.y + bob - 2, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(p.x - 6, p.y + bob);
                ctx.lineTo(p.x, p.y + bob + 6);
                ctx.lineTo(p.x + 6, p.y + bob);
                ctx.fill();
            } else {
                ctx.fillStyle = '#00cc44';
                ctx.beginPath();
                ctx.moveTo(p.x, p.y + bob - 5);
                ctx.lineTo(p.x + 5, p.y + bob);
                ctx.lineTo(p.x, p.y + bob + 5);
                ctx.lineTo(p.x - 5, p.y + bob);
                ctx.closePath();
                ctx.fill();
            }
        }
    }

    renderParticles(ctx) {
        for (const p of this.particles) {
            ctx.globalAlpha = Math.max(0, p.life / 0.4);
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.globalAlpha = 1;
    }

    renderCorruptionFlickers(ctx) {
        for (const f of this.corruptionFlickers) {
            ctx.fillStyle = f.dark ? 'rgba(60,0,40,0.5)' : 'rgba(40,80,40,0.3)';
            ctx.fillRect(f.x, f.y, f.w, f.h);
        }
    }

    renderLampEffects(ctx) {
        for (const eff of this.itemUseEffects) {
            if (eff.type === 'lamp') {
                const alpha = Math.min(1, eff.timer) * 0.4;
                const grad = ctx.createRadialGradient(eff.x, eff.y, 0, eff.x, eff.y, eff.radius);
                grad.addColorStop(0, `rgba(255,200,100,${alpha})`);
                grad.addColorStop(1, 'rgba(255,200,100,0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(eff.x, eff.y, eff.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    renderWarpTransition(ctx, timestamp) {
        const progress = this.transitionTimer / 1.0;
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        // Mode 7-style warp (spinning and scaling)
        ctx.save();

        // Draw current world tiles underneath
        this.renderTiles(ctx, timestamp);

        // Spiral overlay
        ctx.translate(centerX, centerY);
        ctx.rotate(progress * Math.PI * 4);
        ctx.scale(1 + progress * 2, 1 + progress * 2);
        ctx.translate(-centerX, -centerY);

        // Dark/light flash
        const flashColor = this.inDarkWorld ? 'rgba(60,100,60,' : 'rgba(60,0,60,';
        ctx.fillStyle = flashColor + (0.3 + Math.sin(progress * 20) * 0.2) + ')';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.restore();

        // Text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.inDarkWorld ? 'ENTERING LIGHT WORLD' : 'ENTERING DARK WORLD',
            centerX, centerY);
        ctx.textAlign = 'left';
    }

    renderWarpStuck(ctx, timestamp) {
        // Render both worlds overlapping
        this.renderTiles(ctx, timestamp);

        // Glitch overlay - torn between worlds
        const tearY = this.height / 2 + Math.sin(timestamp * 5) * 50;
        ctx.fillStyle = 'rgba(80,0,60,0.5)';
        ctx.fillRect(0, tearY, this.width, this.height - tearY);

        // Horizontal tear lines
        for (let i = 0; i < 5; i++) {
            const y = tearY + Math.sin(timestamp * 8 + i) * 20;
            ctx.fillStyle = `rgba(255,0,80,${0.3 + Math.random() * 0.2})`;
            ctx.fillRect(0, y, this.width, 2);
        }

        // Warning
        ctx.fillStyle = '#ff0050';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        const msgs = ['WARP FAILED', 'BETWEEN WORLDS', 'MIRROR CRACKED', 'CANNOT RETURN'];
        ctx.fillText(msgs[Math.floor(timestamp * 2) % msgs.length],
            this.width / 2 + (Math.random() - 0.5) * 10,
            this.height / 2);
        ctx.textAlign = 'left';
    }

    renderZeldaHUD(ctx, timestamp) {
        // Top bar background
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, this.width, 36);

        // Hearts
        const fullHearts = Math.floor(this.link.hp / 2);
        const halfHeart = this.link.hp % 2;
        const totalHearts = Math.floor(this.link.maxHp / 2);

        for (let i = 0; i < totalHearts; i++) {
            const hx = 10 + i * 18;
            const hy = 10;
            if (i < fullHearts) {
                ctx.fillStyle = '#ff3366';
            } else if (i === fullHearts && halfHeart) {
                ctx.fillStyle = '#993344';
            } else {
                ctx.fillStyle = '#333';
            }
            // Heart shape
            ctx.beginPath();
            ctx.arc(hx, hy, 5, 0, Math.PI * 2);
            ctx.arc(hx + 6, hy, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(hx - 5, hy + 2);
            ctx.lineTo(hx + 3, hy + 10);
            ctx.lineTo(hx + 11, hy + 2);
            ctx.fill();
        }

        // Rupees
        ctx.fillStyle = '#00cc44';
        ctx.font = '12px monospace';
        ctx.fillText(`x${this.link.rupees}`, 10, 30);

        // Current item
        ctx.fillStyle = '#aaa';
        ctx.font = '10px monospace';
        ctx.fillText(`[${ITEMS[this.link.currentItem]}]`, this.width / 2 - 40, 14);

        // World indicator
        ctx.fillStyle = this.inDarkWorld ? '#aa3355' : '#55aa55';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(this.inDarkWorld ? 'DARK WORLD' : 'LIGHT WORLD', this.width - 100, 14);

        // Screen coordinates
        ctx.fillStyle = '#666';
        ctx.font = '8px monospace';
        ctx.fillText(`(${this.currentScreen.x},${this.currentScreen.y})`, this.width - 100, 28);
    }

    renderHauntOverlay(ctx, timestamp) {
        if (this.hauntStage < 2) return;

        // Dark world vignette in light world
        if (!this.inDarkWorld && this.mirrorCrackLevel > 0) {
            const grad = ctx.createRadialGradient(
                this.width / 2, this.height / 2, this.width * 0.3,
                this.width / 2, this.height / 2, this.width * 0.7
            );
            grad.addColorStop(0, 'rgba(40,0,30,0)');
            grad.addColorStop(1, `rgba(40,0,30,${this.mirrorCrackLevel * 0.3})`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        // Stage 4: creepy messages
        if (this.hauntStage >= 4 && Math.random() < 0.008) {
            const msgs = [
                'THE DARK WORLD IS REAL',
                'LINK NEVER ESCAPED',
                'GANON WAS RIGHT',
                'THE MIRROR SHOWS TRUTH',
                'YOU ARE THE SHADOW'
            ];
            ctx.fillStyle = `rgba(200,0,80,${0.2 + Math.random() * 0.2})`;
            ctx.font = '16px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(msgs[Math.floor(Math.random() * msgs.length)],
                this.width / 2 + (Math.random() - 0.5) * 60,
                this.height / 2 + (Math.random() - 0.5) * 100);
            ctx.textAlign = 'left';
            sfx.play('whisper');
        }

        // Stage 3+: dark world scanlines bleeding through
        if (this.hauntStage >= 3 && !this.inDarkWorld) {
            for (let y = 0; y < this.height; y += 2) {
                if (Math.random() < this.corruptionLevel * 0.05) {
                    ctx.fillStyle = 'rgba(60,0,40,0.15)';
                    ctx.fillRect(0, y, this.width, 1);
                }
            }
        }
    }
}

export default CursedZeldaLttP;
