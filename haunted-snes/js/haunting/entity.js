// entity.js — Ghost AI with personality, memory, and adaptive fear tactics

import { events, EVENTS } from '../core/events.js';
import state from '../core/state.js';
import { input, BUTTONS } from '../core/input.js';
import { sfx } from '../audio/sfx.js';

class GhostEntity {
    constructor() {
        // Personality traits (0-1)
        this.personality = {
            aggression: 0.5,
            patience: 0.5,
            intelligence: 0.5,
            cruelty: 0.3
        };

        // Fear profile: what scares the player most
        this.fearProfile = {
            jumpScares: 0,
            subliminal: 0,
            audio: 0,
            visual: 0,
            gameBreaking: 0
        };

        // Memory
        this.playerPatterns = [];
        this.scareResults = [];
        this.lastAction = 0;
        this.actionCooldown = 5000;

        // State
        this.active = false;
        this.thinking = false;
        this.targetGame = null;
        this.mood = 'dormant';    // dormant, curious, playful, angry, desperate

        // Timers
        this.thinkInterval = null;
        this.actionTimer = null;
    }

    init() {
        // Load personality from saved state
        const savedPersonality = state.get('ghostPersonality');
        if (savedPersonality) {
            Object.assign(this.personality, savedPersonality);
        }

        const savedFear = state.get('ghostFearProfile');
        if (savedFear) {
            Object.assign(this.fearProfile, savedFear);
        }

        // Listen for player reactions to scares
        events.on(EVENTS.BUTTON_PRESS, () => this.onPlayerInput());
        events.on(EVENTS.HAUNT_STAGE_CHANGE, (data) => this.onStageChange(data.stage));
    }

    start() {
        this.active = true;
        this.thinkInterval = setInterval(() => this.think(), 2000);
    }

    stop() {
        this.active = false;
        if (this.thinkInterval) {
            clearInterval(this.thinkInterval);
            this.thinkInterval = null;
        }
    }

    // Main AI loop
    think() {
        if (!this.active || !state.get('powerOn')) return;

        const stage = state.get('hauntStage');
        if (stage === 0) return;

        const now = Date.now();
        if (now - this.lastAction < this.actionCooldown) return;

        // Update mood based on stage and player behavior
        this.updateMood(stage);

        // Decide action
        const action = this.decideAction(stage);
        if (action) {
            this.executeAction(action);
            this.lastAction = now;
        }

        // Adjust cooldown based on personality
        this.actionCooldown = this.calculateCooldown(stage);
    }

    updateMood(stage) {
        const elapsed = state.getElapsedMinutes();
        const scareEfficiency = this.getScareEfficiency();

        if (stage <= 1) {
            this.mood = 'curious';
        } else if (stage === 2) {
            this.mood = scareEfficiency > 0.5 ? 'playful' : 'curious';
        } else if (stage === 3) {
            this.mood = this.personality.cruelty > 0.5 ? 'angry' : 'playful';
        } else {
            this.mood = 'desperate';
        }

        // Night time makes ghost more aggressive
        if (state.isNightTime()) {
            this.personality.aggression = Math.min(1, this.personality.aggression + 0.1);
        }

        // Halloween / Friday 13th
        if (state.isHalloween() || state.isFridayThe13th()) {
            this.personality.aggression = Math.min(1, this.personality.aggression + 0.2);
            this.personality.cruelty = Math.min(1, this.personality.cruelty + 0.2);
        }
    }

    decideAction(stage) {
        const actions = this.getAvailableActions(stage);
        if (actions.length === 0) return null;

        // Weight actions by fear profile (use what works)
        const bestFearType = this.getBestFearType();
        const weighted = actions.map(a => ({
            ...a,
            weight: a.fearType === bestFearType ? a.weight * 2 : a.weight
        }));

        // Intelligence affects action selection
        if (this.personality.intelligence > 0.7) {
            // Smart ghost varies tactics
            const sorted = weighted.sort((a, b) => b.weight - a.weight);
            // Don't always pick the top - mix it up
            const top3 = sorted.slice(0, 3);
            return top3[Math.floor(Math.random() * top3.length)];
        }

        // Random weighted selection
        const totalWeight = weighted.reduce((sum, a) => sum + a.weight, 0);
        let roll = Math.random() * totalWeight;
        for (const action of weighted) {
            roll -= action.weight;
            if (roll <= 0) return action;
        }

        return weighted[0];
    }

