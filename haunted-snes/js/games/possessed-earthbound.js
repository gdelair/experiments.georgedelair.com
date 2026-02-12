// possessed-earthbound.js — Quirky RPG with psychedelic battle backgrounds and rolling HP

import { GameBase } from './game-base.js';
import { input, BUTTONS } from '../core/input.js';
import { sfx } from '../audio/sfx.js';
import state from '../core/state.js';
import { events, EVENTS } from '../core/events.js';

// NPC dialogue pools that degrade with haunt stage
const NPC_DIALOGUE_NORMAL = [
    'Welcome to Onett! Nice day, huh?',
    'I heard there\'s a meteor on the hill.',
    'My dog keeps barking at nothing...',
    'The arcade is closed today. Weird.',
    'Have you tried the pizza? It\'s great!',
    'I collect bottle caps. Want to trade?',
    'The library has a book about PSI powers.',
    'Stay away from the caves up north.'
];

const NPC_DIALOGUE_HAUNTED = [
    'Do you hear that buzzing? It never stops.',
    'The sky was red last night. Nobody noticed.',
    'I can\'t remember my name anymore.',
    'Something is wrong with the TV signal.',
    'My reflection blinked when I didn\'t.',
    'The numbers... they go below zero...',
    'Who put this town here? Was it always here?',
    'ALEX SAYS HELLO.'
];

const NPC_DIALOGUE_CONSUMED = [
    'Y O U   C A N N O T   L E A V E',
    'THE HP COUNTER KNOWS YOUR NAME',
    'WE ARE ALL INSIDE THE CARTRIDGE',
    'PRAY. PRAY. PRAY. PRAY. PRAY.',
    'G I Y G A S   W A S   R E A L',
    '01001000 01000101 01001100 01010000',
    'THE ROLLING COUNTER NEVER STOPS',
    'YOU FEEL SOMETHING BEHIND THE SCREEN'
];

// Enemy definitions
const ENEMIES = [
    { name: 'Runaway Dog', hp: 30, atk: 8, def: 2, exp: 5, color: '#aa6633' },
    { name: 'Starman Jr', hp: 50, atk: 14, def: 5, exp: 15, color: '#cccc44' },
    { name: 'Cranky Lady', hp: 25, atk: 10, def: 3, exp: 8, color: '#cc66aa' },
    { name: 'Spiteful Crow', hp: 24, atk: 12, def: 4, exp: 7, color: '#333366' },
    { name: 'Coil Snake', hp: 18, atk: 6, def: 1, exp: 4, color: '#44aa44' },
    { name: 'Skate Punk', hp: 35, atk: 11, def: 4, exp: 10, color: '#dd5555' }
];

const HAUNTED_ENEMIES = [
    { name: '??? ? ???', hp: 99, atk: 25, def: 10, exp: 0, color: '#880000' },
    { name: 'Your Reflection', hp: 666, atk: 30, def: 15, exp: -1, color: '#440044' },
    { name: 'ERROR NPC', hp: -1, atk: 0, def: 0, exp: 999, color: '#ff0000' },
    { name: 'Giygas Fragment', hp: 9999, atk: 50, def: 20, exp: 0, color: '#220000' }
];

// PSI attack names
const PSI_ATTACKS = [
    { name: 'PSI Rockin a', cost: 5, power: 20, color: '#ff44ff' },
    { name: 'PSI Rockin b', cost: 12, power: 45, color: '#ff00ff' },
    { name: 'PSI Flash a', cost: 8, power: 15, color: '#ffff00' },
    { name: 'PSI Heal a', cost: 3, power: -30, color: '#44ff44' },
    { name: 'PSI Shield a', cost: 6, power: 0, color: '#4444ff' }
];

export class PossessedEarthbound extends GameBase {
    constructor() {
        super({
            id: 'earthbound',
            name: 'POSSESSED EARTHBOUND',
            channel: 8,
            titleColor: '#ffcc00',
            bgColor: '#000044',
            titleText: 'POSSESSED EARTHBOUND'
        });

        // Overworld state
        this.mode = 'overworld'; // 'overworld' | 'battle' | 'dialogue' | 'menu'
        this.player = { x: 256, y: 280, w: 16, h: 24, speed: 2, dir: 0, frame: 0, animTimer: 0 };
        this.camera = { x: 0, y: 0 };
        this.mapWidth = 800;
        this.mapHeight = 600;

        // Town structures
        this.buildings = [];
        this.npcs = [];
        this.trees = [];

        // Player stats
        this.stats = { hp: 120, maxHp: 120, pp: 40, maxPp: 40, level: 1, exp: 0, atk: 15, def: 8 };
        this.displayHp = 120; // rolling counter display
        this.targetHp = 120;
        this.displayPp = 40;
        this.targetPp = 40;
        this.hpRollSpeed = 0.8; // HP points per frame

        // Battle state
        this.battleActive = false;
        this.enemy = null;
        this.battleMenu = 0; // 0=Bash,1=PSI,2=Items,3=Run
        this.psiMenu = -1; // -1=not in submenu
        this.battlePhase = 'menu'; // 'menu' | 'psi_select' | 'player_attack' | 'enemy_attack' | 'result' | 'run'
        this.battleTimer = 0;
        this.battleMessage = '';
        this.battleBgOffset = 0;
        this.battleBgPalette = 0;
        this.bgDistortionPhase = 0;
        this.bgWaveAmplitude = 20;
        this.bgPatternIndex = 0;
        this.battleTurns = 0;
        this.psiEffectTimer = 0;
        this.psiEffectType = null;
        this.shieldActive = false;
        this.enemyFlashTimer = 0;
        this.playerFlashTimer = 0;

        // Encounter timer
        this.encounterTimer = 0;
        this.encounterThreshold = 3000;
        this.lastEncounterTime = 0;

        // Dialogue
        this.dialogueText = '';
        this.dialogueTimer = 0;
        this.dialogueCharIndex = 0;

        // Corruption effects
        this.giygasOverlay = 0;
        this.giygasPhase = 0;
        this.impossibleHpDisplay = false;
        this.corruptBgPersist = false;
        this.screenShakeTimer = 0;
        this.screenShakeIntensity = 0;
        this.npcCorruptionFlicker = 0;

        // Items
        this.items = [
            { name: 'Hamburger', count: 3, heal: 40 },
            { name: 'Cookie', count: 5, heal: 15 },
            { name: 'PSI Caramel', count: 2, healPp: 20 }
        ];
        this.itemMenu = -1;

        this.stepCounter = 0;
    }

    onInit() {
        this.generateTown();
    }

