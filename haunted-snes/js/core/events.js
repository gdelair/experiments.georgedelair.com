// events.js — Pub/sub event bus for inter-module communication

class EventBus {
    constructor() {
        this.listeners = new Map();
        this.onceListeners = new Map();
        this.history = [];
        this.maxHistory = 100;
        this.debugMode = false;
    }

    on(event, callback, priority = 0) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        const entry = { callback, priority };
        const list = this.listeners.get(event);
        list.push(entry);
        list.sort((a, b) => b.priority - a.priority);

        return () => this.off(event, callback);
    }

    once(event, callback, priority = 0) {
        if (!this.onceListeners.has(event)) {
            this.onceListeners.set(event, []);
        }
        this.onceListeners.get(event).push({ callback, priority });
        return () => {
            const list = this.onceListeners.get(event);
            if (list) {
                const idx = list.findIndex(e => e.callback === callback);
                if (idx !== -1) list.splice(idx, 1);
            }
        };
    }

    off(event, callback) {
        const list = this.listeners.get(event);
        if (list) {
            const idx = list.findIndex(e => e.callback === callback);
            if (idx !== -1) list.splice(idx, 1);
        }
    }

    emit(event, data = {}) {
        if (this.debugMode) {
            console.log(`[EventBus] ${event}`, data);
        }

        this.history.push({ event, data, time: performance.now() });
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }

        const listeners = this.listeners.get(event);
        if (listeners) {
            for (const { callback } of listeners) {
                try {
                    callback(data);
                } catch (e) {
                    console.error(`[EventBus] Error in listener for "${event}":`, e);
                }
            }
        }

        const onceList = this.onceListeners.get(event);
        if (onceList) {
            this.onceListeners.delete(event);
            for (const { callback } of onceList) {
                try {
                    callback(data);
                } catch (e) {
                    console.error(`[EventBus] Error in once listener for "${event}":`, e);
                }
            }
        }
    }

    clear(event) {
        if (event) {
            this.listeners.delete(event);
            this.onceListeners.delete(event);
        } else {
            this.listeners.clear();
            this.onceListeners.clear();
        }
    }

    getHistory(event) {
        if (event) {
            return this.history.filter(h => h.event === event);
        }
        return [...this.history];
    }

    listEvents() {
        const events = new Set([
            ...this.listeners.keys(),
            ...this.onceListeners.keys()
        ]);
        return [...events];
    }
}

// Events catalog
export const EVENTS = {
    // System
    BOOT_START: 'boot:start',
    BOOT_COMPLETE: 'boot:complete',
    POWER_ON: 'power:on',
    POWER_OFF: 'power:off',

    // Input
    INPUT_DOWN: 'input:down',
    INPUT_UP: 'input:up',
    BUTTON_PRESS: 'button:press',
    BUTTON_RELEASE: 'button:release',

    // Games
    GAME_LOAD: 'game:load',
    GAME_START: 'game:start',
    GAME_STOP: 'game:stop',
    GAME_PAUSE: 'game:pause',
    GAME_RESUME: 'game:resume',
    CHANNEL_CHANGE: 'channel:change',

    // Audio
    AUDIO_INIT: 'audio:init',
    AUDIO_PLAY: 'audio:play',
    AUDIO_STOP: 'audio:stop',
    MUSIC_START: 'music:start',
    MUSIC_STOP: 'music:stop',
    SFX_PLAY: 'sfx:play',

    // Haunting
    HAUNT_STAGE_CHANGE: 'haunt:stage',
    HAUNT_SCARE: 'haunt:scare',
    HAUNT_GLITCH: 'haunt:glitch',
    GHOST_INPUT: 'ghost:input',
    GHOST_SPEAK: 'ghost:speak',
    NARRATIVE_FRAGMENT: 'narrative:fragment',
    CROSS_GAME_BLEED: 'crossgame:bleed',
    JUMPSCARE: 'jumpscare',

    // UI
    CONSOLE_EJECT: 'console:eject',
    CONSOLE_OVERHEAT: 'console:overheat',
    CARTRIDGE_INSERT: 'cartridge:insert',
    LED_CHANGE: 'led:change',
    TAB_TITLE_CHANGE: 'tab:title',
    FAVICON_CHANGE: 'tab:favicon',

    // Effects
    CORRUPTION_START: 'corruption:start',
    CORRUPTION_END: 'corruption:end',
    CRT_GLITCH: 'crt:glitch',
    MODE7_ACTIVATE: 'mode7:activate',
    VHS_ARTIFACT: 'vhs:artifact',

    // Debug
    DEBUG_TOGGLE: 'debug:toggle',
    DEBUG_LOG: 'debug:log',

    // Persistence
    SAVE_STATE: 'save:state',
    LOAD_STATE: 'load:state',
    MEMORY_CORRUPT: 'memory:corrupt',

    // Render
    RENDER_FRAME: 'render:frame',
    RENDER_PRE: 'render:pre',
    RENDER_POST: 'render:post'
};

export const events = new EventBus();
export default events;
