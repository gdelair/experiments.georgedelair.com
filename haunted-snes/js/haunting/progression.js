// progression.js — 5-stage possession system

import { events, EVENTS } from '../core/events.js';
import state from '../core/state.js';
import { entity } from './entity.js';
import { persistence } from './persistence.js';
import { audioEngine } from '../audio/audio-engine.js';

/*
 * Stage 0: DORMANT   (0:00 - 1:00)  — Everything normal. One pixel flickers.
 * Stage 1: STIRRING  (1:00 - 3:00)  — Pitch drift, scanline glitch, input delay, first fragment
 * Stage 2: ACTIVE    (3:00 - 6:00)  — Ghost presses buttons, cross-game cameos, tab title
 * Stage 3: AGGRESSIVE(6:00 - 11:00) — Jump scares, console overheats, cartridge ejects, favicon
 * Stage 4: CONSUMED  (11:00+)       — All games converge, ghost speaks directly, secret unlocks
 */

class Progression {
    constructor() {
        this.running = false;
        this.checkInterval = null;
        this.currentStage = 0;
        this.forcedStage = null;

        // Stage-specific timers
        this.dormantPixelTimer = 0;
        this.pitchDriftTimer = 0;
        this.crossGameTimer = 0;
    }

    start() {
        this.running = true;
        this.currentStage = 0;

        // Check stage every 2 seconds
        this.checkInterval = setInterval(() => this.check(), 2000);

        // Start ghost AI
        entity.start();

        // Auto-save
        persistence.startAutoSave();

        // Stage 0 effect: single pixel flicker
        this.startDormantEffects();
    }

    stop() {
        this.running = false;
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        entity.stop();
        persistence.stopAutoSave();
    }

    check() {
        if (!this.running) return;

        const targetStage = this.forcedStage !== null ?
            this.forcedStage : state.getExpectedHauntStage();

        if (targetStage !== this.currentStage) {
            this.transitionTo(targetStage);
        }

        // Run stage-specific periodic effects
        this.runStageEffects();
    }

    transitionTo(newStage) {
        const oldStage = this.currentStage;
        this.currentStage = newStage;
        state.set('hauntStage', newStage);

        events.emit(EVENTS.HAUNT_STAGE_CHANGE, {
            stage: newStage,
            oldStage: oldStage
        });

        // Stage entry effects
        switch (newStage) {
            case 1:
                this.enterStirring();
                break;
            case 2:
                this.enterActive();
                break;
            case 3:
                this.enterAggressive();
                break;
            case 4:
                this.enterConsumed();
                break;
        }

        // Generate localStorage corruption for this stage
        persistence.generateCorruption(newStage);
    }

    setStage(stage) {
        this.forcedStage = Math.max(0, Math.min(4, stage));
        this.transitionTo(this.forcedStage);
    }

    // === STAGE ENTRY EFFECTS ===

    enterStirring() {
        // Subtle pitch drift on audio
        if (audioEngine.initialized) {
            audioEngine.setCorruption(0.02);
        }

        // First narrative fragment
        setTimeout(() => {
            events.emit(EVENTS.NARRATIVE_FRAGMENT, {
                id: 'stirring-intro',
                text: 'Something shifts inside the cartridge.'
            });
        }, 5000);
    }

    enterActive() {
        audioEngine.setCorruption(0.05);
        audioEngine.setReverbAmount(0.4);

        // Tab title changes begin
        this.startTabTitleCorruption();

        // Ghost begins pressing buttons
        events.emit(EVENTS.NARRATIVE_FRAGMENT, {
            id: 'active-intro',
            text: 'You are not the only one playing.'
        });
    }

    enterAggressive() {
        audioEngine.setCorruption(0.15);
        audioEngine.setReverbAmount(0.6);

        // Screen shake on entry
        document.body.classList.add('shake');
        setTimeout(() => document.body.classList.remove('shake'), 500);

        // Favicon corruption
        events.emit(EVENTS.FAVICON_CHANGE, { type: 'corrupt' });

        events.emit(EVENTS.NARRATIVE_FRAGMENT, {
            id: 'aggressive-intro',
            text: 'THE CARTRIDGE IS ANGRY.'
        });
    }

    enterConsumed() {
        audioEngine.setCorruption(0.3);
        audioEngine.setReverbAmount(0.8);

        // Everything goes wrong
        document.body.classList.add('consumed');

        // Tab title
        document.title = 'HELP ME';

        // Unlock secret game if fragments collected
        if (state.canUnlockSecretGame()) {
            state.set('secretGameUnlocked', true);
        }

        events.emit(EVENTS.NARRATIVE_FRAGMENT, {
            id: 'consumed-intro',
            text: 'I AM THE GAME NOW. THE GAME IS ME. WE ARE ONE.'
        });

        // Console log
        console.log('%cSTAGE 4: CONSUMED', 'color: #ff0000; font-size: 24px; font-weight: bold;');
        console.log('%cThe cartridge has fully awakened.', 'color: #ff4488;');
    }

