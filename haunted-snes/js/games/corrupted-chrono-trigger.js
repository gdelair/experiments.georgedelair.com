// corrupted-chrono-trigger.js — Time-corruption RPG with ATB battles

import { GameBase } from './game-base.js';
import { input, BUTTONS } from '../core/input.js';
import { sfx } from '../audio/sfx.js';
import state from '../core/state.js';
import { events, EVENTS } from '../core/events.js';

export class CorruptedChronoTrigger extends GameBase {
    constructor() {
        super({
            id: 'chrono-trigger',
            name: 'CORRUPTED CHRONO TRIGGER',
            channel: 3,
            titleColor: '#4488ff',
            bgColor: '#000818',
            titleText: 'CORRUPTED CHRONO TRIGGER'
        });

        this.mode = 'overworld'; // overworld, battle, dialog
        this.player = { x: 256, y: 224, dir: 0, speed: 2, animTimer: 0 };
        this.mapWidth = 16;
        this.mapHeight = 14;
        this.tileSize = 32;
        this.map = [];
        this.npcs = [];
        this.currentNPC = null;
        this.dialogText = '';
        this.dialogTimer = 0;
        this.dialogQueue = [];

        // Battle
        this.inBattle = false;
        this.battleTimer = 0;
        this.battleMenuIndex = 0;
        this.battleItems = ['FIGHT', 'MAGIC', 'ITEM', 'RUN'];
        this.partyHP = 200;
        this.partyMaxHP = 200;
        this.partyATB = 0;
        this.enemyHP = 0;
        this.enemyMaxHP = 0;
        this.enemyATB = 0;
        this.enemyName = '';
        this.battleMessages = [];
        this.battleAnim = '';
        this.battleAnimTimer = 0;
        this.displayHP = 200;  // Rolling HP display

        // Clock
        this.gameClock = { hours: 12, minutes: 0, direction: 1 };
        this.clockTimer = 0;

        // Encounters
        this.stepsSinceEncounter = 0;
        this.encounterRate = 30;
    }

    onInit() {
        this.generateMap();
        this.generateNPCs();
    }

    generateMap() {
        // Simple tile map: 0=grass, 1=wall, 2=water, 3=path, 4=door, 5=tree
        this.map = [];
        for (let y = 0; y < this.mapHeight; y++) {
            const row = [];
            for (let x = 0; x < this.mapWidth; x++) {
                if (x === 0 || x === this.mapWidth - 1 || y === 0 || y === this.mapHeight - 1) {
                    row.push(Math.random() < 0.5 ? 5 : 1); // Border
                } else if (y === 7 && x > 2 && x < 13) {
                    row.push(3); // Path
                } else if (x === 8 && y > 3 && y < 10) {
                    row.push(3); // Vertical path
                } else if (x === 8 && y === 3) {
                    row.push(4); // Door
                } else if ((x === 3 && y === 7) || (x === 12 && y === 7)) {
                    row.push(4); // Doors
                } else if (Math.random() < 0.08) {
                    row.push(5); // Random trees
                } else if (Math.random() < 0.03) {
                    row.push(2); // Water patches
                } else {
                    row.push(0); // Grass
                }
            }
            this.map.push(row);
        }
    }

    generateNPCs() {
        const normalDialog = [
            'The kingdom is at peace... for now.',
            'Have you seen the old clock tower?',
            'Something feels different today.',
            'The festival starts at noon!',
            'Be careful in the forest.'
        ];

        const hauntedDialog = [
            'THE CLOCK RUNS BACKWARD NOW.',
            'You weren\'t here yesterday. But I remember you.',
            'The festival ended 30 years ago.',
            'SAVE FILE CORRUPTED: YEAR -001',
            'Alex played this part 127 times.',
            'You\'re in the wrong timeline.',
            'The boss was defeated before you arrived.',
            'CHECK YOUR INVENTORY. SOMETHING IS MISSING.'
        ];

        this.npcs = [
            { x: 5, y: 5, dir: 0, color: '#cc4444', dialog: normalDialog, hauntedDialog },
            { x: 10, y: 9, dir: 2, color: '#44cc44', dialog: normalDialog, hauntedDialog },
            { x: 4, y: 7, dir: 1, color: '#4444cc', dialog: normalDialog, hauntedDialog },
            { x: 12, y: 5, dir: 3, color: '#cccc44', dialog: normalDialog, hauntedDialog }
        ];
    }

