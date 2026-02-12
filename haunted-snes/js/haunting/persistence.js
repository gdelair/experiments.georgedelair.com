// persistence.js — localStorage + "memory corruption"

import state from '../core/state.js';
import { events, EVENTS } from '../core/events.js';

const STORAGE_KEY = 'haunted-snes-save';
const CORRUPTION_KEY = 'haunted-snes-corruption';

class Persistence {
    constructor() {
        this.autoSaveInterval = null;
        this.corruptionEntries = [];
    }

    load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                state.deserialize(raw);
            }

            // Update last visit
            state.set('lastVisit', Date.now());

            // Load corruption entries
            const corruptRaw = localStorage.getItem(CORRUPTION_KEY);
            if (corruptRaw) {
                this.corruptionEntries = JSON.parse(corruptRaw);
            }
        } catch (e) {
            console.warn('[Persistence] Load failed:', e);
        }
    }

    save() {
        try {
            localStorage.setItem(STORAGE_KEY, state.serialize());

            // Save corruption entries
            if (this.corruptionEntries.length > 0) {
                localStorage.setItem(CORRUPTION_KEY, JSON.stringify(this.corruptionEntries));
            }
        } catch (e) {
            console.warn('[Persistence] Save failed:', e);
        }
    }

    startAutoSave(intervalMs = 30000) {
        this.stopAutoSave();
        this.autoSaveInterval = setInterval(() => this.save(), intervalMs);
    }

    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    // Haunting: add fake corrupted localStorage entries
    addCorruptEntry(key, value) {
        const entry = { key, value, time: Date.now() };
        this.corruptionEntries.push(entry);

        try {
            localStorage.setItem(key, value);
        } catch (e) { /* silent */ }
    }

    // Generate haunted localStorage entries based on stage
    generateCorruption(stage) {
        const entries = {
            1: [
                { key: 'snes_last_error', value: 'null reference at 0x00000000' },
            ],
            2: [
                { key: 'snes_player_data', value: '{"name":"???","playtime":"∞"}' },
                { key: 'snes_crash_log', value: 'SEGFAULT: consciousness_overflow' },
                { key: 'alex_save_1994', value: 'STILL HERE' },
            ],
            3: [
                { key: 'snes_memory_leak', value: 'GROWING GROWING GROWING' },
                { key: 'help_me', value: 'help me help me help me help me' },
                { key: 'snes_entity_log', value: '{"aware":true,"watching":true}' },
                { key: 'DO_NOT_READ', value: btoa('I CAN SEE YOU') },
            ],
            4: [
                { key: 'snes_final_save', value: 'THERE IS NO SAVE. THERE IS NO GAME. THERE IS ONLY THE CARTRIDGE.' },
                { key: 'ALEX', value: 'I remember everything. December 14, 1994. I never left.' },
                { key: 'snes_rom_header', value: 'TITLE: YOUR_NAME CHECKSUM: DEAD COMPLEMENT: BEEF' },
                { key: `player_${Date.now()}`, value: 'You\'ve been here before.' },
            ]
        };

        const stageEntries = entries[stage];
        if (!stageEntries) return;

        for (const entry of stageEntries) {
            if (!this.corruptionEntries.find(e => e.key === entry.key)) {
                this.addCorruptEntry(entry.key, entry.value);
            }
        }
    }

    // Memory corruption effect: scramble parts of save data
    corruptSaveData() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;

            const data = JSON.parse(raw);

            // Corrupt random fields
            const fields = Object.keys(data);
            const numCorrupt = Math.floor(Math.random() * 3) + 1;

            for (let i = 0; i < numCorrupt; i++) {
                const field = fields[Math.floor(Math.random() * fields.length)];
                if (typeof data[field] === 'number') {
                    data[field] = data[field] ^ (Math.floor(Math.random() * 256));
                } else if (typeof data[field] === 'string') {
                    const chars = data[field].split('');
                    const idx = Math.floor(Math.random() * chars.length);
                    chars[idx] = String.fromCharCode(Math.floor(Math.random() * 26) + 65);
                    data[field] = chars.join('');
                }
            }

            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) { /* silent */ }

        events.emit(EVENTS.MEMORY_CORRUPT);
    }

    // Clean up all corruption entries
    cleanCorruption() {
        for (const entry of this.corruptionEntries) {
            try {
                localStorage.removeItem(entry.key);
            } catch (e) { /* silent */ }
        }
        this.corruptionEntries = [];
        localStorage.removeItem(CORRUPTION_KEY);
    }

    // Full reset
    reset() {
        this.cleanCorruption();
        localStorage.removeItem(STORAGE_KEY);
        state.reset();
    }
}

export const persistence = new Persistence();
export default persistence;