    generateTown() {
        this.buildings = [
            { x: 80, y: 100, w: 80, h: 60, color: '#885544', roofColor: '#aa3333', name: 'HOME', door: { x: 110, y: 160 } },
            { x: 250, y: 80, w: 100, h: 70, color: '#666688', roofColor: '#4444aa', name: 'SHOP', door: { x: 295, y: 150 } },
            { x: 450, y: 120, w: 120, h: 80, color: '#668866', roofColor: '#338833', name: 'LIBRARY', door: { x: 505, y: 200 } },
            { x: 620, y: 60, w: 90, h: 65, color: '#886666', roofColor: '#aa4444', name: 'HOTEL', door: { x: 660, y: 125 } },
            { x: 150, y: 350, w: 70, h: 50, color: '#888855', roofColor: '#aaaa33', name: 'ARCADE', door: { x: 180, y: 400 } },
            { x: 400, y: 380, w: 110, h: 70, color: '#556688', roofColor: '#3355aa', name: 'HOSPITAL', door: { x: 450, y: 450 } },
            { x: 650, y: 350, w: 80, h: 55, color: '#885588', roofColor: '#aa33aa', name: 'DRUGSTORE', door: { x: 685, y: 405 } }
        ];

        this.npcs = [
            { x: 200, y: 200, w: 14, h: 20, color: '#dd8844', dir: 0, moveTimer: 0, moveDir: 0, speed: 0.5, dialogue: 0, name: 'Town Folk' },
            { x: 350, y: 250, w: 14, h: 20, color: '#44aadd', dir: 2, moveTimer: 0, moveDir: 1, speed: 0.3, dialogue: 1, name: 'Kid' },
            { x: 500, y: 300, w: 14, h: 20, color: '#dd44aa', dir: 1, moveTimer: 0, moveDir: 2, speed: 0.4, dialogue: 2, name: 'Lady' },
            { x: 130, y: 450, w: 14, h: 20, color: '#44dd44', dir: 3, moveTimer: 0, moveDir: 3, speed: 0.6, dialogue: 3, name: 'Old Man' },
            { x: 550, y: 180, w: 14, h: 20, color: '#dddd44', dir: 0, moveTimer: 0, moveDir: 0, speed: 0.35, dialogue: 4, name: 'Dog' },
            { x: 700, y: 250, w: 14, h: 20, color: '#aa66ff', dir: 2, moveTimer: 0, moveDir: 1, speed: 0.45, dialogue: 5, name: 'Punk' }
        ];

        this.trees = [];
        const treeSeeds = [30, 180, 320, 480, 580, 720, 60, 400, 700, 250, 520, 140, 660, 350, 90, 500];
        for (let i = 0; i < treeSeeds.length; i++) {
            const tx = treeSeeds[i];
            const ty = 40 + ((treeSeeds[i] * 7 + i * 131) % 500);
            let blocked = false;
            for (const b of this.buildings) {
                if (tx > b.x - 20 && tx < b.x + b.w + 20 && ty > b.y - 20 && ty < b.y + b.h + 20) {
                    blocked = true;
                    break;
                }
            }
            if (!blocked) {
                this.trees.push({ x: tx, y: ty });
            }
        }
    }

    onStart() {
        this.mode = 'overworld';
        this.battleActive = false;
        this.encounterTimer = 0;
    }

    onStop() {
        this.battleActive = false;
    }

    onRestart() {
        this.stats = { hp: 120, maxHp: 120, pp: 40, maxPp: 40, level: 1, exp: 0, atk: 15, def: 8 };
        this.displayHp = 120;
        this.targetHp = 120;
        this.displayPp = 40;
        this.targetPp = 40;
        this.player.x = 256;
        this.player.y = 280;
        this.mode = 'overworld';
        this.battleActive = false;
        this.giygasOverlay = 0;
        this.corruptBgPersist = false;
        this.impossibleHpDisplay = false;
        this.shieldActive = false;
        this.items = [
            { name: 'Hamburger', count: 3, heal: 40 },
            { name: 'Cookie', count: 5, heal: 15 },
            { name: 'PSI Caramel', count: 2, healPp: 20 }
        ];
    }

    onDeath() {
        this.player.x = 256;
        this.player.y = 280;
        this.mode = 'overworld';
        this.battleActive = false;
        this.stats.hp = Math.floor(this.stats.maxHp / 2);
        this.targetHp = this.stats.hp;
        this.displayHp = this.stats.hp;
    }

    onTitleDismiss() {
        sfx.play('confirm');
    }

    onUpdate(dt, timestamp) {
        this.updateTimers(dt);

        // Rolling HP/PP counter
        this.updateRollingCounters(dt);

        // Screen shake decay
        if (this.screenShakeTimer > 0) {
            this.screenShakeTimer -= dt;
        }

        // Check for death via rolling counter
        if (this.displayHp <= 0 && this.targetHp <= 0) {
            if (!this.gameOver) {
                this.die();
                return;
            }
        }

        switch (this.mode) {
            case 'overworld':
                this.updateOverworld(dt, timestamp);
                break;
            case 'battle':
                this.updateBattle(dt, timestamp);
                break;
            case 'dialogue':
                this.updateDialogue(dt, timestamp);
                break;
        }

        // Corruption: Giygas overlay intensifies
        if (this.hauntStage >= 3) {
            this.giygasPhase += dt * 0.002;
            this.giygasOverlay = Math.min(1, this.giygasOverlay + dt * 0.00005);
        }
    }

    updateRollingCounters(dt) {
        const rollSpeed = this.hpRollSpeed * (dt / 16);
        if (this.displayHp !== this.targetHp) {
            if (this.displayHp > this.targetHp) {
                this.displayHp = Math.max(this.targetHp, this.displayHp - rollSpeed);
            } else {
                this.displayHp = Math.min(this.targetHp, this.displayHp + rollSpeed);
            }
        }
        if (this.displayPp !== this.targetPp) {
            if (this.displayPp > this.targetPp) {
                this.displayPp = Math.max(this.targetPp, this.displayPp - rollSpeed * 0.5);
            } else {
                this.displayPp = Math.min(this.targetPp, this.displayPp + rollSpeed * 0.5);
            }
        }

        // Corruption: HP goes negative / shows impossible numbers
        if (this.hauntStage >= 2 && Math.random() < 0.002 * this.hauntStage) {
            this.impossibleHpDisplay = true;
            this.addTimer(() => { this.impossibleHpDisplay = false; }, 1500);
        }
    }