    onStart() {
        this.player.x = 8 * this.tileSize;
        this.player.y = 8 * this.tileSize;
        this.mode = 'overworld';
        this.inBattle = false;
        this.gameClock = { hours: 12, minutes: 0, direction: 1 };
    }

    onStop() {}

    onUpdate(dt, timestamp) {
        // Update clock
        this.clockTimer += dt;
        if (this.clockTimer > 1000) {
            this.clockTimer = 0;
            const dir = this.hauntStage >= 2 ? -1 : 1; // Clock runs backward!
            this.gameClock.minutes += dir;
            if (this.gameClock.minutes >= 60) {
                this.gameClock.minutes = 0;
                this.gameClock.hours = (this.gameClock.hours + 1) % 24;
            }
            if (this.gameClock.minutes < 0) {
                this.gameClock.minutes = 59;
                this.gameClock.hours = (this.gameClock.hours - 1 + 24) % 24;
            }
        }

        switch (this.mode) {
            case 'overworld':
                this.updateOverworld(dt, timestamp);
                break;
            case 'battle':
                this.updateBattle(dt, timestamp);
                break;
            case 'dialog':
                this.updateDialog(dt, timestamp);
                break;
        }
    }

    updateOverworld(dt, timestamp) {
        const dpad = input.getDPad();
        let moved = false;

        if (dpad.x !== 0 || dpad.y !== 0) {
            const newX = this.player.x + dpad.x * this.player.speed;
            const newY = this.player.y + dpad.y * this.player.speed;

            // Direction
            if (dpad.y < 0) this.player.dir = 0;
            if (dpad.y > 0) this.player.dir = 2;
            if (dpad.x < 0) this.player.dir = 3;
            if (dpad.x > 0) this.player.dir = 1;

            // Tile collision
            const tileX = Math.floor(newX / this.tileSize);
            const tileY = Math.floor(newY / this.tileSize);
            const tile = this.getTile(tileX, tileY);

            if (tile !== 1 && tile !== 2 && tile !== 5) {
                this.player.x = newX;
                this.player.y = newY;
                moved = true;
                this.stepsSinceEncounter++;
            }

            this.player.animTimer += dt / 1000;
        }

        // Clamp to map
        this.player.x = Math.max(this.tileSize, Math.min((this.mapWidth - 2) * this.tileSize, this.player.x));
        this.player.y = Math.max(this.tileSize, Math.min((this.mapHeight - 2) * this.tileSize, this.player.y));

        // Talk to NPCs (B button)
        if (input.isJustPressed(BUTTONS.B)) {
            this.checkNPCInteraction();
        }

        // Random encounters on grass
        if (moved && this.stepsSinceEncounter > this.encounterRate) {
            const tile = this.getTile(
                Math.floor(this.player.x / this.tileSize),
                Math.floor(this.player.y / this.tileSize)
            );
            if (tile === 0 && Math.random() < 0.05) {
                this.startBattle();
            }
        }
    }

    getTile(x, y) {
        if (y < 0 || y >= this.mapHeight || x < 0 || x >= this.mapWidth) return 1;
        return this.map[y][x];
    }

