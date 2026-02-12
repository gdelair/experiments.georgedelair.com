// state.js — Central state management

import { events, EVENTS } from './events.js';

const INITIAL_STATE = {
    // System
    powerOn: false,
    booting: false,
    bootComplete: false,
    startTime: 0,
    frameCount: 0,

    // Games
    currentChannel: 0,
    totalChannels: 13,
    currentGame: null,
    gameHistory: [],

    // Input
    activeButtons: new Set(),
    lastInputTime: 0,
    inputPauseDuration: 0,
    konamiProgress: 0,
    secretCodeProgress: 0,

    // Audio
    audioInitialized: false,
    masterVolume: 0.7,
    musicVolume: 0.6,
    sfxVolume: 0.8,
    muted: false,

    // Haunting
    hauntStage: 0,         // 0=Dormant, 1=Stirring, 2=Active, 3=Aggressive, 4=Consumed
    hauntStartTime: 0,
    ghostPersonality: {
        aggression: 0.5,
        patience: 0.5,
        intelligence: 0.5,
        cruelty: 0.3
    },
    ghostFearProfile: {
        jumpScares: 0,
        subliminal: 0,
        audio: 0,
        visual: 0,
        gameBreaking: 0
    },
    narrativeFragments: new Set(),
    totalFragments: 12,
    scareCount: 0,
    lastScareTime: 0,
    playerReactionTimes: [],

    // UI
    cartridgeInserted: true,
    consoleOverheating: false,
    overheatLevel: 0,
    ledColor: 'off',       // 'off', 'green', 'red', 'flicker'
    tvBrightness: 1.0,
    tvVolume: 0.7,
    crtEnabled: true,

    // Effects
    corruptionLevel: 0,    // 0.0 - 1.0
    mode7Active: false,
    vhsActive: false,
    glitchIntensity: 0,

    // Persistence
    visitCount: 0,
    totalPlayTime: 0,
    lastVisit: null,
    secretGameUnlocked: false,
    debugMode: false,

    // Cross-game
    crossGameBleeds: [],
    sharedEntities: []
};

class StateManager {
    constructor() {
        this.state = {};
        this.watchers = new Map();
        this.snapshots = [];
        this.maxSnapshots = 10;
        this.reset();
    }

    reset() {
        this.state = JSON.parse(JSON.stringify(INITIAL_STATE, (key, value) => {
            if (value instanceof Set) return { __set: [...value] };
            return value;
        }));
        this.state.activeButtons = new Set();
        this.state.narrativeFragments = new Set();
    }

    get(key) {
        return this.state[key];
    }

    set(key, value) {
        const old = this.state[key];
        this.state[key] = value;

        // Notify watchers
        const watcherList = this.watchers.get(key);
        if (watcherList) {
            for (const cb of watcherList) {
                try {
                    cb(value, old, key);
                } catch (e) {
                    console.error(`[State] Watcher error for "${key}":`, e);
                }
            }
        }

        return value;
    }

    update(updates) {
        for (const [key, value] of Object.entries(updates)) {
            this.set(key, value);
        }
    }

    watch(key, callback) {
        if (!this.watchers.has(key)) {
            this.watchers.set(key, []);
        }
        this.watchers.get(key).push(callback);

        return () => {
            const list = this.watchers.get(key);
            const idx = list.indexOf(callback);
            if (idx !== -1) list.splice(idx, 1);
        };
    }

    snapshot() {
        const snap = {};
        for (const [key, value] of Object.entries(this.state)) {
            if (value instanceof Set) {
                snap[key] = new Set(value);
            } else if (typeof value === 'object' && value !== null) {
                snap[key] = JSON.parse(JSON.stringify(value));
            } else {
                snap[key] = value;
            }
        }
        this.snapshots.push(snap);
        if (this.snapshots.length > this.maxSnapshots) {
            this.snapshots.shift();
        }
        return this.snapshots.length - 1;
    }

    restore(index) {
        if (index >= 0 && index < this.snapshots.length) {
            const snap = this.snapshots[index];
            for (const [key, value] of Object.entries(snap)) {
                this.state[key] = value;
            }
        }
    }

    // Computed properties
    getElapsedMinutes() {
        if (!this.state.startTime) return 0;
        return (Date.now() - this.state.startTime) / 60000;
    }

    getExpectedHauntStage() {
        const mins = this.getElapsedMinutes();
        if (mins >= 11) return 4;  // Consumed
        if (mins >= 6) return 3;   // Aggressive
        if (mins >= 3) return 2;   // Active
        if (mins >= 1) return 1;   // Stirring
        return 0;                  // Dormant
    }

    getHauntStageName(stage = null) {
        const names = ['DORMANT', 'STIRRING', 'ACTIVE', 'AGGRESSIVE', 'CONSUMED'];
        return names[stage ?? this.state.hauntStage] || 'UNKNOWN';
    }

    isNightTime() {
        const hour = new Date().getHours();
        return hour >= 22 || hour < 6;
    }

    isHalloween() {
        const now = new Date();
        return now.getMonth() === 9 && now.getDate() === 31;
    }

    isFridayThe13th() {
        const now = new Date();
        return now.getDay() === 5 && now.getDate() === 13;
    }

    getNarrativeCompletion() {
        return this.state.narrativeFragments.size / this.state.totalFragments;
    }

    canUnlockSecretGame() {
        return this.state.hauntStage >= 4 &&
               this.state.narrativeFragments.size >= 5;
    }

    // Serialization for localStorage
    serialize() {
        const data = { ...this.state };
        data.activeButtons = [...this.state.activeButtons];
        data.narrativeFragments = [...this.state.narrativeFragments];
        return JSON.stringify(data);
    }

    deserialize(json) {
        try {
            const data = JSON.parse(json);
            data.activeButtons = new Set(data.activeButtons || []);
            data.narrativeFragments = new Set(data.narrativeFragments || []);
            // Only restore persistent data
            this.state.visitCount = data.visitCount || 0;
            this.state.totalPlayTime = data.totalPlayTime || 0;
            this.state.lastVisit = data.lastVisit || null;
            this.state.narrativeFragments = data.narrativeFragments;
            this.state.secretGameUnlocked = data.secretGameUnlocked || false;
            this.state.ghostFearProfile = data.ghostFearProfile || this.state.ghostFearProfile;
            this.state.ghostPersonality = data.ghostPersonality || this.state.ghostPersonality;
        } catch (e) {
            console.warn('[State] Failed to deserialize:', e);
        }
    }
}

export const state = new StateManager();
export default state;
