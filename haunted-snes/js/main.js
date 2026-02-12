// main.js — Entry point, boot sequence, wiring

import { events, EVENTS } from './core/events.js';
import state from './core/state.js';
import { input } from './core/input.js';
import { renderer } from './core/renderer.js';
import { audioEngine } from './audio/audio-engine.js';
import { sfx } from './audio/sfx.js';
import { crt } from './effects/crt.js';
import { corruption } from './effects/corruption.js';
import { consoleUI } from './ui/console-ui.js';
import { controllerUI } from './ui/controller-ui.js';
import { tvControls } from './ui/tv-controls.js';
import { progression } from './haunting/progression.js';
import { entity } from './haunting/entity.js';
import { narrative } from './haunting/narrative.js';
import { browserEffects } from './haunting/browser-effects.js';
import { persistence } from './haunting/persistence.js';
import { debugPanel } from './ui/debug-panel.js';

// Game imports
import { CursedMarioWorld } from './games/cursed-mario-world.js';
import { HauntedFZero } from './games/haunted-fzero.js';
import { PossessedStreetFighter } from './games/possessed-street-fighter.js';
import { CorruptedChronoTrigger } from './games/corrupted-chrono-trigger.js';
import { DrownedSuperMetroid } from './games/drowned-super-metroid.js';
import { GhostDonkeyKongCountry } from './games/ghost-donkey-kong-country.js';
import { CursedZeldaLttP } from './games/cursed-zelda-lttp.js';
import { HauntedStarFox } from './games/haunted-star-fox.js';
import { PossessedEarthbound } from './games/possessed-earthbound.js';
import { CursedSuperCastlevania } from './games/cursed-super-castlevania.js';
import { LostSignal } from './games/lost-signal.js';
import { TheCartridge } from './games/the-cartridge.js';
import { SecretGame } from './games/secret-game.js';

class HauntedSNES {
    constructor() {
        this.games = [];
        this.currentGame = null;
        this.bootPhase = 0;
        this.powerClickCount = 0;
        this.powerClickTimer = null;
    }

    async init() {
        // Load persistence first
        persistence.load();

        // Init core systems
        renderer.init();
        input.init();

        // Init effects
        crt.init();
        corruption.init();

        // Init UI
        consoleUI.init();
        controllerUI.init();
        tvControls.init();

        // Init haunting
        entity.init();
        narrative.init();
        browserEffects.init();
        debugPanel.init();

        // Register games
        this.registerGames();

        // Wire events
        this.wireEvents();

        // Start render loop (but screen is off)
        renderer.start();

        // Add CRT post-processor
        renderer.addPostProcessor(crt);
        renderer.addPostProcessor(corruption);

        // Track visits
        const visits = state.get('visitCount');
        state.set('visitCount', visits + 1);

        // Show return message if applicable
        if (visits > 0) {
            this.showReturnMessage(visits);
        }

        // Console greeting
        console.log('%c SUPER HAUNTED COLLECTION ', 'background: #5a4a8a; color: #ffd700; font-size: 16px; font-weight: bold; padding: 8px 16px;');
        console.log('%cInsert cartridge and press POWER', 'color: #888; font-size: 12px;');

        // Easter egg: console commands
        window.__SNES = {
            debug: () => { events.emit(EVENTS.DEBUG_TOGGLE); return 'DEBUG MODE ACTIVATED'; },
            haunt: (stage) => { progression.setStage(stage || 4); return `HAUNT STAGE SET TO ${stage || 4}`; },
            help: () => 'WHO ARE YOU TALKING TO?',
            alex: () => { console.log('%cYOU REMEMBER?', 'color: #ff4488; font-size: 20px;'); return '...'; },
            hello: () => 'H̷E̶L̵L̷O̸'
        };
    }

    registerGames() {
        this.games = [
            new CursedMarioWorld(),
            new HauntedFZero(),
            new PossessedStreetFighter(),
            new CorruptedChronoTrigger(),
            new DrownedSuperMetroid(),
            new GhostDonkeyKongCountry(),
            new CursedZeldaLttP(),
            new HauntedStarFox(),
            new PossessedEarthbound(),
            new CursedSuperCastlevania(),
            new LostSignal(),
            new TheCartridge(),
            new SecretGame()
        ];

        // Init all games
        for (const game of this.games) {
            game.init(renderer.getDimensions());
        }
    }

