// corrupted-chrono-trigger.js — Top-down RPG with ATB battle system and time corruption
// Walk around a map, talk to NPCs, enter battles with an Active Time Battle system

import { GameBase } from './game-base.js';
import { input, BUTTONS } from '../core/input.js';
import { sfx } from '../audio/sfx.js';
import state from '../core/state.js';
import { events, EVENTS } from '../core/events.js';

// Map constants
const TILE = 24;
const MAP_W = 20;
const MAP_H = 16;
const PLAYER_SPEED = 2.5;

// Battle constants
const ATB_MAX = 100;
const ATB_SPEED = 30;
const ENEMY_ATB_SPEED = 20;

// Menu items
const BATTLE_MENU = ['FIGHT', 'MAGIC', 'ITEM', 'RUN'];
const MAGIC_SPELLS = [
    { name: 'FIRE', cost: 5, damage: 25, type: 'attack' },
    { name: 'ICE', cost: 5, damage: 22, type: 'attack' },
    { name: 'HEAL', cost: 8, damage: -35, type: 'heal' },
    { name: 'HASTE', cost: 10, damage: 0, type: 'buff' }
];

export class CorruptedChronoTrigger extends GameBase {
    constructor() {
        super({
            id: 'chrono-trigger',
            name: 'CORRUPTED CHRONO TRIGGER',
            channel: 9,
            titleColor: '#44ccff',
            bgColor: '#000020',
            titleText: 'CORRUPTED CHRONO TRIGGER'
        });

        // Mode: 'overworld' or 'battle'
        this.mode = 'overworld';

        // Player overworld
        this.player = null;
        this.mapData = [];
        this.npcs = [];
        this.camera = { x: 0, y: 0 };
        this.dialogBox = null;
        this.dialogTimer = 0;

        // Battle state
        this.battle = null;
        this.battleTransition = 0;
        this.battleMenu = { active: false, index: 0, submenu: null, subIndex: 0 };

        // Party
        this.party = [];
        this.enemies = [];

        // Clock / time
        this.gameClock = 0;
        this.clockDirection = 1;
        this.saveFileDate = null;

        // Items
        this.items = [
            { name: 'POTION', count: 5, heal: 30 },
            { name: 'ETHER', count: 3, mp: 15 },
            { name: 'REVIVE', count: 1, heal: 50 }
        ];

        // Haunting
        this.timeDistortionTimer = 0;
        this.futureDialogs = [
            'YOU WILL COME BACK HERE IN 400 YEARS...',
            'THE WORLD ENDS AT 1999 A.D.',
            'I REMEMBER YOU FROM TOMORROW',
            'THE CLOCK CANNOT BE TRUSTED',
            'SAVE FILE CORRUPTED: YEAR 2\u0335300',
            'DO NOT OPEN THE TIME GATES',
            'HE DIED IN EVERY TIMELINE'
        ];
        this.normalDialogs = [
            'WELCOME TO LEENE SQUARE!',
            'THE MILLENNIAL FAIR IS TODAY!',
            'HAVE YOU SEEN MARLE?',
            'THE PENDANT IS GLOWING...',
            'CRONO, BE CAREFUL OUT THERE.',
            'SOMETHING FEELS WRONG TODAY.'
        ];
        this.encounterCooldown = 0;
        this.battleFlashTimer = 0;
        this.screenDistortion = 0;
        this.saveCorruptionShown = false;
    }

    onInit() {
        this.resetGame();
    }

    onStart() {
        this.resetGame();
    }

    onStop() {
        this.clearTimers();
    }

    onRestart() {
        this.resetGame();
    }

    onDeath() {
        this.mode = 'overworld';
        this.respawnPlayer();
    }

    onTitleDismiss() {
        sfx.play('confirm');
    }

    resetGame() {
        this.mode = 'overworld';
        this.gameClock = 0;
        this.clockDirection = 1;
        this.saveFileDate = null;
        this.saveCorruptionShown = false;
        this.encounterCooldown = 3;
        this.battleFlashTimer = 0;
        this.screenDistortion = 0;
        this.timeDistortionTimer = 0;
        this.score = 0;
        this.lives = 3;

        this.items = [
            { name: 'POTION', count: 5, heal: 30 },
            { name: 'ETHER', count: 3, mp: 15 },
            { name: 'REVIVE', count: 1, heal: 50 }
        ];

        this.buildMap();
        this.spawnPlayer();
        this.spawnNPCs();

        this.party = [
            { name: 'CRONO', hp: 120, maxHp: 120, mp: 30, maxMp: 30, atb: 0, atk: 18, def: 10, alive: true, color: '#ff4444' },
            { name: 'MARLE', hp: 90, maxHp: 90, mp: 50, maxMp: 50, atb: 0, atk: 12, def: 8, alive: true, color: '#44aaff' },
            { name: 'LUCCA', hp: 80, maxHp: 80, mp: 60, maxMp: 60, atb: 0, atk: 14, def: 7, alive: true, color: '#aa44ff' }
        ];

        this.battle = null;
        this.battleMenu = { active: false, index: 0, submenu: null, subIndex: 0 };
    }