    checkNPCInteraction() {
        const px = Math.floor(this.player.x / this.tileSize);
        const py = Math.floor(this.player.y / this.tileSize);

        for (const npc of this.npcs) {
            if (Math.abs(npc.x - px) <= 1 && Math.abs(npc.y - py) <= 1) {
                this.currentNPC = npc;
                const pool = this.hauntStage >= 2 ? npc.hauntedDialog : npc.dialog;
                this.dialogText = pool[Math.floor(Math.random() * pool.length)];
                this.dialogTimer = 0;
                this.mode = 'dialog';
                sfx.play('select');

                // Narrative fragment from NPCs
                if (this.hauntStage >= 2 && Math.random() < 0.1) {
                    events.emit(EVENTS.NARRATIVE_FRAGMENT, {
                        id: 'chrono-npc',
                        text: 'The NPCs remember a different player.'
                    });
                }
                return;
            }
        }
    }

    updateDialog(dt, timestamp) {
        this.dialogTimer += dt;

        if (input.isJustPressed(BUTTONS.B) || input.isJustPressed(BUTTONS.A)) {
            if (this.dialogQueue.length > 0) {
                this.dialogText = this.dialogQueue.shift();
                this.dialogTimer = 0;
            } else {
                this.mode = 'overworld';
                sfx.play('confirm');
            }
        }
    }

    startBattle() {
        this.mode = 'battle';
        this.inBattle = true;
        this.stepsSinceEncounter = 0;
        this.battleMenuIndex = 0;
        this.battleTimer = 0;
        this.partyATB = 0;
        this.enemyATB = 0;
        this.battleMessages = [];
        this.battleAnim = '';
        this.battleAnimTimer = 0;

        // Random enemy
        const enemies = [
            { name: 'MYSTIC IMP', hp: 40, color: '#8844aa' },
            { name: 'BLUE BEAST', hp: 60, color: '#4466cc' },
            { name: 'NAGA', hp: 50, color: '#44aa44' },
            { name: 'HENCH', hp: 70, color: '#aa4444' }
        ];

        // At high haunt stage, impossible enemies
        if (this.hauntStage >= 3) {
            enemies.push(
                { name: 'T̵I̶M̸E̷ ̵E̴R̷R̷O̴R̵', hp: 999, color: '#ff00ff' },
                { name: 'ALEX\'S MEMORY', hp: 1, color: '#ffffff' }
            );
        }

        const enemy = enemies[Math.floor(Math.random() * enemies.length)];
        this.enemyName = enemy.name;
        this.enemyHP = enemy.hp;
        this.enemyMaxHP = enemy.hp;
        this.enemyColor = enemy.color;

        sfx.play('confirm');
    }

    updateBattle(dt, timestamp) {
        this.battleTimer += dt;

        // ATB gauges fill
        this.partyATB = Math.min(100, this.partyATB + dt * 0.03);
        this.enemyATB = Math.min(100, this.enemyATB + dt * 0.025);

        // Rolling HP display
        if (this.displayHP !== this.partyHP) {
            const diff = this.partyHP - this.displayHP;
            this.displayHP += Math.sign(diff) * Math.min(Math.abs(diff), dt * 0.1);
        }

        // Haunting: HP goes negative
        if (this.hauntStage >= 3 && this.displayHP < 0) {
            this.displayHP = -Math.abs(this.displayHP); // Keep it negative
        }

        // Animation
        if (this.battleAnimTimer > 0) {
            this.battleAnimTimer -= dt;
            return;
        }

        // Player menu
        if (this.partyATB >= 100) {
            if (input.isJustPressed(BUTTONS.UP)) {
                this.battleMenuIndex = (this.battleMenuIndex - 1 + this.battleItems.length) % this.battleItems.length;
                sfx.play('menuMove');
            }
            if (input.isJustPressed(BUTTONS.DOWN)) {
                this.battleMenuIndex = (this.battleMenuIndex + 1) % this.battleItems.length;
                sfx.play('menuMove');
            }

            if (input.isJustPressed(BUTTONS.A) || input.isJustPressed(BUTTONS.B)) {
                this.executeBattleAction(this.battleItems[this.battleMenuIndex]);
            }
        }

        // Enemy attacks
        if (this.enemyATB >= 100) {
            this.enemyAttack();
        }

        // Check battle end
        if (this.enemyHP <= 0) {
            this.endBattle(true);
        }
        if (this.partyHP <= 0 && this.hauntStage < 3) {
            this.endBattle(false);
        }
    }