    wireEvents() {
        // Power button
        const powerBtn = document.getElementById('power-btn');
        powerBtn?.addEventListener('click', () => {
            this.handlePowerClick();
        });

        // Reset button (channel change)
        const resetBtn = document.getElementById('reset-btn');
        resetBtn?.addEventListener('click', () => {
            if (state.get('powerOn')) {
                this.changeChannel(1);
                sfx.play('channelChange');
            }
        });

        // Eject button
        const ejectBtn = document.getElementById('eject-btn');
        ejectBtn?.addEventListener('click', () => {
            events.emit(EVENTS.CONSOLE_EJECT);
        });

        // Konami code
        events.on('konami:complete', () => {
            console.log('%cKONAMI CODE ACTIVATED', 'color: #ff0; font-size: 16px;');
            progression.setStage(4);
            corruption.setIntensity(1.0);
            sfx.play('konamiActivate');
        });

        // Secret game unlock
        events.on('secret:unlock', () => {
            state.set('secretGameUnlocked', true);
            console.log('%c??? UNLOCKED ???', 'color: #f0f; font-size: 20px;');
        });

        // Channel change via game
        events.on(EVENTS.CHANNEL_CHANGE, (data) => {
            this.switchToChannel(data.channel);
        });

        // Haunting stage changes
        events.on(EVENTS.HAUNT_STAGE_CHANGE, (data) => {
            this.onHauntStageChange(data.stage, data.oldStage);
        });

        // Save on visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                persistence.save();
            }
        });

        // Save before unload
        window.addEventListener('beforeunload', () => {
            if (state.get('powerOn')) {
                state.set('totalPlayTime',
                    state.get('totalPlayTime') + (Date.now() - state.get('startTime'))
                );
            }
            persistence.save();
        });
    }

    handlePowerClick() {
        this.powerClickCount++;

        if (this.powerClickTimer) clearTimeout(this.powerClickTimer);
        this.powerClickTimer = setTimeout(() => {
            this.powerClickCount = 0;
        }, 500);

        // Triple click = debug
        if (this.powerClickCount >= 3) {
            this.powerClickCount = 0;
            events.emit(EVENTS.DEBUG_TOGGLE);
            return;
        }

        // Normal power toggle
        if (this.powerClickCount === 1) {
            setTimeout(() => {
                if (this.powerClickCount === 1) {
                    this.togglePower();
                }
            }, 300);
        }
    }

    async togglePower() {
        if (state.get('powerOn')) {
            this.powerOff();
        } else {
            await this.powerOn();
        }
    }

    async powerOn() {
        state.set('powerOn', true);
        state.set('booting', true);
        state.set('startTime', Date.now());
        state.set('hauntStartTime', Date.now());

        events.emit(EVENTS.POWER_ON);

        // Init audio on user gesture
        await audioEngine.init();

        // Boot sequence
        await this.bootSequence();

        state.set('booting', false);
        state.set('bootComplete', true);

        // Start first game
        this.switchToChannel(0);

        // Start haunting progression
        progression.start();

        events.emit(EVENTS.BOOT_COMPLETE);
    }

    powerOff() {
        state.set('powerOn', false);
        state.set('bootComplete', false);

        // Stop current game
        if (this.currentGame) {
            this.currentGame.stop();
            renderer.removeLayer(this.currentGame);
            this.currentGame = null;
        }

        // Stop systems
        progression.stop();
        audioEngine.stopAll();

        // Update play time
        state.set('totalPlayTime',
            state.get('totalPlayTime') + (Date.now() - state.get('startTime'))
        );

        persistence.save();
        events.emit(EVENTS.POWER_OFF);
    }

    async bootSequence() {
        const screen = document.getElementById('screen');
        const powerOff = document.getElementById('power-off-screen');
        const canvas = renderer.getMainContext();

        // Screen on animation
        powerOff?.classList.add('hidden');
        screen?.classList.add('power-on');

        // Phase 1: Black screen + noise
        await this.sleep(300);
        sfx.play('powerOn');

        // Phase 2: SNES logo
        await this.sleep(500);
        this.drawBootLogo(canvas);
        sfx.play('bootChime');

        // Phase 3: "Licensed by Nintendo" (parody)
        await this.sleep(1500);
        canvas.clearRect(0, 0, 512, 448);
        canvas.fillStyle = '#000';
        canvas.fillRect(0, 0, 512, 448);
        canvas.fillStyle = '#888';
        canvas.font = '12px monospace';
        canvas.textAlign = 'center';
        canvas.fillText('Licensed by', 256, 200);
        canvas.fillStyle = '#ccc';
        canvas.font = '16px monospace';
        canvas.fillText('PHANTOM ENTERTAINMENT', 256, 224);
        canvas.fillStyle = '#666';
        canvas.font = '10px monospace';
        canvas.fillText('© 1994', 256, 248);

        // Phase 4: Wait
        await this.sleep(1500);
        canvas.clearRect(0, 0, 512, 448);

        screen?.classList.remove('power-on');
    }

    drawBootLogo(ctx) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 512, 448);

        // SNES-style logo
        ctx.fillStyle = '#5a4a8a';
        ctx.fillRect(156, 160, 200, 60);

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Super', 256, 182);
        ctx.font = 'bold 20px monospace';
        ctx.fillText('HAUNTED', 256, 204);

        ctx.fillStyle = '#aaa';
        ctx.font = '10px monospace';
        ctx.fillText('ENTERTAINMENT SYSTEM', 256, 250);

        // Subtle: one pixel flickers (Stage 0 hint)
        if (Math.random() > 0.7) {
            const px = Math.floor(Math.random() * 512);
            const py = Math.floor(Math.random() * 448);
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fillRect(px, py, 1, 1);
        }
    }

    changeChannel(direction) {
        let channel = state.get('currentChannel') + direction;
        const total = state.get('secretGameUnlocked') ?
            state.get('totalChannels') : state.get('totalChannels') - 1;

        if (channel >= total) channel = 0;
        if (channel < 0) channel = total - 1;

        this.switchToChannel(channel);
    }

    switchToChannel(channel) {
        // Stop current game
        if (this.currentGame) {
            this.currentGame.stop();
            renderer.removeLayer(this.currentGame);
        }

        state.set('currentChannel', channel);

        // Show channel indicator
        const display = document.getElementById('channel-display');
        const numEl = document.getElementById('channel-number');
        const nameEl = document.getElementById('channel-name');

        if (display && numEl && nameEl) {
            numEl.textContent = String(channel + 1).padStart(2, '0');
            nameEl.textContent = this.games[channel]?.name || '???';
            display.classList.add('visible');
            setTimeout(() => display.classList.remove('visible'), 2000);
        }

        // Start new game
        const game = this.games[channel];
        if (game) {
            this.currentGame = game;
            renderer.addLayer(game, 0);
            game.start();
            state.set('currentGame', game.id);
            events.emit(EVENTS.GAME_START, { game: game.id, channel });

            // Track game history for cross-game bleed
            const history = state.get('gameHistory');
            history.push({ game: game.id, time: Date.now() });
            if (history.length > 20) history.shift();
        }

        sfx.play('channelChange');
    }

    onHauntStageChange(newStage, oldStage) {
        console.log(`%c[HAUNT] Stage ${oldStage} → ${newStage}: ${state.getHauntStageName(newStage)}`,
            'color: #ff4488;');

        switch (newStage) {
            case 1: // Stirring
                input.setDelay(30);
                break;
            case 2: // Active
                input.setDelay(60);
                break;
            case 3: // Aggressive
                input.setDelay(100);
                break;
            case 4: // Consumed
                input.setDelay(150);
                break;
        }
    }

    showReturnMessage(visits) {
        const messages = [
            'YOU CAME BACK.',
            'WE MISSED YOU.',
            'DID YOU THINK LEAVING WOULD HELP?',
            'THE CARTRIDGE REMEMBERS.',
            'VISIT #' + visits + '. WHY DO YOU KEEP RETURNING?',
            'ALEX WAITED FOR YOU.',
            'THE SAVE FILE GREW WHILE YOU WERE GONE.',
            'SOMETHING CHANGED SINCE LAST TIME.',
            'WELCOME HOME.',
            'YOU CAN\'T LEAVE. NOT REALLY.'
        ];
        const msg = messages[Math.min(visits - 1, messages.length - 1)];
        console.log(`%c${msg}`, 'color: #ff4488; font-size: 14px;');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Boot
const app = new HauntedSNES();
document.addEventListener('DOMContentLoaded', () => app.init());

export default app;