    buildMap() {
        this.mapData = [];
        for (let y = 0; y < MAP_H; y++) {
            const row = [];
            for (let x = 0; x < MAP_W; x++) {
                if (x === 0 || x === MAP_W - 1 || y === 0 || y === MAP_H - 1) {
                    row.push(1);
                } else if ((y === 7 || y === 8) && x > 2 && x < MAP_W - 3) {
                    row.push(3);
                } else if ((x === 10) && y > 2 && y < MAP_H - 3) {
                    row.push(3);
                } else if (x >= 3 && x <= 5 && y >= 2 && y <= 4) {
                    row.push(4);
                } else if (x >= 14 && x <= 17 && y >= 2 && y <= 4) {
                    row.push(4);
                } else if (x >= 14 && x <= 17 && y >= 10 && y <= 12) {
                    row.push(4);
                } else if (x >= 1 && x <= 3 && y >= 11 && y <= 13) {
                    row.push(2);
                } else {
                    row.push(0);
                }
            }
            this.mapData.push(row);
        }
    }

    spawnPlayer() {
        this.player = {
            x: 10 * TILE,
            y: 8 * TILE,
            width: 16,
            height: 20,
            facing: 0,
            animTimer: 0,
            animFrame: 0,
            moving: false
        };
    }

    respawnPlayer() {
        this.player.x = 10 * TILE;
        this.player.y = 8 * TILE;
        for (const member of this.party) {
            member.hp = Math.max(1, Math.floor(member.maxHp * 0.3));
            member.alive = true;
            member.atb = 0;
        }
    }

    spawnNPCs() {
        this.npcs = [
            { x: 4 * TILE, y: 5 * TILE, name: 'ELDER', color: '#888888', facing: 0, dialogIndex: 0 },
            { x: 15 * TILE, y: 5 * TILE, name: 'GUARD', color: '#446644', facing: 0, dialogIndex: 1 },
            { x: 7 * TILE, y: 10 * TILE, name: 'GIRL', color: '#cc66aa', facing: 0, dialogIndex: 2 },
            { x: 16 * TILE, y: 13 * TILE, name: 'OLD MAN', color: '#997744', facing: 0, dialogIndex: 3 },
            { x: 12 * TILE, y: 5 * TILE, name: 'CAT', color: '#ddaa44', facing: 0, dialogIndex: 4 }
        ];
    }