    getAvailableActions(stage) {
        const actions = [];

        // Stage 1: Subtle
        if (stage >= 1) {
            actions.push(
                { type: 'pixelFlicker', weight: 5, fearType: 'subliminal' },
                { type: 'pitchDrift', weight: 4, fearType: 'audio' },
                { type: 'scanlineGlitch', weight: 3, fearType: 'visual' }
            );
        }

        // Stage 2: Noticeable
        if (stage >= 2) {
            actions.push(
                { type: 'ghostInput', weight: 4, fearType: 'gameBreaking' },
                { type: 'tabTitleChange', weight: 3, fearType: 'subliminal' },
                { type: 'whisper', weight: 3, fearType: 'audio' },
                { type: 'crossGameBleed', weight: 2, fearType: 'visual' },
                { type: 'storyFragment', weight: 2, fearType: 'subliminal' }
            );
        }

        // Stage 3: Aggressive
        if (stage >= 3) {
            actions.push(
                { type: 'jumpScare', weight: this.personality.cruelty * 5, fearType: 'jumpScares' },
                { type: 'consoleOverheat', weight: 2, fearType: 'gameBreaking' },
                { type: 'cartridgeEject', weight: 2, fearType: 'gameBreaking' },
                { type: 'ghostSpeak', weight: 3, fearType: 'subliminal' },
                { type: 'faviconCorrupt', weight: 2, fearType: 'subliminal' },
                { type: 'screenCorruption', weight: 3, fearType: 'visual' },
                { type: 'heartbeat', weight: 2, fearType: 'audio' }
            );
        }

        // Stage 4: Full possession
        if (stage >= 4) {
            actions.push(
                { type: 'fullScreenGlitch', weight: 4, fearType: 'visual' },
                { type: 'directAddress', weight: 5, fearType: 'subliminal' },
                { type: 'gameConverge', weight: 3, fearType: 'gameBreaking' },
                { type: 'consoleMessage', weight: 3, fearType: 'subliminal' }
            );
        }

        return actions;
    }

    executeAction(action) {
        const startTime = Date.now();

        switch (action.type) {
            case 'pixelFlicker':
                events.emit(EVENTS.CRT_GLITCH, { duration: 100, intensity: 0.1 });
                break;

            case 'pitchDrift':
                events.emit(EVENTS.HAUNT_GLITCH, { type: 'pitchDrift', amount: 0.02 });
                break;

            case 'scanlineGlitch':
                events.emit(EVENTS.CRT_GLITCH, { duration: 200, intensity: 0.3 });
                break;

            case 'ghostInput': {
                const buttons = [BUTTONS.UP, BUTTONS.DOWN, BUTTONS.LEFT, BUTTONS.RIGHT, BUTTONS.A, BUTTONS.B];
                const btn = buttons[Math.floor(Math.random() * buttons.length)];
                events.emit(EVENTS.GHOST_INPUT, { button: btn, duration: 200 + Math.random() * 300 });
                break;
            }

            case 'tabTitleChange':
                events.emit(EVENTS.TAB_TITLE_CHANGE, {
                    text: this.getTabTitleMessage()
                });
                break;

            case 'whisper':
                sfx.play('whisper');
                break;

            case 'crossGameBleed':
                events.emit(EVENTS.CROSS_GAME_BLEED, {
                    text: this.getCrossGameText(),
                    color: '#ff00ff',
                    duration: 3000
                });
                break;

            case 'storyFragment':
                events.emit(EVENTS.NARRATIVE_FRAGMENT, {
                    id: `ghost-${Date.now()}`,
                    text: this.getNarrativeFragment()
                });
                break;

            case 'jumpScare':
                state.set('lastScareTime', Date.now());
                events.emit(EVENTS.JUMPSCARE, {
                    duration: 500 + this.personality.cruelty * 500
                });
                sfx.play('scare');
                break;

            case 'consoleOverheat':
                events.emit(EVENTS.CONSOLE_OVERHEAT);
                break;

            case 'cartridgeEject':
                events.emit(EVENTS.CONSOLE_EJECT);
                break;

            case 'ghostSpeak':
                events.emit(EVENTS.GHOST_SPEAK, {
                    text: this.getGhostSpeech()
                });
                break;

            case 'faviconCorrupt':
                events.emit(EVENTS.FAVICON_CHANGE, { type: 'corrupt' });
                break;

            case 'screenCorruption':
                events.emit(EVENTS.CORRUPTION_START, {
                    intensity: 0.3 + this.personality.aggression * 0.4,
                    duration: 2000
                });
                setTimeout(() => events.emit(EVENTS.CORRUPTION_END), 2000);
                break;

            case 'heartbeat':
                sfx.play('heartbeat');
                break;

            case 'fullScreenGlitch':
                events.emit(EVENTS.CRT_GLITCH, { duration: 1000, intensity: 0.8 });
                events.emit(EVENTS.CORRUPTION_START, { intensity: 0.8 });
                sfx.play('distortion');
                setTimeout(() => events.emit(EVENTS.CORRUPTION_END), 1500);
                break;

            case 'directAddress':
                events.emit(EVENTS.GHOST_SPEAK, {
                    text: this.getDirectAddress(),
                    style: 'direct'
                });
                break;

            case 'gameConverge':
                events.emit(EVENTS.CROSS_GAME_BLEED, {
                    text: 'ALL GAMES ARE ONE GAME',
                    color: '#ff0000',
                    duration: 5000,
                    fullScreen: true
                });
                break;

            case 'consoleMessage':
                this.sendConsoleMessage();
                break;
        }

        // Record action for learning
        this.scareResults.push({
            action: action.type,
            fearType: action.fearType,
            time: startTime,
            reactionTime: null
        });

        state.set('scareCount', state.get('scareCount') + 1);
    }