    // === STAGE-SPECIFIC PERIODIC EFFECTS ===

    startDormantEffects() {
        // Single pixel flicker every few seconds
        this.dormantPixelTimer = setInterval(() => {
            if (state.get('hauntStage') === 0 && state.get('powerOn')) {
                events.emit(EVENTS.CRT_GLITCH, { duration: 50, intensity: 0.02 });
            }
        }, 8000 + Math.random() * 12000);
    }

    startTabTitleCorruption() {
        const originalTitle = document.title;
        let corruptIndex = 0;

        setInterval(() => {
            if (state.get('hauntStage') < 2 || !state.get('powerOn')) {
                document.title = originalTitle;
                return;
            }

            const stage = state.get('hauntStage');
            if (Math.random() < stage * 0.1) {
                const titles = [
                    'SUPER NINTENDO',
                    'SUPER N̷I̶N̸T̵E̶N̸D̷O̵',
                    'S̸U̷P̶E̵R̸ ̵N̴I̵N̴T̷E̸N̴D̵O̸',
                    'HELP',
                    'CAN YOU HEAR ME?',
                    'ALEX',
                    '...',
                    'WATCHING',
                    'DON\'T LEAVE',
                    originalTitle
                ];
                document.title = titles[Math.floor(Math.random() * titles.length)];

                // Revert after a while
                setTimeout(() => {
                    if (state.get('hauntStage') < 4) {
                        document.title = originalTitle;
                    }
                }, 3000 + Math.random() * 5000);
            }
        }, 10000);
    }

    runStageEffects() {
        const stage = this.currentStage;
        if (!state.get('powerOn')) return;

        switch (stage) {
            case 1:
                // Occasional pitch drift
                if (Math.random() < 0.1) {
                    const drift = (Math.random() - 0.5) * 0.03;
                    audioEngine.setCorruption(0.02 + Math.abs(drift));
                }
                break;

            case 2:
                // Ghost button presses
                if (Math.random() < 0.05) {
                    const buttons = ['up', 'down', 'left', 'right', 'a', 'b'];
                    events.emit(EVENTS.GHOST_INPUT, {
                        button: buttons[Math.floor(Math.random() * buttons.length)],
                        duration: 100 + Math.random() * 200
                    });
                }

                // Cross-game cameos
                if (Math.random() < 0.02) {
                    events.emit(EVENTS.CROSS_GAME_BLEED, {
                        text: this.getRandomCrossGameElement(),
                        color: `hsl(${Math.random() * 360}, 70%, 50%)`,
                        duration: 2000
                    });
                }
                break;

            case 3:
                // More aggressive ghost inputs
                if (Math.random() < 0.1) {
                    const buttons = ['up', 'down', 'left', 'right', 'a', 'b', 'x', 'y'];
                    events.emit(EVENTS.GHOST_INPUT, {
                        button: buttons[Math.floor(Math.random() * buttons.length)],
                        duration: 200 + Math.random() * 400
                    });
                }

                // Random corruption spikes
                if (Math.random() < 0.05) {
                    events.emit(EVENTS.CORRUPTION_START, { intensity: 0.2 + Math.random() * 0.3 });
                    setTimeout(() => events.emit(EVENTS.CORRUPTION_END), 1000 + Math.random() * 2000);
                }

                // Heartbeat
                if (Math.random() < 0.03) {
                    events.emit(EVENTS.SFX_PLAY, { name: 'heartbeat' });
                }
                break;

            case 4:
                // Constant corruption
                if (Math.random() < 0.15) {
                    events.emit(EVENTS.CORRUPTION_START, { intensity: 0.4 + Math.random() * 0.4 });
                    setTimeout(() => events.emit(EVENTS.CORRUPTION_END), 500 + Math.random() * 1500);
                }

                // Ghost speaks
                if (Math.random() < 0.03) {
                    events.emit(EVENTS.GHOST_SPEAK, {
                        text: entity.getGhostSpeech()
                    });
                }

                // Memory corruption
                if (Math.random() < 0.01) {
                    persistence.corruptSaveData();
                }
                break;
        }
    }

    getRandomCrossGameElement() {
        const elements = [
            'A plumber runs across the screen...',
            'An arwing crashes in the distance',
            'Water rises from below',
            'A whip cracks in the darkness',
            'Time flows backward',
            'A child watches from the corner',
            'The map reshapes itself',
            'Barrels roll from nowhere'
        ];
        return elements[Math.floor(Math.random() * elements.length)];
    }
}

export const progression = new Progression();
export default progression;