    updateOverworld(dt, timestamp) {
        const dpad = input.getDPad();
        let dx = dpad.x * this.player.speed;
        let dy = dpad.y * this.player.speed;

        // Direction tracking
        if (dx !== 0 || dy !== 0) {
            if (Math.abs(dx) > Math.abs(dy)) {
                this.player.dir = dx > 0 ? 1 : 3;
            } else {
                this.player.dir = dy > 0 ? 0 : 2;
            }
            this.player.animTimer += dt;
            if (this.player.animTimer > 200) {
                this.player.frame = (this.player.frame + 1) % 4;
                this.player.animTimer = 0;
            }

            // Step counter for encounters
            this.stepCounter += Math.abs(dx) + Math.abs(dy);
            this.encounterTimer += dt;
        }

        // Collision with buildings
        const newX = this.player.x + dx;
        const newY = this.player.y + dy;
        let canMoveX = true;
        let canMoveY = true;

        for (const b of this.buildings) {
            if (this.rectOverlap(newX, this.player.y, this.player.w, this.player.h, b.x, b.y, b.w, b.h)) {
                canMoveX = false;
            }
            if (this.rectOverlap(this.player.x, newY, this.player.w, this.player.h, b.x, b.y, b.w, b.h)) {
                canMoveY = false;
            }
        }

        // Tree collision
        for (const t of this.trees) {
            if (this.rectOverlap(newX, this.player.y, this.player.w, this.player.h, t.x - 6, t.y + 10, 12, 10)) {
                canMoveX = false;
            }
            if (this.rectOverlap(this.player.x, newY, this.player.w, this.player.h, t.x - 6, t.y + 10, 12, 10)) {
                canMoveY = false;
            }
        }

        if (canMoveX) this.player.x = Math.max(0, Math.min(this.mapWidth - this.player.w, newX));
        if (canMoveY) this.player.y = Math.max(0, Math.min(this.mapHeight - this.player.h, newY));

        // Camera follow
        this.camera.x = this.player.x - this.width / 2 + this.player.w / 2;
        this.camera.y = this.player.y - this.height / 2 + this.player.h / 2;
        this.camera.x = Math.max(0, Math.min(this.mapWidth - this.width, this.camera.x));
        this.camera.y = Math.max(0, Math.min(this.mapHeight - this.height, this.camera.y));

        // NPC interaction
        if (input.isJustPressed(BUTTONS.A)) {
            for (const npc of this.npcs) {
                const dist = Math.hypot(this.player.x - npc.x, this.player.y - npc.y);
                if (dist < 35) {
                    this.startDialogue(npc);
                    break;
                }
            }
        }

        // Update NPCs (simple wander AI)
        for (const npc of this.npcs) {
            npc.moveTimer += dt;
            if (npc.moveTimer > 2000 + Math.random() * 2000) {
                npc.moveTimer = 0;
                npc.moveDir = Math.floor(Math.random() * 5); // 0-3 = directions, 4 = idle
                npc.dir = npc.moveDir < 4 ? npc.moveDir : npc.dir;
            }
            if (npc.moveDir < 4) {
                const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
                const [ndx, ndy] = dirs[npc.moveDir];
                const nnx = npc.x + ndx * npc.speed;
                const nny = npc.y + ndy * npc.speed;
                if (nnx > 10 && nnx < this.mapWidth - 10 && nny > 10 && nny < this.mapHeight - 10) {
                    let npcBlocked = false;
                    for (const b of this.buildings) {
                        if (this.rectOverlap(nnx - 7, nny - 10, 14, 20, b.x, b.y, b.w, b.h)) {
                            npcBlocked = true;
                            break;
                        }
                    }
                    if (!npcBlocked) {
                        npc.x = nnx;
                        npc.y = nny;
                    }
                }
            }

            // Corruption: NPCs flicker/teleport
            if (this.hauntStage >= 2 && Math.random() < 0.0005 * this.hauntStage) {
                npc.x = 50 + Math.random() * (this.mapWidth - 100);
                npc.y = 50 + Math.random() * (this.mapHeight - 100);
            }
        }

        // Random encounters
        if (this.encounterTimer > this.encounterThreshold && (dx !== 0 || dy !== 0)) {
            if (Math.random() < 0.008 + this.hauntStage * 0.003) {
                this.startBattle();
                this.encounterTimer = 0;
            }
        }
    }

    startDialogue(npc) {
        this.mode = 'dialogue';
        let pool;
        if (this.hauntStage >= 3) {
            pool = NPC_DIALOGUE_CONSUMED;
        } else if (this.hauntStage >= 1) {
            pool = Math.random() < 0.4 * this.hauntStage ? NPC_DIALOGUE_HAUNTED : NPC_DIALOGUE_NORMAL;
        } else {
            pool = NPC_DIALOGUE_NORMAL;
        }
        this.dialogueText = pool[Math.floor(Math.random() * pool.length)];
        this.dialogueCharIndex = 0;
        this.dialogueTimer = 0;
        sfx.play('select');
    }

    updateDialogue(dt) {
        this.dialogueTimer += dt;
        if (this.dialogueTimer > 30) {
            this.dialogueTimer = 0;
            if (this.dialogueCharIndex < this.dialogueText.length) {
                this.dialogueCharIndex++;
            }
        }
        if (input.isJustPressed(BUTTONS.A) || input.isJustPressed(BUTTONS.B)) {
            if (this.dialogueCharIndex >= this.dialogueText.length) {
                this.mode = 'overworld';
                sfx.play('confirm');
            } else {
                this.dialogueCharIndex = this.dialogueText.length;
            }
        }
    }

    startBattle() {
        this.mode = 'battle';
        this.battleActive = true;
        this.battleMenu = 0;
        this.psiMenu = -1;
        this.itemMenu = -1;
        this.battlePhase = 'menu';
        this.battleTimer = 0;
        this.battleMessage = '';
        this.battleBgOffset = 0;
        this.battleBgPalette = Math.floor(Math.random() * 5);
        this.bgDistortionPhase = 0;
        this.bgWaveAmplitude = 15 + Math.random() * 20;
        this.bgPatternIndex = Math.floor(Math.random() * 4);
        this.battleTurns = 0;
        this.shieldActive = false;
        this.enemyFlashTimer = 0;
        this.playerFlashTimer = 0;

        // Pick enemy
        if (this.hauntStage >= 3 && Math.random() < 0.3) {
            const template = HAUNTED_ENEMIES[Math.floor(Math.random() * HAUNTED_ENEMIES.length)];
            this.enemy = { ...template };
        } else {
            const idx = Math.min(Math.floor(Math.random() * (2 + this.stats.level)), ENEMIES.length - 1);
            const template = ENEMIES[idx];
            this.enemy = { ...template };
        }
        this.enemy.currentHp = this.enemy.hp;
        this.enemy.displayHp = this.enemy.hp;

        sfx.play('damage');
        events.emit(EVENTS.HAUNT_GLITCH, { type: 'battle_start' });
    }