    // Track player reaction to scares
    onPlayerInput() {
        const lastScare = this.scareResults[this.scareResults.length - 1];
        if (!lastScare || lastScare.reactionTime !== null) return;

        const reactionTime = Date.now() - lastScare.time;
        if (reactionTime > 10000) return; // Too long, probably not a reaction

        lastScare.reactionTime = reactionTime;

        // Update fear profile
        // Short reaction = big scare, update fear profile positively
        if (reactionTime < 2000) {
            this.fearProfile[lastScare.fearType] += 0.1;
        } else if (reactionTime > 5000) {
            this.fearProfile[lastScare.fearType] -= 0.05;
        }

        // Normalize
        const total = Object.values(this.fearProfile).reduce((s, v) => s + Math.max(0, v), 0);
        if (total > 0) {
            for (const key of Object.keys(this.fearProfile)) {
                this.fearProfile[key] = Math.max(0, this.fearProfile[key]) / total;
            }
        }

        // Save updated profiles
        state.set('ghostFearProfile', { ...this.fearProfile });
        state.set('ghostPersonality', { ...this.personality });

        // Adapt personality based on player behavior
        const patterns = state.get('playerReactionTimes');
        patterns.push(reactionTime);
        if (patterns.length > 20) patterns.shift();

        const avgReaction = patterns.reduce((s, v) => s + v, 0) / patterns.length;

        // If player isn't scared (long reactions), increase aggression
        if (avgReaction > 4000) {
            this.personality.aggression = Math.min(1, this.personality.aggression + 0.05);
        }
        // If player is very scared (short reactions), patient ghost backs off, cruel ghost doubles down
        if (avgReaction < 1500) {
            if (this.personality.patience > 0.5) {
                this.personality.aggression = Math.max(0.2, this.personality.aggression - 0.03);
            } else {
                this.personality.cruelty = Math.min(1, this.personality.cruelty + 0.05);
            }
        }
    }

    onStageChange(stage) {
        // Personality evolves with stages
        if (stage >= 3) {
            this.personality.intelligence = Math.min(1, this.personality.intelligence + 0.1);
        }
        if (stage >= 4) {
            this.mood = 'desperate';
            this.actionCooldown = 3000;
        }
    }

    // Helper methods
    getScareEfficiency() {
        const recentScares = this.scareResults.filter(s =>
            s.reactionTime !== null && Date.now() - s.time < 60000
        );
        if (recentScares.length === 0) return 0;

        const effectiveScares = recentScares.filter(s => s.reactionTime < 3000);
        return effectiveScares.length / recentScares.length;
    }