    executeBattleAction(action) {
        switch (action) {
            case 'FIGHT': {
                const damage = 15 + Math.floor(Math.random() * 10);
                this.enemyHP = Math.max(0, this.enemyHP - damage);
                this.battleMessages.push(`Hit for ${damage} damage!`);
                this.battleAnim = 'playerAttack';
                this.battleAnimTimer = 500;
                sfx.play('hit');
                this.addScore(damage * 5);
                break;
            }
            case 'MAGIC': {
                const damage = 25 + Math.floor(Math.random() * 15);
                this.enemyHP = Math.max(0, this.enemyHP - damage);
                this.battleMessages.push(`LUMINAIRE deals ${damage}!`);
                this.battleAnim = 'magic';
                this.battleAnimTimer = 800;
                sfx.play('shoot');
                this.addScore(damage * 8);
                break;
            }
            case 'ITEM': {
                const heal = 30 + Math.floor(Math.random() * 20);
                this.partyHP = Math.min(this.partyMaxHP, this.partyHP + heal);
                this.battleMessages.push(`Healed ${heal} HP!`);
                this.battleAnim = 'heal';
                this.battleAnimTimer = 500;
                sfx.play('heal');
                break;
            }
            case 'RUN':
                if (Math.random() < 0.5 || this.hauntStage >= 3) {
                    this.battleMessages.push(this.hauntStage >= 3 ? 'CAN\'T ESCAPE TIME' : 'Can\'t escape!');
                    sfx.play('cancel');
                } else {
                    this.endBattle(false);
                    return;
                }
                break;
        }
        this.partyATB = 0;
    }

    enemyAttack() {
        const damage = 10 + Math.floor(Math.random() * 8);
        this.partyHP -= damage;
        this.battleMessages.push(`${this.enemyName} attacks for ${damage}!`);
        this.battleAnim = 'enemyAttack';
        this.battleAnimTimer = 400;
        this.enemyATB = 0;
        sfx.play('damage');
    }

    endBattle(won) {
        this.inBattle = false;
        this.mode = 'overworld';
        if (won) {
            this.addScore(100);
            sfx.play('coin');

            // Save files from future dates (corruption)
            if (this.hauntStage >= 2 && Math.random() < 0.2) {
                events.emit(EVENTS.NARRATIVE_FRAGMENT, {
                    id: 'chrono-save',
                    text: 'SAVE FILE DATE: 12/14/2034 — 40 years from now.'
                });
            }
        }
    }

    onRender(ctx, dt, timestamp) {
        switch (this.mode) {
            case 'overworld':
                this.renderOverworld(ctx, timestamp);
                break;
            case 'battle':
                this.renderBattle(ctx, dt, timestamp);
                break;
            case 'dialog':
                this.renderOverworld(ctx, timestamp);
                this.renderDialog(ctx, timestamp);
                break;
        }

        // Clock display
        this.renderClock(ctx, timestamp);
    }