    updateBattle(dt, timestamp) {
        this.battleBgOffset += dt * 0.05;
        this.bgDistortionPhase += dt * 0.003;

        // Corruption: battle bg never fully stops at stage>=3
        if (this.hauntStage >= 3) {
            this.bgWaveAmplitude = Math.max(this.bgWaveAmplitude, 10 + Math.sin(timestamp * 0.001) * 15);
        }

        // Enemy display HP roll
        if (this.enemy && this.enemy.displayHp !== this.enemy.currentHp) {
            const rollSpd = 1.2 * (dt / 16);
            if (this.enemy.displayHp > this.enemy.currentHp) {
                this.enemy.displayHp = Math.max(this.enemy.currentHp, this.enemy.displayHp - rollSpd);
            } else {
                this.enemy.displayHp = Math.min(this.enemy.currentHp, this.enemy.displayHp + rollSpd);
            }
        }

        // Flash timers
        if (this.enemyFlashTimer > 0) this.enemyFlashTimer -= dt;
        if (this.playerFlashTimer > 0) this.playerFlashTimer -= dt;
        if (this.psiEffectTimer > 0) this.psiEffectTimer -= dt;

        switch (this.battlePhase) {
            case 'menu':
                this.updateBattleMenu(dt);
                break;
            case 'psi_select':
                this.updatePsiSelect(dt);
                break;
            case 'item_select':
                this.updateItemSelect(dt);
                break;
            case 'player_attack':
                this.updatePlayerAttack(dt);
                break;
            case 'enemy_attack':
                this.updateEnemyAttack(dt);
                break;
            case 'result':
                this.updateBattleResult(dt);
                break;
            case 'run':
                this.updateRun(dt);
                break;
        }
    }

    updateBattleMenu(dt) {
        if (input.isJustPressed(BUTTONS.DOWN)) {
            this.battleMenu = (this.battleMenu + 1) % 4;
            sfx.play('menuMove');
        }
        if (input.isJustPressed(BUTTONS.UP)) {
            this.battleMenu = (this.battleMenu + 3) % 4;
            sfx.play('menuMove');
        }
        if (input.isJustPressed(BUTTONS.A)) {
            sfx.play('confirm');
            switch (this.battleMenu) {
                case 0: // Bash
                    this.executeBash();
                    break;
                case 1: // PSI
                    this.battlePhase = 'psi_select';
                    this.psiMenu = 0;
                    break;
                case 2: // Items
                    this.battlePhase = 'item_select';
                    this.itemMenu = 0;
                    break;
                case 3: // Run
                    this.battlePhase = 'run';
                    this.battleTimer = 0;
                    break;
            }
        }
    }

    updatePsiSelect(dt) {
        if (input.isJustPressed(BUTTONS.DOWN)) {
            this.psiMenu = (this.psiMenu + 1) % PSI_ATTACKS.length;
            sfx.play('menuMove');
        }
        if (input.isJustPressed(BUTTONS.UP)) {
            this.psiMenu = (this.psiMenu + PSI_ATTACKS.length - 1) % PSI_ATTACKS.length;
            sfx.play('menuMove');
        }
        if (input.isJustPressed(BUTTONS.B)) {
            this.battlePhase = 'menu';
            this.psiMenu = -1;
            sfx.play('cancel');
        }
        if (input.isJustPressed(BUTTONS.A)) {
            const psi = PSI_ATTACKS[this.psiMenu];
            if (this.stats.pp >= psi.cost) {
                this.executePsi(psi);
            } else {
                sfx.play('cancel');
                this.battleMessage = 'Not enough PP!';
                this.battleTimer = 0;
            }
        }
    }

    updateItemSelect(dt) {
        const usable = this.items.filter(i => i.count > 0);
        if (usable.length === 0) {
            this.battlePhase = 'menu';
            this.battleMessage = 'No items!';
            sfx.play('cancel');
            return;
        }
        if (input.isJustPressed(BUTTONS.DOWN)) {
            this.itemMenu = (this.itemMenu + 1) % usable.length;
            sfx.play('menuMove');
        }
        if (input.isJustPressed(BUTTONS.UP)) {
            this.itemMenu = (this.itemMenu + usable.length - 1) % usable.length;
            sfx.play('menuMove');
        }
        if (input.isJustPressed(BUTTONS.B)) {
            this.battlePhase = 'menu';
            this.itemMenu = -1;
            sfx.play('cancel');
        }
        if (input.isJustPressed(BUTTONS.A)) {
            const item = usable[this.itemMenu];
            if (item) {
                this.useItem(item);
            }
        }
    }

    executeBash() {
        const damage = Math.max(1, this.stats.atk - this.enemy.def + Math.floor(Math.random() * 6) - 2);
        const smash = Math.random() < 0.15;
        const totalDmg = smash ? damage * 2 : damage;
        this.enemy.currentHp = Math.max(0, this.enemy.currentHp - totalDmg);
        this.battleMessage = smash ? `SMAAAASH!! ${totalDmg} damage!` : `Bash! ${totalDmg} damage to ${this.enemy.name}!`;
        this.battlePhase = 'player_attack';
        this.battleTimer = 0;
        this.enemyFlashTimer = 300;
        sfx.play('punch');
        this.screenShakeTimer = 200;
        this.screenShakeIntensity = smash ? 6 : 3;
    }

    executePsi(psi) {
        this.stats.pp -= psi.cost;
        this.targetPp = this.stats.pp;
        this.psiEffectTimer = 800;
        this.psiEffectType = psi.color;

        if (psi.power < 0) {
            // Healing PSI
            const healAmt = Math.abs(psi.power);
            this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + healAmt);
            this.targetHp = this.stats.hp;
            this.battleMessage = `${psi.name}! Recovered ${healAmt} HP!`;
            sfx.play('heal');
        } else if (psi.power === 0 && psi.name.includes('Shield')) {
            this.shieldActive = true;
            this.battleMessage = `${psi.name}! A shield of light!`;
            sfx.play('powerUp');
        } else {
            const damage = psi.power + Math.floor(Math.random() * 10);
            this.enemy.currentHp = Math.max(0, this.enemy.currentHp - damage);
            this.battleMessage = `${psi.name}! ${damage} damage!`;
            sfx.play('explosion');
            this.screenShakeTimer = 400;
            this.screenShakeIntensity = 5;
            this.enemyFlashTimer = 500;
        }

        this.battlePhase = 'player_attack';
        this.battleTimer = 0;
        this.psiMenu = -1;