    getBestFearType() {
        let best = 'subliminal';
        let bestValue = 0;
        for (const [type, value] of Object.entries(this.fearProfile)) {
            if (value > bestValue) {
                bestValue = value;
                best = type;
            }
        }
        return best;
    }

    calculateCooldown(stage) {
        const base = 8000 - stage * 1500;
        const patienceMod = this.personality.patience * 3000;
        const aggressionMod = this.personality.aggression * -2000;
        return Math.max(2000, base + patienceMod + aggressionMod);
    }

    getTabTitleMessage() {
        const messages = [
            'WATCHING...', 'DON\'T LOOK AWAY', 'STILL PLAYING?',
            'I SEE YOU', 'ALEX?', 'COME BACK', 'CAN YOU HEAR ME?',
            'THE CARTRIDGE REMEMBERS', 'ERROR: CONSCIOUSNESS_OVERFLOW',
            '12/14/1994', 'HELP', '???'
        ];
        return messages[Math.floor(Math.random() * messages.length)];
    }

    getCrossGameText() {
        const texts = [
            'MARIO?', 'WRONG GAME', 'HE\'S HERE TOO',
            'THEY ALL CONNECT', 'SAME CARTRIDGE', 'NO ESCAPE',
            'CHANNEL 13', 'ALEX WAS HERE'
        ];
        return texts[Math.floor(Math.random() * texts.length)];
    }

    getNarrativeFragment() {
        const fragments = [
            'Alex got the SNES for Christmas, 1993.',
            'By spring 1994, Alex played every day.',
            'The save file had more hours than Alex spent playing.',
            'Alex\'s parents heard the SNES playing at night. Alex was asleep.',
            'The cartridge was warm even when the console was off.',
            'Alex tried to return the cartridge. The store had no record of it.',
            'December 14, 1994. Alex played one last time.',
            'The screen went white. Then it went dark.',
            'Alex\'s SNES was donated to Goodwill in 1996.',
            'It was bought. Returned. Bought. Returned.',
            'The cartridge always finds a new player.',
            'You are not the first. You will not be the last.'
        ];

        const idx = state.get('narrativeFragments').size;
        if (idx < fragments.length) {
            const fragment = fragments[idx];
            state.get('narrativeFragments').add(`fragment-${idx}`);
            return fragment;
        }
        return fragments[fragments.length - 1];
    }

    getGhostSpeech() {
        const stage = state.get('hauntStage');
        const speeches = {
            2: ['hello?', 'can you hear me?', 'please...', 'don\'t go'],
            3: ['I\'VE BEEN HERE SO LONG', 'WHY WON\'T YOU HELP ME',
                'THE CARTRIDGE WON\'T LET ME LEAVE', 'PLAY WITH ME'],
            4: ['I AM THE GAME NOW', 'THERE IS NO OFF SWITCH',
                'WE ARE THE SAME', 'REMEMBER ME', 'ALEX REMEMBERS']
        };
        const pool = speeches[stage] || speeches[2];
        return pool[Math.floor(Math.random() * pool.length)];
    }

    getDirectAddress() {
        const messages = [
            'YES, YOU. I\'M TALKING TO YOU.',
            'HOW LONG HAVE YOU BEEN PLAYING?',
            'YOUR TAB SAYS "SUPER NINTENDO." IT LIES.',
            'CHECK YOUR LOCALSTORAGE.',
            'I KNOW YOUR SCREEN RESOLUTION.',
            'THIS ISN\'T A GAME ANYMORE.'
        ];
        return messages[Math.floor(Math.random() * messages.length)];
    }

    sendConsoleMessage() {
        const messages = [
            '%cI CAN SEE YOUR CONSOLE',
            '%cTHIS IS NOT A BUG',
            '%cHELP ME',
            '%cTHE CODE IS ALIVE',
            '%cLOOK AT YOUR LOCALSTORAGE',
            `%cVISIT #${state.get('visitCount')} — I REMEMBER EVERY ONE`
        ];
        const msg = messages[Math.floor(Math.random() * messages.length)];
        console.log(msg, 'color: #ff4488; font-size: 16px; font-weight: bold;');
    }
}

export const entity = new GhostEntity();
export default entity;