    renderOverworld(ctx, timestamp) {
        // Draw tile map
        const startTileX = Math.max(0, Math.floor((this.player.x - this.width / 2) / this.tileSize));
        const startTileY = Math.max(0, Math.floor((this.player.y - this.height / 2) / this.tileSize));
        const offsetX = this.width / 2 - this.player.x;
        const offsetY = this.height / 2 - this.player.y;

        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const tile = this.map[y][x];
                const drawX = x * this.tileSize + offsetX;
                const drawY = y * this.tileSize + offsetY;

                if (drawX + this.tileSize < 0 || drawX > this.width ||
                    drawY + this.tileSize < 0 || drawY > this.height) continue;

                // Corruption: randomly swap tiles
                let displayTile = tile;
                if (this.hauntStage >= 3 && Math.random() < 0.005) {
                    displayTile = Math.floor(Math.random() * 6);
                }

                switch (displayTile) {
                    case 0: // Grass
                        ctx.fillStyle = '#228B22';
                        ctx.fillRect(drawX, drawY, this.tileSize, this.tileSize);
                        // Grass detail
                        if ((x + y) % 3 === 0) {
                            ctx.fillStyle = '#1a7a1a';
                            ctx.fillRect(drawX + 8, drawY + 8, 4, 4);
                        }
                        break;
                    case 1: // Wall
                        ctx.fillStyle = '#666';
                        ctx.fillRect(drawX, drawY, this.tileSize, this.tileSize);
                        ctx.fillStyle = '#777';
                        ctx.fillRect(drawX, drawY, this.tileSize, 3);
                        break;
                    case 2: // Water
                        const waterAnim = Math.sin(timestamp / 500 + x + y) * 10;
                        ctx.fillStyle = `rgb(30, 80, ${180 + waterAnim})`;
                        ctx.fillRect(drawX, drawY, this.tileSize, this.tileSize);
                        break;
                    case 3: // Path
                        ctx.fillStyle = '#c4a66a';
                        ctx.fillRect(drawX, drawY, this.tileSize, this.tileSize);
                        ctx.fillStyle = '#b4964a';
                        ctx.fillRect(drawX + 4, drawY + 4, 6, 6);
                        break;
                    case 4: // Door
                        ctx.fillStyle = '#8B4513';
                        ctx.fillRect(drawX + 4, drawY, this.tileSize - 8, this.tileSize);
                        ctx.fillStyle = '#D4A530';
                        ctx.beginPath();
                        ctx.arc(drawX + this.tileSize - 10, drawY + this.tileSize / 2, 3, 0, Math.PI * 2);
                        ctx.fill();
                        break;
                    case 5: // Tree
                        ctx.fillStyle = '#228B22';
                        ctx.fillRect(drawX, drawY, this.tileSize, this.tileSize);
                        ctx.fillStyle = '#4a3520';
                        ctx.fillRect(drawX + 12, drawY + 16, 8, 16);
                        ctx.fillStyle = '#0a5a0a';
                        ctx.beginPath();
                        ctx.arc(drawX + 16, drawY + 12, 12, 0, Math.PI * 2);
                        ctx.fill();
                        break;
                }
            }
        }

        // NPCs
        for (const npc of this.npcs) {
            const nx = npc.x * this.tileSize + offsetX;
            const ny = npc.y * this.tileSize + offsetY;
            if (nx < -32 || nx > this.width + 32 || ny < -32 || ny > this.height + 32) continue;

            ctx.fillStyle = npc.color;
            ctx.fillRect(nx + 8, ny + 8, 16, 20);
            ctx.fillStyle = '#ddbb88';
            ctx.beginPath();
            ctx.arc(nx + 16, ny + 6, 7, 0, Math.PI * 2);
            ctx.fill();

            // Corrupt NPCs have red eyes
            if (this.hauntStage >= 2) {
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(nx + 13, ny + 4, 2, 2);
                ctx.fillRect(nx + 17, ny + 4, 2, 2);
            }
        }

        // Player
        const px = this.width / 2 - 8;
        const py = this.height / 2 - 12;
        const walkAnim = Math.sin(this.player.animTimer * 8);

        // Body
        ctx.fillStyle = '#cc4444';
        ctx.fillRect(px + 2, py + 10, 12, 14);

        // Head
        ctx.fillStyle = '#ddbb88';
        ctx.beginPath();
        ctx.arc(px + 8, py + 6, 7, 0, Math.PI * 2);
        ctx.fill();

        // Hair
        ctx.fillStyle = '#aa2222';
        ctx.fillRect(px + 1, py - 2, 14, 5);

        // Legs
        ctx.fillStyle = '#666';
        ctx.fillRect(px + 3 + walkAnim, py + 22, 4, 8);
        ctx.fillRect(px + 9 - walkAnim, py + 22, 4, 8);

        // Time distortion overlay
        if (this.hauntStage >= 2) {
            ctx.fillStyle = `rgba(0, 100, 255, ${0.02 + Math.sin(timestamp / 2000) * 0.02})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }
    }

    renderBattle(ctx, dt, timestamp) {
        // Battle background
        const bgHue = this.hauntStage >= 3 ? (timestamp / 50) % 360 : 220;
        ctx.fillStyle = `hsl(${bgHue}, 30%, 10%)`;
        ctx.fillRect(0, 0, this.width, this.height);

        // Psychedelic background lines
        for (let i = 0; i < 20; i++) {
            const y = (i * 30 + timestamp / 20) % this.height;
            ctx.strokeStyle = `hsla(${bgHue + i * 18}, 60%, 30%, 0.3)`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y + Math.sin(timestamp / 500 + i) * 20);
            ctx.stroke();
        }

        // Ground
        ctx.fillStyle = '#1a1a2a';
        ctx.fillRect(0, 300, this.width, 148);

        // Enemy
        const enemyX = 350;
        const enemyY = 180;
        const enemyBob = Math.sin(timestamp / 500) * 5;

        ctx.fillStyle = this.enemyColor || '#8844aa';
        ctx.fillRect(enemyX, enemyY + enemyBob, 50, 60);
        ctx.fillStyle = '#fff';
        ctx.fillRect(enemyX + 10, enemyY + 10 + enemyBob, 8, 8);
        ctx.fillRect(enemyX + 30, enemyY + 10 + enemyBob, 8, 8);
        ctx.fillStyle = '#000';
        ctx.fillRect(enemyX + 12, enemyY + 13 + enemyBob, 4, 4);
        ctx.fillRect(enemyX + 32, enemyY + 13 + enemyBob, 4, 4);

        // Attack animations
        if (this.battleAnim === 'playerAttack' && this.battleAnimTimer > 0) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            for (let i = 0; i < 5; i++) {
                const angle = (timestamp / 50 + i * 72) * Math.PI / 180;
                ctx.beginPath();
                ctx.moveTo(enemyX + 25, enemyY + 30);
                ctx.lineTo(enemyX + 25 + Math.cos(angle) * 30, enemyY + 30 + Math.sin(angle) * 30);
                ctx.stroke();
            }
        }

        if (this.battleAnim === 'magic' && this.battleAnimTimer > 0) {
            ctx.fillStyle = `rgba(100, 200, 255, ${this.battleAnimTimer / 800})`;
            ctx.beginPath();
            ctx.arc(enemyX + 25, enemyY + 30, 40 + Math.sin(timestamp / 100) * 10, 0, Math.PI * 2);
            ctx.fill();
        }

        if (this.battleAnim === 'heal' && this.battleAnimTimer > 0) {
            ctx.fillStyle = `rgba(100, 255, 100, ${this.battleAnimTimer / 500})`;
            for (let i = 0; i < 5; i++) {
                const hy = 280 - (500 - this.battleAnimTimer) / 5 - i * 20;
                ctx.fillText('+', 130 + Math.sin(timestamp / 200 + i) * 10, hy);
            }
        }

        // Party member display
        ctx.fillStyle = '#cc4444';
        ctx.fillRect(100, 250, 16, 24);
        ctx.fillStyle = '#ddbb88';
        ctx.beginPath();
        ctx.arc(108, 244, 8, 0, Math.PI * 2);
        ctx.fill();

        // Battle menu (bottom left)
        ctx.fillStyle = 'rgba(0, 0, 40, 0.9)';
        ctx.fillRect(10, 340, 140, 100);
        ctx.strokeStyle = '#4466aa';
        ctx.strokeRect(10, 340, 140, 100);

        ctx.font = '12px monospace';
        for (let i = 0; i < this.battleItems.length; i++) {
            ctx.fillStyle = i === this.battleMenuIndex ? '#fff' : '#888';
            const prefix = i === this.battleMenuIndex ? '> ' : '  ';
            ctx.fillText(prefix + this.battleItems[i], 20, 360 + i * 20);
        }

        // HP display (rolling counter)
        ctx.fillStyle = 'rgba(0, 0, 40, 0.9)';
        ctx.fillRect(160, 340, 180, 100);
        ctx.strokeStyle = '#4466aa';
        ctx.strokeRect(160, 340, 180, 100);

        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.fillText('CRONO', 170, 360);

        // Rolling HP
        let hpDisplay = Math.floor(this.displayHP);
        let hpColor = '#fff';
        if (this.hauntStage >= 3 && this.displayHP < 0) {
            hpDisplay = Math.floor(this.displayHP);
            hpColor = '#ff0000';
        }
        ctx.fillStyle = hpColor;
        ctx.fillText(`HP: ${hpDisplay}/${this.partyMaxHP}`, 170, 380);

        // ATB gauge
        ctx.fillStyle = '#222';
        ctx.fillRect(170, 390, 100, 8);
        ctx.fillStyle = this.partyATB >= 100 ? '#ffcc00' : '#4466cc';
        ctx.fillRect(170, 390, this.partyATB, 8);

        // Enemy info
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.fillText(this.enemyName, 350, 340);
        ctx.fillStyle = '#222';
        ctx.fillRect(350, 345, 100, 8);
        ctx.fillStyle = '#cc2222';
        ctx.fillRect(350, 345, 100 * (this.enemyHP / this.enemyMaxHP), 8);

        // Battle messages
        if (this.battleMessages.length > 0) {
            const msg = this.battleMessages[this.battleMessages.length - 1];
            ctx.fillStyle = '#fff';
            ctx.font = '11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(msg, this.width / 2, 320);
            ctx.textAlign = 'left';
        }
    }

    renderDialog(ctx, timestamp) {
        // Dialog box
        ctx.fillStyle = 'rgba(0, 0, 40, 0.9)';
        ctx.fillRect(20, this.height - 100, this.width - 40, 80);
        ctx.strokeStyle = '#6688cc';
        ctx.lineWidth = 2;
        ctx.strokeRect(20, this.height - 100, this.width - 40, 80);

        // Text (typewriter)
        const visibleChars = Math.floor(this.dialogTimer / 40);
        const displayText = this.dialogText.substring(0, visibleChars);

        ctx.fillStyle = this.hauntStage >= 2 ? '#ff8888' : '#fff';
        ctx.font = '13px monospace';

        // Word wrap
        const maxWidth = this.width - 80;
        const words = displayText.split(' ');
        let line = '';
        let y = this.height - 80;

        for (const word of words) {
            const testLine = line + word + ' ';
            if (ctx.measureText(testLine).width > maxWidth) {
                ctx.fillText(line, 35, y);
                line = word + ' ';
                y += 18;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, 35, y);

        // Continue indicator
        if (visibleChars >= this.dialogText.length) {
            const blink = Math.sin(timestamp / 300) > 0;
            if (blink) {
                ctx.fillStyle = '#6688cc';
                ctx.fillText('▼', this.width - 50, this.height - 30);
            }
        }
    }

    renderClock(ctx, timestamp) {
        const { hours, minutes } = this.gameClock;
        const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(this.width - 80, 5, 70, 20);

        ctx.fillStyle = this.hauntStage >= 2 ? '#ff4444' : '#ccccff';
        ctx.font = '12px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(timeStr, this.width - 15, 19);

        // Corruption indicator
        if (this.hauntStage >= 2) {
            ctx.fillStyle = '#ff0000';
            ctx.font = '8px monospace';
            ctx.fillText('◄◄', this.width - 70, 19); // Rewind symbol
        }

        ctx.textAlign = 'left';
    }

    onRestart() {
        this.partyHP = this.partyMaxHP;
        this.displayHP = this.partyMaxHP;
        this.mode = 'overworld';
        this.player.x = 8 * this.tileSize;
        this.player.y = 8 * this.tileSize;
    }

    onDeath() {}
    onTitleDismiss() {}
}

export default CorruptedChronoTrigger;