    getTile(tx, ty) {
        if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) return 1;
        return this.mapData[ty][tx];
    }

    isWalkable(px, py) {
        const tx = Math.floor(px / TILE);
        const ty = Math.floor(py / TILE);
        const tile = this.getTile(tx, ty);
        return tile !== 1 && tile !== 2 && tile !== 4;
    }

    onUpdate(dt, timestamp) {
        const dtSec = dt / 1000;
        this.updateTimers(dt);

        // Game clock
        this.gameClock += dtSec * this.clockDirection;

        // Haunting: clock runs backward at stage 2+
        if (this.hauntStage >= 2) {
            this.clockDirection = -1;
        }

        // Time distortion at stage 3+
        if (this.hauntStage >= 3) {
            this.timeDistortionTimer += dtSec;
        }

        // Save file corruption at stage 4
        if (this.hauntStage >= 4 && !this.saveCorruptionShown && this.gameClock < -10) {
            this.saveCorruptionShown = true;
            this.saveFileDate = 'YEAR 2\u0335300 A.D.';
            sfx.play('glitch');
            events.emit(EVENTS.HAUNT_GLITCH, { type: 'save_corruption', game: this.id });
        }

        // Battle flash transition
        if (this.battleFlashTimer > 0) {
            this.battleFlashTimer -= dtSec;
            if (this.battleFlashTimer <= 0 && this.mode !== 'battle') {
                this.startBattle();
            }
            return;
        }

        if (this.mode === 'overworld') {
            this.updateOverworld(dtSec, timestamp);
        } else if (this.mode === 'battle') {
            this.updateBattle(dtSec, timestamp);
        }

        // Screen distortion
        if (this.hauntStage >= 3) {
            this.screenDistortion = Math.sin(timestamp / 500) * this.corruptionLevel * 3;
        }
    }

    updateOverworld(dtSec, timestamp) {
        const p = this.player;
        const dpad = input.getDPad();
        p.moving = false;

        let nx = p.x;
        let ny = p.y;

        if (dpad.x !== 0 || dpad.y !== 0) {
            p.moving = true;
            nx += dpad.x * PLAYER_SPEED;
            ny += dpad.y * PLAYER_SPEED;

            if (dpad.y > 0) p.facing = 0;
            else if (dpad.y < 0) p.facing = 1;
            else if (dpad.x < 0) p.facing = 2;
            else if (dpad.x > 0) p.facing = 3;
        }

        if (this.isWalkable(nx + 2, ny + 2) && this.isWalkable(nx + p.width - 2, ny + p.height - 2) &&
            this.isWalkable(nx + 2, ny + p.height - 2) && this.isWalkable(nx + p.width - 2, ny + 2)) {
            p.x = nx;
            p.y = ny;
        }

        if (p.moving) {
            p.animTimer += dtSec;
            if (p.animTimer > 0.15) {
                p.animFrame = (p.animFrame + 1) % 4;
                p.animTimer = 0;
            }
        } else {
            p.animFrame = 0;
        }

        // Camera
        this.camera.x = p.x - this.width / 2 + p.width / 2;
        this.camera.y = p.y - this.height / 2 + p.height / 2;
        this.camera.x = Math.max(0, Math.min(MAP_W * TILE - this.width, this.camera.x));
        this.camera.y = Math.max(0, Math.min(MAP_H * TILE - this.height, this.camera.y));

        // NPC interaction
        if (input.isJustPressed(BUTTONS.A)) {
            this.checkNPCInteraction();
        }

        // Dialog dismiss
        if (this.dialogBox && input.isJustPressed(BUTTONS.B)) {
            this.dialogBox = null;
        }
        if (this.dialogBox) {
            this.dialogTimer += dtSec;
        }

        // Random encounters on grass
        this.encounterCooldown -= dtSec;
        if (p.moving && this.encounterCooldown <= 0) {
            const tx = Math.floor(p.x / TILE);
            const ty = Math.floor(p.y / TILE);
            const tile = this.getTile(tx, ty);
            if (tile === 0 && Math.random() < 0.008) {
                this.encounterCooldown = 4;
                this.battleFlashTimer = 0.6;
                sfx.play('scare');
            }
        }
    }

    checkNPCInteraction() {
        const p = this.player;
        const interactDist = TILE * 1.5;

        for (const npc of this.npcs) {
            const dx = Math.abs(p.x - npc.x);
            const dy = Math.abs(p.y - npc.y);
            if (dx < interactDist && dy < interactDist) {
                let dialog;
                if (this.hauntStage >= 2 && Math.random() < 0.4) {
                    dialog = this.futureDialogs[Math.floor(Math.random() * this.futureDialogs.length)];
                } else {
                    dialog = this.normalDialogs[npc.dialogIndex % this.normalDialogs.length];
                }

                this.dialogBox = { text: dialog, speaker: npc.name };
                this.dialogTimer = 0;
                sfx.play('select');

                // Narrative fragment from NPCs
                if (this.hauntStage >= 2 && Math.random() < 0.1) {
                    events.emit(EVENTS.NARRATIVE_FRAGMENT, {
                        text: 'THE NPCS REMEMBER A DIFFERENT PLAYER',
                        game: this.id
                    });
                }
                break;
            }
        }
    }

    startBattle() {
        this.mode = 'battle';
        this.battleMenu = { active: false, index: 0, submenu: null, subIndex: 0 };

        for (const member of this.party) {
            member.atb = Math.random() * 30;
        }

        const enemyCount = 1 + Math.floor(Math.random() * 3);
        this.enemies = [];
        const enemyTypes = [
            { name: 'IMP', hp: 40, maxHp: 40, atk: 8, def: 3, color: '#44aa44' },
            { name: 'NAGA', hp: 65, maxHp: 65, atk: 12, def: 5, color: '#aa44aa' },
            { name: 'HENCH', hp: 50, maxHp: 50, atk: 10, def: 4, color: '#4444aa' }
        ];

        // Stage 3+ impossible enemies
        if (this.hauntStage >= 3 && Math.random() < 0.3) {
            enemyTypes.push(
                { name: 'T\u0335I\u0336M\u0337E ERROR', hp: 999, maxHp: 999, atk: 25, def: 15, color: '#ff00ff' }
            );
        }

        for (let i = 0; i < enemyCount; i++) {
            const template = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
            this.enemies.push({
                ...template,
                hp: template.hp,
                atb: Math.random() * 20,
                x: 320 + i * 60,
                y: 140 + i * 40,
                alive: true,
                flashTimer: 0
            });
        }

        sfx.play('confirm');
    }

    updateBattle(dtSec, timestamp) {
        // ATB fills for party
        for (const member of this.party) {
            if (!member.alive) continue;

            let atbRate = ATB_SPEED;
            if (member.hasted) atbRate *= 1.5;

            // Time distortion corruption affects ATB
            if (this.hauntStage >= 3) {
                atbRate += Math.sin(timestamp / 500) * 10;
            }

            member.atb = Math.min(ATB_MAX, member.atb + atbRate * dtSec);

            if (member.atb >= ATB_MAX && !this.battleMenu.active) {
                this.battleMenu.active = true;
                this.battleMenu.activeMember = member;
                this.battleMenu.index = 0;
                this.battleMenu.submenu = null;
            }
        }

        // ATB fills for enemies
        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;
            enemy.flashTimer = Math.max(0, enemy.flashTimer - dtSec);
            enemy.atb = Math.min(ATB_MAX, enemy.atb + ENEMY_ATB_SPEED * dtSec);

            if (enemy.atb >= ATB_MAX) {
                this.enemyAttack(enemy);
                enemy.atb = 0;
            }
        }

        // Battle menu input
        if (this.battleMenu.active) {
            this.handleBattleMenu(dtSec);
        }

        // Check battle end
        const allEnemiesDead = this.enemies.every(e => !e.alive);
        const allPartyDead = this.party.every(m => !m.alive);

        if (allEnemiesDead) {
            this.endBattle(true);
        } else if (allPartyDead) {
            this.endBattle(false);
        }
    }

    handleBattleMenu(dtSec) {
        const menu = this.battleMenu;

        if (menu.submenu === null) {
            if (input.isJustPressed(BUTTONS.DOWN)) {
                menu.index = (menu.index + 1) % BATTLE_MENU.length;
                sfx.play('menuMove');
            }
            if (input.isJustPressed(BUTTONS.UP)) {
                menu.index = (menu.index - 1 + BATTLE_MENU.length) % BATTLE_MENU.length;
                sfx.play('menuMove');
            }

            if (input.isJustPressed(BUTTONS.A)) {
                const choice = BATTLE_MENU[menu.index];
                if (choice === 'FIGHT') {
                    this.executeFight(menu.activeMember);
                } else if (choice === 'MAGIC') {
                    menu.submenu = 'magic';
                    menu.subIndex = 0;
                    sfx.play('select');
                } else if (choice === 'ITEM') {
                    menu.submenu = 'item';
                    menu.subIndex = 0;
                    sfx.play('select');
                } else if (choice === 'RUN') {
                    this.attemptRun();
                }
            }

            if (input.isJustPressed(BUTTONS.B)) {
                menu.active = false;
                if (menu.activeMember) menu.activeMember.atb = ATB_MAX * 0.5;
            }
        } else if (menu.submenu === 'magic') {
            if (input.isJustPressed(BUTTONS.DOWN)) {
                menu.subIndex = (menu.subIndex + 1) % MAGIC_SPELLS.length;
                sfx.play('menuMove');
            }
            if (input.isJustPressed(BUTTONS.UP)) {
                menu.subIndex = (menu.subIndex - 1 + MAGIC_SPELLS.length) % MAGIC_SPELLS.length;
                sfx.play('menuMove');
            }
            if (input.isJustPressed(BUTTONS.A)) {
                this.executeMagic(menu.activeMember, MAGIC_SPELLS[menu.subIndex]);
            }
            if (input.isJustPressed(BUTTONS.B)) {
                menu.submenu = null;
                sfx.play('cancel');
            }
        } else if (menu.submenu === 'item') {
            const usableItems = this.items.filter(i => i.count > 0);
            if (usableItems.length === 0) {
                menu.submenu = null;
                return;
            }
            if (input.isJustPressed(BUTTONS.DOWN)) {
                menu.subIndex = (menu.subIndex + 1) % usableItems.length;
                sfx.play('menuMove');
            }
            if (input.isJustPressed(BUTTONS.UP)) {
                menu.subIndex = (menu.subIndex - 1 + usableItems.length) % usableItems.length;
                sfx.play('menuMove');
            }
            if (input.isJustPressed(BUTTONS.A)) {
                this.executeItem(menu.activeMember, usableItems[menu.subIndex]);
            }
            if (input.isJustPressed(BUTTONS.B)) {
                menu.submenu = null;
                sfx.play('cancel');
            }
        }
    }

    executeFight(member) {
        const target = this.enemies.find(e => e.alive);
        if (!target) return;

        const damage = Math.max(1, member.atk - target.def + Math.floor(Math.random() * 5));
        target.hp -= damage;
        target.flashTimer = 0.3;
        if (target.hp <= 0) {
            target.alive = false;
            this.addScore(50);
        }

        sfx.play('sword');
        member.atb = 0;
        this.battleMenu.active = false;
    }

    executeMagic(member, spell) {
        if (member.mp < spell.cost) {
            sfx.play('cancel');
            return;
        }

        member.mp -= spell.cost;

        if (spell.type === 'attack') {
            const target = this.enemies.find(e => e.alive);
            if (target) {
                target.hp -= spell.damage;
                target.flashTimer = 0.4;
                if (target.hp <= 0) {
                    target.alive = false;
                    this.addScore(50);
                }
            }
            sfx.play('shoot');
        } else if (spell.type === 'heal') {
            const weakest = this.party.filter(m => m.alive).sort((a, b) => a.hp - b.hp)[0];
            if (weakest) {
                weakest.hp = Math.min(weakest.maxHp, weakest.hp + Math.abs(spell.damage));
            }
            sfx.play('heal');
        } else if (spell.type === 'buff') {
            member.hasted = true;
            sfx.play('powerUp');
        }

        member.atb = 0;
        this.battleMenu.active = false;
    }

    executeItem(member, item) {
        if (item.count <= 0) return;
        item.count--;

        if (item.heal) {
            const weakest = this.party.filter(m => m.alive).sort((a, b) => a.hp - b.hp)[0];
            if (weakest) {
                weakest.hp = Math.min(weakest.maxHp, weakest.hp + item.heal);
            }
            sfx.play('heal');
        }
        if (item.mp) {
            member.mp = Math.min(member.maxMp, member.mp + item.mp);
            sfx.play('heal');
        }

        member.atb = 0;
        this.battleMenu.active = false;
    }

    attemptRun() {
        if (Math.random() < 0.5) {
            this.mode = 'overworld';
            this.encounterCooldown = 3;
            sfx.play('confirm');
        } else {
            sfx.play('cancel');
            if (this.battleMenu.activeMember) {
                this.battleMenu.activeMember.atb = 0;
            }
        }
        this.battleMenu.active = false;
    }

    enemyAttack(enemy) {
        const aliveParty = this.party.filter(m => m.alive);
        if (aliveParty.length === 0) return;

        const target = aliveParty[Math.floor(Math.random() * aliveParty.length)];
        const damage = Math.max(1, enemy.atk - target.def + Math.floor(Math.random() * 4));
        target.hp -= damage;

        if (target.hp <= 0) {
            target.hp = 0;
            target.alive = false;
        }

        sfx.play('damage');
    }

    endBattle(won) {
        this.mode = 'overworld';
        this.encounterCooldown = 4;

        if (won) {
            this.addScore(200);
            sfx.play('levelUp');
            for (const m of this.party) {
                if (m.alive) m.mp = Math.min(m.maxMp, m.mp + 5);
            }

            // Save files from future dates (corruption)
            if (this.hauntStage >= 2 && Math.random() < 0.2) {
                events.emit(EVENTS.NARRATIVE_FRAGMENT, {
                    text: 'SAVE FILE DATE: 12/14/2034 - 40 YEARS FROM NOW',
                    game: this.id
                });
            }
        } else {
            sfx.play('death');
            this.die();
        }
    }

    // ==================== RENDERING ====================

    onRender(ctx, dt, timestamp) {
        if (this.battleFlashTimer > 0) {
            const intensity = Math.sin(this.battleFlashTimer * 20);
            ctx.fillStyle = intensity > 0 ? '#fff' : '#000';
            ctx.fillRect(0, 0, this.width, this.height);
            return;
        }

        if (this.mode === 'overworld') {
            this.renderOverworld(ctx, timestamp);
        } else if (this.mode === 'battle') {
            this.renderBattle(ctx, timestamp);
        }

        // Time distortion overlay
        if (this.hauntStage >= 3) {
            this.renderTimeDistortion(ctx, timestamp);
        }

        // Clock display
        this.renderClock(ctx, timestamp);

        // Save file corruption display
        if (this.saveCorruptionShown) {
            ctx.fillStyle = `rgba(0, 0, 0, ${0.5 + Math.sin(timestamp / 400) * 0.2})`;
            ctx.fillRect(this.width / 2 - 100, this.height - 50, 200, 30);
            ctx.fillStyle = '#ff0044';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`SAVE: ${this.saveFileDate}`, this.width / 2, this.height - 32);
            ctx.textAlign = 'left';
        }
    }

    renderOverworld(ctx, timestamp) {
        const camX = this.camera.x;
        const camY = this.camera.y;

        const startTX = Math.floor(camX / TILE);
        const startTY = Math.floor(camY / TILE);
        const endTX = Math.ceil((camX + this.width) / TILE);
        const endTY = Math.ceil((camY + this.height) / TILE);

        for (let ty = startTY; ty <= endTY; ty++) {
            for (let tx = startTX; tx <= endTX; tx++) {
                let tile = this.getTile(tx, ty);
                const sx = tx * TILE - camX;
                const sy = ty * TILE - camY;

                // Corruption: randomly swap tiles at stage 3+
                if (this.hauntStage >= 3 && Math.random() < 0.003) {
                    tile = Math.floor(Math.random() * 5);
                }

                switch (tile) {
                    case 0: // Grass
                        ctx.fillStyle = '#2a6a2a';
                        ctx.fillRect(sx, sy, TILE, TILE);
                        if ((tx + ty) % 3 === 0) {
                            ctx.fillStyle = '#3a7a3a';
                            ctx.fillRect(sx + 4, sy + 4, 3, 3);
                            ctx.fillRect(sx + 14, sy + 12, 3, 3);
                        }
                        break;
                    case 1: // Wall
                        ctx.fillStyle = '#555566';
                        ctx.fillRect(sx, sy, TILE, TILE);
                        ctx.fillStyle = '#444455';
                        ctx.fillRect(sx, sy, TILE, 3);
                        ctx.fillRect(sx, sy, 3, TILE);
                        break;
                    case 2: // Water
                        ctx.fillStyle = '#224488';
                        ctx.fillRect(sx, sy, TILE, TILE);
                        ctx.fillStyle = `rgba(100, 150, 255, ${0.3 + Math.sin(timestamp / 500 + tx) * 0.1})`;
                        ctx.fillRect(sx, sy + Math.sin(timestamp / 300 + tx * 2) * 2, TILE, TILE / 2);
                        break;
                    case 3: // Path
                        ctx.fillStyle = '#887755';
                        ctx.fillRect(sx, sy, TILE, TILE);
                        ctx.fillStyle = '#776644';
                        if ((tx + ty) % 2 === 0) ctx.fillRect(sx + 2, sy + 2, 4, 4);
                        break;
                    case 4: // Building
                        ctx.fillStyle = '#775533';
                        ctx.fillRect(sx, sy, TILE, TILE);
                        ctx.fillStyle = '#664422';
                        ctx.fillRect(sx, sy, TILE, 4);
                        ctx.fillStyle = '#aaccdd';
                        ctx.fillRect(sx + 8, sy + 8, 8, 8);
                        break;
                }
            }
        }

        // Draw NPCs
        for (const npc of this.npcs) {
            const nx = npc.x - camX;
            const ny = npc.y - camY;
            if (nx < -TILE || nx > this.width + TILE || ny < -TILE || ny > this.height + TILE) continue;

            ctx.fillStyle = npc.color;
            ctx.fillRect(nx + 2, ny + 4, 12, 12);
            ctx.fillStyle = '#DDAA77';
            ctx.beginPath();
            ctx.arc(nx + 8, ny + 2, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.fillRect(nx + 5, ny, 2, 2);
            ctx.fillRect(nx + 9, ny, 2, 2);

            // Haunting: NPCs have red eyes at stage 4
            if (this.hauntStage >= 4 && Math.random() < 0.1) {
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(nx + 5, ny, 2, 2);
                ctx.fillRect(nx + 9, ny, 2, 2);
            }

            // NPC name tag
            ctx.fillStyle = '#fff';
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(npc.name, nx + 8, ny - 5);
            ctx.textAlign = 'left';
        }

        // Draw player
        this.renderOverworldPlayer(ctx, camX, camY, timestamp);

        // Dialog box
        if (this.dialogBox) {
            this.renderDialogBox(ctx, timestamp);
        }
    }

    renderOverworldPlayer(ctx, camX, camY, timestamp) {
        const p = this.player;
        const px = p.x - camX;
        const py = p.y - camY;

        // Body
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(px + 2, py + 6, 12, 10);

        // Head
        ctx.fillStyle = '#FFCC99';
        ctx.beginPath();
        ctx.arc(px + 8, py + 3, 6, 0, Math.PI * 2);
        ctx.fill();

        // Hair (spiky like Crono)
        ctx.fillStyle = '#cc4444';
        ctx.fillRect(px + 3, py - 3, 10, 5);
        ctx.fillRect(px + 2, py - 5, 3, 4);
        ctx.fillRect(px + 7, py - 6, 3, 4);
        ctx.fillRect(px + 11, py - 4, 3, 3);

        // Eyes
        ctx.fillStyle = '#000';
        switch (p.facing) {
            case 0:
                ctx.fillRect(px + 5, py + 3, 2, 2);
                ctx.fillRect(px + 9, py + 3, 2, 2);
                break;
            case 1:
                ctx.fillRect(px + 5, py + 1, 2, 2);
                ctx.fillRect(px + 9, py + 1, 2, 2);
                break;
            case 2:
                ctx.fillRect(px + 3, py + 2, 2, 2);
                ctx.fillRect(px + 7, py + 2, 2, 2);
                break;
            case 3:
                ctx.fillRect(px + 7, py + 2, 2, 2);
                ctx.fillRect(px + 11, py + 2, 2, 2);
                break;
        }

        // Legs (animated)
        ctx.fillStyle = '#1a1a66';
        if (p.moving) {
            const step = Math.sin(p.animTimer * 10) * 3;
            ctx.fillRect(px + 3 + step, py + 15, 5, 6);
            ctx.fillRect(px + 8 - step, py + 15, 5, 6);
        } else {
            ctx.fillRect(px + 3, py + 15, 5, 5);
            ctx.fillRect(px + 8, py + 15, 5, 5);
        }
    }

    renderDialogBox(ctx, timestamp) {
        const boxY = this.height - 100;

        ctx.fillStyle = '#111133';
        ctx.fillRect(20, boxY, this.width - 40, 80);
        ctx.strokeStyle = '#4466aa';
        ctx.lineWidth = 2;
        ctx.strokeRect(20, boxY, this.width - 40, 80);

        // Speaker name
        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(this.dialogBox.speaker, 35, boxY + 16);

        // Dialog text (typewriter effect)
        const charCount = Math.min(this.dialogBox.text.length, Math.floor(this.dialogTimer * 30));
        const visibleText = this.dialogBox.text.substring(0, charCount);

        ctx.fillStyle = this.hauntStage >= 2 ? '#ff8888' : '#fff';
        ctx.font = '11px monospace';

        // Word wrap
        const maxLineWidth = this.width - 80;
        const words = visibleText.split(' ');
        let line = '';
        let lineY = boxY + 35;
        for (const word of words) {
            const testLine = line + word + ' ';
            if (ctx.measureText(testLine).width > maxLineWidth) {
                ctx.fillText(line, 35, lineY);
                line = word + ' ';
                lineY += 16;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, 35, lineY);

        // Continue indicator
        if (charCount >= this.dialogBox.text.length) {
            if (Math.sin(timestamp / 300) > 0) {
                ctx.fillStyle = '#4466aa';
                ctx.font = '12px monospace';
                ctx.fillText('v', this.width - 55, boxY + 68);
            }
        }

        // Haunting: dialog flicker
        if (this.hauntStage >= 2 && Math.random() < 0.02) {
            ctx.fillStyle = 'rgba(255, 0, 60, 0.2)';
            ctx.fillRect(20, boxY, this.width - 40, 80);
        }
    }

    renderBattle(ctx, timestamp) {
        // Battle background
        const grad = ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, this.hauntStage >= 3 ? '#1a0020' : '#0a0a30');
        grad.addColorStop(1, '#050520');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);

        // Battle ground
        ctx.fillStyle = '#2a2a40';
        ctx.fillRect(0, this.height * 0.55, this.width, this.height * 0.45);

        // Grid lines on ground
        ctx.strokeStyle = 'rgba(100, 100, 150, 0.2)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 10; i++) {
            const ly = this.height * 0.55 + i * 20;
            ctx.beginPath();
            ctx.moveTo(0, ly);
            ctx.lineTo(this.width, ly);
            ctx.stroke();
        }

        // Enemies
        for (let i = 0; i < this.enemies.length; i++) {
            const enemy = this.enemies[i];
            if (!enemy.alive) continue;

            const ex = 280 + i * 70;
            const ey = 120 + i * 35;
            const bob = Math.sin(timestamp / 500 + i) * 3;

            if (enemy.flashTimer > 0 && Math.sin(enemy.flashTimer * 30) > 0) {
                ctx.fillStyle = '#fff';
            } else {
                ctx.fillStyle = enemy.color;
            }

            // Enemy body
            ctx.fillRect(ex, ey + bob, 30, 35);
            // Eyes
            ctx.fillStyle = '#fff';
            ctx.fillRect(ex + 6, ey + 8 + bob, 5, 5);
            ctx.fillRect(ex + 18, ey + 8 + bob, 5, 5);
            ctx.fillStyle = '#000';
            ctx.fillRect(ex + 7, ey + 9 + bob, 3, 3);
            ctx.fillRect(ex + 19, ey + 9 + bob, 3, 3);

            // Enemy name and HP
            ctx.fillStyle = '#fff';
            ctx.font = '9px monospace';
            ctx.fillText(enemy.name, ex, ey - 8);

            // HP bar
            ctx.fillStyle = '#333';
            ctx.fillRect(ex, ey - 4, 30, 3);
            ctx.fillStyle = '#cc2222';
            ctx.fillRect(ex, ey - 4, 30 * Math.max(0, enemy.hp / enemy.maxHp), 3);

            // ATB indicator
            const atbPct = enemy.atb / ATB_MAX;
            ctx.fillStyle = '#333';
            ctx.fillRect(ex, ey + 38 + bob, 30, 3);
            ctx.fillStyle = '#ff6600';
            ctx.fillRect(ex, ey + 38 + bob, 30 * atbPct, 3);
        }

        // Party display
        this.renderPartyStatus(ctx, timestamp);

        // Battle menu
        if (this.battleMenu.active) {
            this.renderBattleMenu(ctx, timestamp);
        }

        // Haunting: battle field distortion
        if (this.hauntStage >= 3 && Math.random() < 0.01) {
            ctx.fillStyle = `rgba(${Math.random() * 80}, 0, ${Math.random() * 80}, 0.2)`;
            ctx.fillRect(0, 0, this.width, this.height);
        }
    }

    renderPartyStatus(ctx, timestamp) {
        const panelY = this.height - 110;
        const panelH = 100;

        ctx.fillStyle = 'rgba(0, 0, 40, 0.85)';
        ctx.fillRect(10, panelY, 200, panelH);
        ctx.strokeStyle = '#4466aa';
        ctx.lineWidth = 1;
        ctx.strokeRect(10, panelY, 200, panelH);

        for (let i = 0; i < this.party.length; i++) {
            const member = this.party[i];
            const my = panelY + 8 + i * 30;

            ctx.fillStyle = member.alive ? member.color : '#555';
            ctx.font = 'bold 10px monospace';
            ctx.fillText(member.name, 20, my + 10);

            ctx.fillStyle = member.alive ? '#fff' : '#555';
            ctx.font = '9px monospace';
            ctx.fillText(`HP:${member.hp}/${member.maxHp}`, 80, my + 10);
            ctx.fillText(`MP:${member.mp}`, 155, my + 10);

            // ATB bar
            ctx.fillStyle = '#222';
            ctx.fillRect(80, my + 14, 80, 4);
            const atbPct = member.atb / ATB_MAX;
            ctx.fillStyle = atbPct >= 1 ? '#ffcc00' : '#336699';
            ctx.fillRect(80, my + 14, 80 * atbPct, 4);

            // Active indicator
            if (this.battleMenu.active && this.battleMenu.activeMember === member) {
                ctx.fillStyle = '#ffcc00';
                ctx.fillRect(14, my + 4, 4, 8);
            }
        }
    }

    renderBattleMenu(ctx, timestamp) {
        const menu = this.battleMenu;
        const menuX = 230;
        const menuY = this.height - 110;
        const menuW = 120;
        const menuH = 100;

        ctx.fillStyle = 'rgba(0, 0, 40, 0.9)';
        ctx.fillRect(menuX, menuY, menuW, menuH);
        ctx.strokeStyle = '#4466aa';
        ctx.lineWidth = 1;
        ctx.strokeRect(menuX, menuY, menuW, menuH);

        if (menu.submenu === null) {
            for (let i = 0; i < BATTLE_MENU.length; i++) {
                ctx.fillStyle = i === menu.index ? '#ffcc00' : '#aaa';
                ctx.font = '11px monospace';
                ctx.fillText(BATTLE_MENU[i], menuX + 20, menuY + 18 + i * 22);
            }
            ctx.fillStyle = '#ffcc00';
            ctx.fillText('>', menuX + 8, menuY + 18 + menu.index * 22);
        } else if (menu.submenu === 'magic') {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px monospace';
            ctx.fillText('MAGIC', menuX + 8, menuY + 14);

            for (let i = 0; i < MAGIC_SPELLS.length; i++) {
                const spell = MAGIC_SPELLS[i];
                ctx.fillStyle = i === menu.subIndex ? '#ffcc00' : '#aaa';
                ctx.font = '10px monospace';
                ctx.fillText(`${spell.name} ${spell.cost}MP`, menuX + 20, menuY + 30 + i * 16);
            }
            ctx.fillStyle = '#ffcc00';
            ctx.fillText('>', menuX + 8, menuY + 30 + menu.subIndex * 16);
        } else if (menu.submenu === 'item') {
            const usableItems = this.items.filter(i => i.count > 0);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px monospace';
            ctx.fillText('ITEMS', menuX + 8, menuY + 14);

            for (let i = 0; i < usableItems.length; i++) {
                ctx.fillStyle = i === menu.subIndex ? '#ffcc00' : '#aaa';
                ctx.font = '10px monospace';
                ctx.fillText(`${usableItems[i].name} x${usableItems[i].count}`, menuX + 20, menuY + 30 + i * 16);
            }
            if (usableItems.length > 0) {
                ctx.fillStyle = '#ffcc00';
                ctx.fillText('>', menuX + 8, menuY + 30 + menu.subIndex * 16);
            }
        }
    }

    renderClock(ctx, timestamp) {
        const totalSec = Math.abs(Math.floor(this.gameClock));
        const hours = Math.floor(totalSec / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        const secs = totalSec % 60;

        const clockStr = `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(this.width - 90, 5, 80, 20);

        if (this.clockDirection < 0) {
            ctx.fillStyle = '#ff0044';
        } else {
            ctx.fillStyle = '#aaccff';
        }

        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(clockStr, this.width - 15, 18);

        if (this.clockDirection < 0) {
            ctx.fillText('<<', this.width - 82, 18);
        }

        ctx.textAlign = 'left';
    }

    renderTimeDistortion(ctx, timestamp) {
        const intensity = this.corruptionLevel * 0.5;

        // Temporal ripple effect
        if (Math.random() < 0.02 * intensity) {
            const rippleX = Math.random() * this.width;
            const rippleY = Math.random() * this.height;
            ctx.strokeStyle = `rgba(100, 200, 255, ${0.2 * intensity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(rippleX, rippleY, 10 + Math.random() * 30, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Scanline shift
        if (Math.random() < 0.01 * intensity) {
            const ly = Math.random() * this.height;
            const shift = (Math.random() - 0.5) * intensity * 20;
            ctx.drawImage(ctx.canvas, shift, ly, this.width, 3, 0, ly, this.width, 3);
        }

        // Clock ghost images at stage 4
        if (this.hauntStage >= 4 && Math.random() < 0.005) {
            ctx.fillStyle = 'rgba(255, 0, 80, 0.15)';
            ctx.font = '20px monospace';
            ctx.textAlign = 'center';
            const futureYear = 1999 + Math.floor(Math.random() * 1000);
            ctx.fillText(`${futureYear} A.D.`, this.width / 2, this.height / 2);
            ctx.textAlign = 'left';
        }

        // Narrative fragment
        if (this.hauntStage >= 2 && Math.random() < 0.0003) {
            events.emit(EVENTS.NARRATIVE_FRAGMENT, {
                text: 'TIME FLOWS IN THE WRONG DIRECTION',
                game: this.id
            });
        }
    }
}

export default CorruptedChronoTrigger;