        // Corruption: PSI visuals become more intense
        if (this.hauntStage >= 2) {
            this.bgWaveAmplitude += 5;
        }
    }

    useItem(item) {
        item.count--;
        if (item.heal) {
            this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + item.heal);
            this.targetHp = this.stats.hp;
            this.battleMessage = `Used ${item.name}! Recovered ${item.heal} HP!`;
            sfx.play('heal');
        } else if (item.healPp) {
            this.stats.pp = Math.min(this.stats.maxPp, this.stats.pp + item.healPp);
            this.targetPp = this.stats.pp;
            this.battleMessage = `Used ${item.name}! Recovered ${item.healPp} PP!`;
            sfx.play('heal');
        }
        this.battlePhase = 'player_attack';
        this.battleTimer = 0;
        this.itemMenu = -1;
    }

    updatePlayerAttack(dt) {
        this.battleTimer += dt;
        if (this.battleTimer > 1200) {
            if (this.enemy.currentHp <= 0) {
                this.battlePhase = 'result';
                this.battleTimer = 0;
                const expGain = this.enemy.exp;
                this.stats.exp += Math.max(0, expGain);
                this.battleMessage = `You won! Gained ${expGain} EXP!`;
                sfx.play('levelUp');
                this.addScore(expGain * 10);

                // Level up check
                if (this.stats.exp >= this.stats.level * 30) {
                    this.stats.level++;
                    this.stats.maxHp += 10;
                    this.stats.maxPp += 5;
                    this.stats.atk += 2;
                    this.stats.def += 1;
                    this.stats.hp = this.stats.maxHp;
                    this.stats.pp = this.stats.maxPp;
                    this.targetHp = this.stats.hp;
                    this.targetPp = this.stats.pp;
                    this.battleMessage += ` LEVEL UP! Lv.${this.stats.level}!`;
                }
            } else {
                this.battlePhase = 'enemy_attack';
                this.battleTimer = 0;
            }
        }
    }

    updateEnemyAttack(dt) {
        this.battleTimer += dt;
        if (this.battleTimer > 400 && this.battleTimer < 500) {
            let damage = Math.max(1, this.enemy.atk - this.stats.def + Math.floor(Math.random() * 4) - 2);
            if (this.shieldActive) {
                damage = Math.floor(damage * 0.5);
                this.shieldActive = false;
            }
            this.stats.hp -= damage;
            this.targetHp = this.stats.hp;
            this.battleMessage = `${this.enemy.name} attacks! ${damage} damage!`;
            this.playerFlashTimer = 300;
            this.screenShakeTimer = 150;
            this.screenShakeIntensity = 3;
            sfx.play('damage');
            this.battleTurns++;
        }
        if (this.battleTimer > 1200) {
            this.battlePhase = 'menu';
            this.battleTimer = 0;
        }
    }

    updateBattleResult(dt) {
        this.battleTimer += dt;
        if (this.battleTimer > 2000) {
            this.mode = 'overworld';
            this.battleActive = false;

            // Corruption: battle background persists
            if (this.hauntStage >= 3 && Math.random() < 0.3) {
                this.corruptBgPersist = true;
                this.addTimer(() => { this.corruptBgPersist = false; }, 5000 + Math.random() * 5000);
            }
        }
    }

    updateRun(dt) {
        this.battleTimer += dt;
        if (this.battleTimer < 200) return;
        const success = Math.random() < 0.5;
        if (success) {
            this.battleMessage = 'Got away!';
            if (this.battleTimer > 1000) {
                this.mode = 'overworld';
                this.battleActive = false;
            }
        } else {
            this.battleMessage = 'Could not escape!';
            if (this.battleTimer > 1000) {
                this.battlePhase = 'enemy_attack';
                this.battleTimer = 0;
            }
        }
    }

    // --- Rendering ---

    onRender(ctx, dt, timestamp) {
        // Screen shake offset
        let shakeX = 0, shakeY = 0;
        if (this.screenShakeTimer > 0) {
            shakeX = (Math.random() - 0.5) * this.screenShakeIntensity;
            shakeY = (Math.random() - 0.5) * this.screenShakeIntensity;
        }
        ctx.save();
        ctx.translate(shakeX, shakeY);

        switch (this.mode) {
            case 'overworld':
                this.renderOverworld(ctx, dt, timestamp);
                break;
            case 'battle':
                this.renderBattle(ctx, dt, timestamp);
                break;
            case 'dialogue':
                this.renderOverworld(ctx, dt, timestamp);
                this.renderDialogue(ctx, timestamp);
                break;
        }

        // Corruption: Giygas overlay at stage >= 3
        if (this.hauntStage >= 3 && this.giygasOverlay > 0) {
            this.renderGiygasOverlay(ctx, timestamp);
        }

        // Corruption: persistent battle bg bleeds into overworld
        if (this.corruptBgPersist && this.mode !== 'battle') {
            ctx.globalAlpha = 0.15;
            this.renderBattleBackground(ctx, timestamp);
            ctx.globalAlpha = 1;
        }

        ctx.restore();

        // Status bar at bottom
        this.renderStatusBar(ctx, timestamp);
    }

    renderOverworld(ctx, dt, timestamp) {
        // Ground
        ctx.fillStyle = '#44aa44';
        ctx.fillRect(0, 0, this.width, this.height);

        // Grass pattern
        const cx = this.camera.x;
        const cy = this.camera.y;
        ctx.fillStyle = '#3d9d3d';
        for (let gx = -16; gx < this.width + 16; gx += 32) {
            for (let gy = -16; gy < this.height + 16; gy += 32) {
                const wx = gx + cx;
                const wy = gy + cy;
                if ((Math.floor(wx / 32) + Math.floor(wy / 32)) % 2 === 0) {
                    ctx.fillRect(gx - (cx % 32), gy - (cy % 32), 32, 32);
                }
            }
        }

        // Roads
        ctx.fillStyle = '#888888';
        ctx.fillRect(0, 240 - cy, this.mapWidth, 30);
        ctx.fillRect(380 - cx, 0, 25, this.mapHeight);
        // Road lines
        ctx.fillStyle = '#cccc44';
        for (let rx = 0; rx < this.mapWidth; rx += 40) {
            ctx.fillRect(rx - cx, 254 - cy, 20, 2);
        }

        // Trees (drawn behind buildings if above them)
        for (const t of this.trees) {
            const tx = t.x - cx;
            const ty = t.y - cy;
            if (tx < -30 || tx > this.width + 30 || ty < -40 || ty > this.height + 30) continue;
            // Trunk
            ctx.fillStyle = '#664422';
            ctx.fillRect(tx - 3, ty + 10, 6, 14);
            // Canopy
            ctx.fillStyle = '#228822';
            ctx.beginPath();
            ctx.arc(tx, ty + 4, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#33aa33';
            ctx.beginPath();
            ctx.arc(tx - 2, ty + 2, 8, 0, Math.PI * 2);
            ctx.fill();
        }

        // Buildings
        for (const b of this.buildings) {
            const bx = b.x - cx;
            const by = b.y - cy;
            if (bx + b.w < 0 || bx > this.width || by + b.h < 0 || by > this.height) continue;

            // Wall
            ctx.fillStyle = b.color;
            ctx.fillRect(bx, by, b.w, b.h);
            // Roof
            ctx.fillStyle = b.roofColor;
            ctx.beginPath();
            ctx.moveTo(bx - 5, by);
            ctx.lineTo(bx + b.w / 2, by - 20);
            ctx.lineTo(bx + b.w + 5, by);
            ctx.closePath();
            ctx.fill();
            // Door
            ctx.fillStyle = '#442200';
            ctx.fillRect(bx + b.w / 2 - 8, by + b.h - 18, 16, 18);
            // Windows
            ctx.fillStyle = '#aaddff';
            ctx.fillRect(bx + 10, by + 12, 12, 10);
            ctx.fillRect(bx + b.w - 22, by + 12, 12, 10);
            // Label
            ctx.fillStyle = '#fff';
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(b.name, bx + b.w / 2, by - 22);
            ctx.textAlign = 'left';

            // Corruption: building windows show wrong scenes
            if (this.hauntStage >= 2 && Math.random() < 0.01) {
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(bx + 10, by + 12, 12, 10);
            }
        }

        // NPCs
        for (let ni = 0; ni < this.npcs.length; ni++) {
            const npc = this.npcs[ni];
            const nx = npc.x - cx;
            const ny = npc.y - cy;
            if (nx < -20 || nx > this.width + 20 || ny < -30 || ny > this.height + 20) continue;

            // Corruption: NPC flicker
            if (this.hauntStage >= 2 && Math.random() < 0.03 * this.hauntStage) {
                ctx.globalAlpha = 0.3;
            }

            // Body
            ctx.fillStyle = npc.color;
            ctx.fillRect(nx - npc.w / 2, ny - npc.h / 2, npc.w, npc.h);
            // Head
            ctx.fillStyle = '#ffcc88';
            ctx.beginPath();
            ctx.arc(nx, ny - npc.h / 2 - 5, 6, 0, Math.PI * 2);
            ctx.fill();
            // Eyes
            ctx.fillStyle = this.hauntStage >= 3 ? '#ff0000' : '#000';
            ctx.fillRect(nx - 3, ny - npc.h / 2 - 7, 2, 2);
            ctx.fillRect(nx + 1, ny - npc.h / 2 - 7, 2, 2);

            ctx.globalAlpha = 1;
        }

        // Player
        this.renderPlayer(ctx, timestamp);
    }

    renderPlayer(ctx, timestamp) {
        const px = this.player.x - this.camera.x;
        const py = this.player.y - this.camera.y;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(px + this.player.w / 2, py + this.player.h, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body (Ness-style)
        ctx.fillStyle = '#ff4444';  // Red shirt/cap
        ctx.fillRect(px, py + 4, this.player.w, this.player.h - 4);
        // Shorts
        ctx.fillStyle = '#4444ff';
        ctx.fillRect(px + 1, py + 14, this.player.w - 2, 6);
        // Shoes
        ctx.fillStyle = '#cc2222';
        ctx.fillRect(px, py + this.player.h - 4, 6, 4);
        ctx.fillRect(px + this.player.w - 6, py + this.player.h - 4, 6, 4);
        // Head
        ctx.fillStyle = '#ffcc88';
        ctx.beginPath();
        ctx.arc(px + this.player.w / 2, py + 2, 8, 0, Math.PI * 2);
        ctx.fill();
        // Cap
        ctx.fillStyle = '#ff2222';
        ctx.beginPath();
        ctx.arc(px + this.player.w / 2, py - 1, 9, Math.PI, Math.PI * 2);
        ctx.fill();
        // Cap brim
        ctx.fillRect(px + this.player.w / 2 - 10, py + 1, 20, 3);
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(px + 4, py, 3, 3);
        ctx.fillRect(px + this.player.w - 7, py, 3, 3);

        // Walk animation bob
        if (this.player.frame % 2 === 1) {
            ctx.fillStyle = '#cc2222';
            ctx.fillRect(px - 2, py + 10, 3, 3);
        }
    }

    renderBattle(ctx, dt, timestamp) {
        // Psychedelic background
        this.renderBattleBackground(ctx, timestamp);

        // Enemy display
        this.renderBattleEnemy(ctx, timestamp);

        // Battle menu
        this.renderBattleUI(ctx, timestamp);

        // PSI effect overlay
        if (this.psiEffectTimer > 0) {
            this.renderPsiEffect(ctx, timestamp);
        }
    }

    renderBattleBackground(ctx, timestamp) {
        const palettes = [
            ['#220044', '#440088', '#6600cc', '#8800ff', '#aa44ff'],
            ['#002244', '#004488', '#0066cc', '#0088ff', '#44aaff'],
            ['#440022', '#880044', '#cc0066', '#ff0088', '#ff44aa'],
            ['#004422', '#008844', '#00cc66', '#00ff88', '#44ffaa'],
            ['#442200', '#884400', '#cc6600', '#ff8800', '#ffaa44']
        ];
        const pal = palettes[this.battleBgPalette % palettes.length];

        // Haunting: override palette at high corruption
        const usePal = this.hauntStage >= 3 ? ['#220000', '#440000', '#660000', '#880000', '#aa0000'] : pal;

        // Draw swirling psychedelic pattern
        const t = this.battleBgOffset;
        const distort = this.bgDistortionPhase;

        for (let y = 0; y < this.height - 80; y += 4) {
            for (let x = 0; x < this.width; x += 4) {
                const wave = Math.sin(x * 0.02 + t) * this.bgWaveAmplitude +
                             Math.cos(y * 0.03 + t * 0.7) * this.bgWaveAmplitude * 0.5 +
                             Math.sin((x + y) * 0.015 + distort) * 10;
                const colorIdx = Math.abs(Math.floor(wave + t * 2)) % usePal.length;
                ctx.fillStyle = usePal[colorIdx];
                ctx.fillRect(x, y, 4, 4);
            }
        }

        // Additional pattern layers based on bgPatternIndex
        ctx.globalAlpha = 0.3;
        switch (this.bgPatternIndex) {
            case 0: // Checkerboard warp
                for (let y = 0; y < this.height - 80; y += 16) {
                    for (let x = 0; x < this.width; x += 16) {
                        const shift = Math.sin(y * 0.05 + t * 0.5) * 8;
                        if ((Math.floor((x + shift) / 16) + Math.floor(y / 16)) % 2 === 0) {
                            ctx.fillStyle = usePal[4];
                            ctx.fillRect(x, y, 16, 16);
                        }
                    }
                }
                break;
            case 1: // Concentric circles
                for (let r = 0; r < 300; r += 8) {
                    ctx.strokeStyle = usePal[r % usePal.length];
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(this.width / 2, (this.height - 80) / 2,
                            r + Math.sin(t * 0.3 + r * 0.1) * 10, 0, Math.PI * 2);
                    ctx.stroke();
                }
                break;
            case 2: // Diagonal stripes
                for (let d = -this.width; d < this.width + this.height; d += 12) {
                    const shift = Math.sin(d * 0.05 + t) * 6;
                    ctx.strokeStyle = usePal[(d / 12 | 0) % usePal.length];
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.moveTo(d + shift, 0);
                    ctx.lineTo(d + shift - this.height, this.height - 80);
                    ctx.stroke();
                }
                break;
            case 3: // Spiral
                ctx.lineWidth = 2;
                for (let a = 0; a < Math.PI * 8; a += 0.1) {
                    const r = a * 15 + Math.sin(t * 0.5) * 20;
                    const sx = this.width / 2 + Math.cos(a + t * 0.2) * r;
                    const sy = (this.height - 80) / 2 + Math.sin(a + t * 0.2) * r;
                    ctx.fillStyle = usePal[Math.floor(a) % usePal.length];
                    ctx.fillRect(sx, sy, 3, 3);
                }
                break;
        }
        ctx.globalAlpha = 1;
    }

    renderBattleEnemy(ctx, timestamp) {
        if (!this.enemy) return;

        const ex = this.width / 2;
        const ey = 130;

        // Enemy flash on hit
        if (this.enemyFlashTimer > 0 && Math.floor(this.enemyFlashTimer / 50) % 2 === 0) {
            ctx.globalAlpha = 0.3;
        }

        // Draw enemy (abstract shape representation)
        ctx.fillStyle = this.enemy.color;
        ctx.beginPath();
        ctx.ellipse(ex, ey, 30, 40, 0, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = this.hauntStage >= 3 ? '#ff0000' : '#fff';
        ctx.fillRect(ex - 12, ey - 10, 8, 8);
        ctx.fillRect(ex + 4, ey - 10, 8, 8);
        ctx.fillStyle = '#000';
        ctx.fillRect(ex - 10, ey - 8, 4, 4);
        ctx.fillRect(ex + 6, ey - 8, 4, 4);
        // Mouth
        ctx.fillStyle = '#000';
        ctx.fillRect(ex - 8, ey + 8, 16, 4);

        ctx.globalAlpha = 1;

        // Enemy name & HP
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.enemy.name, ex, ey - 55);
        const ehp = Math.ceil(this.enemy.displayHp);
        ctx.font = '10px monospace';
        ctx.fillText(`HP: ${ehp}/${this.enemy.hp}`, ex, ey - 42);
        ctx.textAlign = 'left';
    }

    renderBattleUI(ctx, timestamp) {
        const boxY = this.height - 110;
        // Battle box background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, boxY, this.width, 110);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(2, boxY + 2, this.width - 4, 106);

        // Player flash
        if (this.playerFlashTimer > 0 && Math.floor(this.playerFlashTimer / 50) % 2 === 0) {
            ctx.fillStyle = 'rgba(255,0,0,0.3)';
            ctx.fillRect(4, boxY + 4, this.width - 8, 102);
        }

        // HP / PP display with rolling counter
        const hpDisplay = this.getHpDisplayString();
        const ppDisplay = this.getPpDisplayString();

        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`HP: ${hpDisplay}`, 20, boxY + 22);
        ctx.fillStyle = '#44ccff';
        ctx.fillText(`PP: ${ppDisplay}`, 170, boxY + 22);
        ctx.fillStyle = '#aaa';
        ctx.font = '10px monospace';
        ctx.fillText(`Lv.${this.stats.level}`, 300, boxY + 22);

        // Battle message
        if (this.battleMessage) {
            ctx.fillStyle = '#fff';
            ctx.font = '12px monospace';
            ctx.fillText(this.battleMessage, 20, boxY + 44);
        }

        // Menu (only in menu phase)
        if (this.battlePhase === 'menu') {
            const menuItems = ['Bash', 'PSI', 'Items', 'Run'];
            const menuX = 20;
            const menuY = boxY + 58;
            for (let i = 0; i < menuItems.length; i++) {
                const sel = i === this.battleMenu;
                ctx.fillStyle = sel ? '#ffcc00' : '#888';
                ctx.font = `${sel ? 'bold ' : ''}12px monospace`;
                ctx.fillText(`${sel ? '>' : ' '} ${menuItems[i]}`, menuX + (i % 2) * 100, menuY + Math.floor(i / 2) * 18);
            }
        }

        // PSI submenu
        if (this.battlePhase === 'psi_select') {
            ctx.fillStyle = 'rgba(0,0,40,0.9)';
            ctx.fillRect(200, boxY + 30, 200, PSI_ATTACKS.length * 18 + 10);
            ctx.strokeStyle = '#8888ff';
            ctx.strokeRect(200, boxY + 30, 200, PSI_ATTACKS.length * 18 + 10);
            for (let i = 0; i < PSI_ATTACKS.length; i++) {
                const psi = PSI_ATTACKS[i];
                const sel = i === this.psiMenu;
                ctx.fillStyle = sel ? psi.color : '#aaa';
                ctx.font = '10px monospace';
                ctx.fillText(`${sel ? '>' : ' '} ${psi.name} (${psi.cost}PP)`, 210, boxY + 48 + i * 18);
            }
        }

        // Item submenu
        if (this.battlePhase === 'item_select') {
            const usable = this.items.filter(i => i.count > 0);
            ctx.fillStyle = 'rgba(0,40,0,0.9)';
            ctx.fillRect(200, boxY + 30, 200, usable.length * 18 + 10);
            ctx.strokeStyle = '#44aa44';
            ctx.strokeRect(200, boxY + 30, 200, usable.length * 18 + 10);
            for (let i = 0; i < usable.length; i++) {
                const item = usable[i];
                const sel = i === this.itemMenu;
                ctx.fillStyle = sel ? '#44ff44' : '#aaa';
                ctx.font = '10px monospace';
                ctx.fillText(`${sel ? '>' : ' '} ${item.name} x${item.count}`, 210, boxY + 48 + i * 18);
            }
        }
    }

    getHpDisplayString() {
        if (this.impossibleHpDisplay) {
            // Corruption: show impossible numbers
            const glitch = Math.random();
            if (glitch < 0.3) return `${-Math.floor(Math.random() * 999)}`;
            if (glitch < 0.5) return `${Math.floor(Math.random() * 99999)}`;
            if (glitch < 0.7) return 'NaN';
            return '??/??' ;
        }
        const displayVal = Math.ceil(this.displayHp);
        // At hauntStage>=2, HP can show negative during roll
        if (this.hauntStage >= 2 && this.displayHp < 0) {
            return `${Math.floor(this.displayHp)}/${this.stats.maxHp}`;
        }
        return `${Math.max(0, displayVal)}/${this.stats.maxHp}`;
    }

    getPpDisplayString() {
        const displayVal = Math.ceil(this.displayPp);
        return `${Math.max(0, displayVal)}/${this.stats.maxPp}`;
    }

    renderPsiEffect(ctx, timestamp) {
        const progress = 1 - (this.psiEffectTimer / 800);
        ctx.globalAlpha = 0.4 * (1 - progress);

        // Color cycling flash
        const cycleColor = this.psiEffectType || '#ff00ff';
        ctx.fillStyle = cycleColor;
        ctx.fillRect(0, 0, this.width, this.height - 80);

        // Radial burst
        const cx = this.width / 2;
        const cy = 130;
        const radius = progress * 200;
        ctx.strokeStyle = cycleColor;
        ctx.lineWidth = 3;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(a + timestamp * 0.01) * radius,
                       cy + Math.sin(a + timestamp * 0.01) * radius);
            ctx.stroke();
        }

        // Screen distortion lines
        if (this.hauntStage >= 2) {
            for (let i = 0; i < 5; i++) {
                const ly = Math.random() * this.height;
                ctx.fillStyle = cycleColor;
                ctx.fillRect(0, ly, this.width, 2);
            }
        }

        ctx.globalAlpha = 1;
    }

    renderGiygasOverlay(ctx, timestamp) {
        const intensity = this.giygasOverlay * (0.1 + Math.sin(this.giygasPhase) * 0.05);
        ctx.globalAlpha = intensity;

        // Red/black swirling organic shapes
        for (let i = 0; i < 8; i++) {
            const angle = this.giygasPhase * (0.5 + i * 0.1) + i * (Math.PI / 4);
            const radius = 80 + Math.sin(this.giygasPhase * 0.3 + i) * 60;
            const gx = this.width / 2 + Math.cos(angle) * radius;
            const gy = this.height / 2 + Math.sin(angle) * radius;
            const size = 40 + Math.sin(this.giygasPhase * 0.7 + i * 2) * 25;

            const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, size);
            grad.addColorStop(0, 'rgba(180,0,0,0.8)');
            grad.addColorStop(0.5, 'rgba(80,0,0,0.4)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(gx, gy, size, size * 0.7, angle, 0, Math.PI * 2);
            ctx.fill();
        }

        // Pulsing face-like shapes (Giygas)
        if (this.giygasOverlay > 0.5) {
            const faceX = this.width / 2 + Math.sin(this.giygasPhase * 0.2) * 40;
            const faceY = this.height / 2 + Math.cos(this.giygasPhase * 0.15) * 30;
            ctx.strokeStyle = 'rgba(255,0,0,0.3)';
            ctx.lineWidth = 2;
            // Eye shapes
            ctx.beginPath();
            ctx.ellipse(faceX - 30, faceY - 20, 15, 10, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(faceX + 30, faceY - 20, 15, 10, 0, 0, Math.PI * 2);
            ctx.stroke();
            // Mouth
            ctx.beginPath();
            ctx.arc(faceX, faceY + 20, 25, 0.2, Math.PI - 0.2);
            ctx.stroke();
        }

        // Text fragments
        if (Math.random() < 0.02) {
            const texts = ['PRAY', 'YOU CANNOT GRASP', 'IT HURTS', 'NESS NESS NESS', 'I FEEL... G O O D'];
            ctx.fillStyle = 'rgba(255,50,50,0.5)';
            ctx.font = `${10 + Math.random() * 14}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(texts[Math.floor(Math.random() * texts.length)],
                         Math.random() * this.width, Math.random() * this.height);
            ctx.textAlign = 'left';
        }

        ctx.globalAlpha = 1;
    }

    renderDialogue(ctx, timestamp) {
        const boxY = this.height - 100;
        ctx.fillStyle = 'rgba(0,0,0,0.9)';
        ctx.fillRect(20, boxY, this.width - 40, 80);
        ctx.strokeStyle = this.hauntStage >= 2 ? '#880000' : '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(20, boxY, this.width - 40, 80);

        const visibleText = this.dialogueText.substring(0, this.dialogueCharIndex);
        ctx.fillStyle = this.hauntStage >= 3 ? '#ff4444' : '#fff';
        ctx.font = '12px monospace';

        // Word wrap
        const maxW = this.width - 80;
        const words = visibleText.split(' ');
        let line = '';
        let lineY = boxY + 22;
        for (const word of words) {
            const test = line + word + ' ';
            if (ctx.measureText(test).width > maxW) {
                ctx.fillText(line, 35, lineY);
                line = word + ' ';
                lineY += 16;
            } else {
                line = test;
            }
        }
        ctx.fillText(line, 35, lineY);

        // Blinking cursor
        if (this.dialogueCharIndex >= this.dialogueText.length && Math.sin(timestamp / 300) > 0) {
            ctx.fillStyle = '#ffcc00';
            ctx.fillText('v', this.width - 55, boxY + 65);
        }

        // Corruption: text scramble
        if (this.hauntStage >= 2 && Math.random() < 0.03) {
            ctx.fillStyle = 'rgba(255,0,0,0.5)';
            ctx.font = '12px monospace';
            const glitchText = visibleText.split('').map(c =>
                Math.random() < 0.2 ? String.fromCharCode(33 + Math.floor(Math.random() * 93)) : c
            ).join('');
            ctx.fillText(glitchText, 35 + (Math.random() - 0.5) * 4, boxY + 22 + (Math.random() - 0.5) * 4);
        }
    }

    renderStatusBar(ctx, timestamp) {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, this.height - 24, this.width, 24);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, this.height - 24, this.width, 24);

        const hpStr = this.getHpDisplayString();
        const ppStr = this.getPpDisplayString();

        ctx.font = '10px monospace';
        ctx.fillStyle = '#ffcc00';
        ctx.fillText(`HP:${hpStr}`, 10, this.height - 9);
        ctx.fillStyle = '#44ccff';
        ctx.fillText(`PP:${ppStr}`, 140, this.height - 9);
        ctx.fillStyle = '#aaa';
        ctx.fillText(`Lv.${this.stats.level}`, 260, this.height - 9);
        ctx.fillText(`EXP:${this.stats.exp}`, 330, this.height - 9);

        // Corruption indicator
        if (this.hauntStage >= 1) {
            ctx.fillStyle = `rgba(255,0,0,${0.3 + Math.sin(timestamp * 0.005) * 0.2})`;
            const corrW = Math.min(this.corruptionLevel * 60, 60);
            ctx.fillRect(this.width - 70, this.height - 18, corrW, 8);
        }
    }

    rectOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
    }
}

export default PossessedEarthbound;
