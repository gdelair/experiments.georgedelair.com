// music-tracks.js — Per-game themes + corruption variants

import { audioEngine } from './audio-engine.js';
import { instruments } from './instruments.js';
import state from '../core/state.js';
import { events, EVENTS } from '../core/events.js';

class MusicTracks {
    constructor() {
        this.currentTrack = null;
        this.playing = false;
        this.bpm = 120;
        this.beat = 0;
        this.stepTimer = 0;
        this.stepInterval = 0;
        this.sequence = [];
        this.looping = true;
        this.corruptionLevel = 0;

        this.tracks = {};
    }

    init() {
        instruments.init();
        this.defineTracks();

        events.on(EVENTS.GAME_START, (data) => {
            this.playTrack(data.game);
        });

        events.on(EVENTS.GAME_STOP, () => {
            this.stop();
        });

        events.on(EVENTS.POWER_OFF, () => {
            this.stop();
        });

        events.on(EVENTS.HAUNT_STAGE_CHANGE, (data) => {
            this.corruptionLevel = data.stage * 0.2;
        });
    }

    defineTracks() {
        // Each track is defined as BPM + sequence of note events
        // Notes: [channel, preset, note, octave, duration (beats), volume]

        this.tracks['mario-world'] = {
            bpm: 140,
            key: 'C',
            mode: 'major',
            loop: true,
            sequence: this.generateMarioTheme()
        };

        this.tracks['fzero'] = {
            bpm: 160,
            key: 'E',
            mode: 'minor',
            loop: true,
            sequence: this.generateFZeroTheme()
        };

        this.tracks['street-fighter'] = {
            bpm: 130,
            key: 'A',
            mode: 'minor',
            loop: true,
            sequence: this.generateFighterTheme()
        };

        this.tracks['chrono-trigger'] = {
            bpm: 100,
            key: 'D',
            mode: 'minor',
            loop: true,
            sequence: this.generateChronoTheme()
        };

        this.tracks['super-metroid'] = {
            bpm: 80,
            key: 'E',
            mode: 'phrygian',
            loop: true,
            sequence: this.generateMetroidTheme()
        };

        this.tracks['dkc'] = {
            bpm: 120,
            key: 'G',
            mode: 'minor',
            loop: true,
            sequence: this.generateDKCTheme()
        };

        this.tracks['zelda-lttp'] = {
            bpm: 110,
            key: 'B',
            mode: 'minor',
            loop: true,
            sequence: this.generateZeldaTheme()
        };

        this.tracks['star-fox'] = {
            bpm: 150,
            key: 'F',
            mode: 'minor',
            loop: true,
            sequence: this.generateStarFoxTheme()
        };

        this.tracks['earthbound'] = {
            bpm: 105,
            key: 'C',
            mode: 'major',
            loop: true,
            sequence: this.generateEarthboundTheme()
        };

        this.tracks['castlevania'] = {
            bpm: 135,
            key: 'D',
            mode: 'phrygian',
            loop: true,
            sequence: this.generateCastlevaniaTheme()
        };

        this.tracks['lost-signal'] = {
            bpm: 60,
            key: 'A',
            mode: 'minor',
            loop: true,
            sequence: this.generateSignalTheme()
        };

        this.tracks['the-cartridge'] = {
            bpm: 70,
            key: 'C',
            mode: 'chromatic',
            loop: true,
            sequence: this.generateCartridgeTheme()
        };
    }

    // Theme generators - each creates a looping sequence

    generateMarioTheme() {
        // Cheerful platformer melody
        const melody = [
            { beat: 0, ch: 0, preset: 'squareLead', note: 'C', oct: 5, dur: 0.5 },
            { beat: 0.5, ch: 0, preset: 'squareLead', note: 'E', oct: 5, dur: 0.5 },
            { beat: 1, ch: 0, preset: 'squareLead', note: 'G', oct: 5, dur: 0.5 },
            { beat: 1.5, ch: 0, preset: 'squareLead', note: 'C', oct: 6, dur: 1 },
            { beat: 3, ch: 0, preset: 'squareLead', note: 'G', oct: 5, dur: 0.5 },
            { beat: 3.5, ch: 0, preset: 'squareLead', note: 'E', oct: 5, dur: 0.5 },
            { beat: 4, ch: 0, preset: 'squareLead', note: 'C', oct: 5, dur: 1 },
            { beat: 5, ch: 0, preset: 'squareLead', note: 'D', oct: 5, dur: 0.5 },
            { beat: 5.5, ch: 0, preset: 'squareLead', note: 'E', oct: 5, dur: 0.5 },
            { beat: 6, ch: 0, preset: 'squareLead', note: 'F', oct: 5, dur: 0.5 },
            { beat: 6.5, ch: 0, preset: 'squareLead', note: 'G', oct: 5, dur: 1.5 },
        ];

        // Bass line
        const bass = [
            { beat: 0, ch: 1, preset: 'synthBass', note: 'C', oct: 3, dur: 1 },
            { beat: 2, ch: 1, preset: 'synthBass', note: 'G', oct: 2, dur: 1 },
            { beat: 4, ch: 1, preset: 'synthBass', note: 'A', oct: 2, dur: 1 },
            { beat: 6, ch: 1, preset: 'synthBass', note: 'G', oct: 2, dur: 2 },
        ];

        // Drums
        const drums = [];
        for (let i = 0; i < 8; i++) {
            drums.push({ beat: i, ch: 7, drum: 'kick', vol: 0.4 });
            if (i % 2 === 1) drums.push({ beat: i, ch: 7, drum: 'snare', vol: 0.3 });
            drums.push({ beat: i + 0.5, ch: 7, drum: 'hihat', vol: 0.2 });
        }

        return { melody, bass, drums, length: 8 };
    }

    generateFZeroTheme() {
        // Fast, driving rock
        const melody = [
            { beat: 0, ch: 0, preset: 'sawLead', note: 'E', oct: 5, dur: 0.25 },
            { beat: 0.25, ch: 0, preset: 'sawLead', note: 'E', oct: 5, dur: 0.25 },
            { beat: 0.5, ch: 0, preset: 'sawLead', note: 'G', oct: 5, dur: 0.5 },
            { beat: 1, ch: 0, preset: 'sawLead', note: 'A', oct: 5, dur: 0.5 },
            { beat: 1.5, ch: 0, preset: 'sawLead', note: 'B', oct: 5, dur: 1 },
            { beat: 3, ch: 0, preset: 'sawLead', note: 'A', oct: 5, dur: 0.5 },
            { beat: 3.5, ch: 0, preset: 'sawLead', note: 'G', oct: 5, dur: 0.5 },
            { beat: 4, ch: 0, preset: 'sawLead', note: 'E', oct: 5, dur: 1 },
            { beat: 5, ch: 0, preset: 'sawLead', note: 'D', oct: 5, dur: 0.5 },
            { beat: 5.5, ch: 0, preset: 'sawLead', note: 'E', oct: 5, dur: 0.5 },
            { beat: 6, ch: 0, preset: 'sawLead', note: 'G', oct: 5, dur: 2 },
        ];

        const bass = [
            { beat: 0, ch: 1, preset: 'aggressiveBass', note: 'E', oct: 2, dur: 0.5 },
            { beat: 0.5, ch: 1, preset: 'aggressiveBass', note: 'E', oct: 2, dur: 0.5 },
            { beat: 1, ch: 1, preset: 'aggressiveBass', note: 'E', oct: 2, dur: 1 },
            { beat: 2, ch: 1, preset: 'aggressiveBass', note: 'D', oct: 2, dur: 1 },
            { beat: 3, ch: 1, preset: 'aggressiveBass', note: 'C', oct: 2, dur: 1 },
            { beat: 4, ch: 1, preset: 'aggressiveBass', note: 'A', oct: 1, dur: 2 },
            { beat: 6, ch: 1, preset: 'aggressiveBass', note: 'B', oct: 1, dur: 2 },
        ];

        const drums = [];
        for (let i = 0; i < 8; i += 0.5) {
            drums.push({ beat: i, ch: 7, drum: 'hihat', vol: 0.15 });
            if (i % 1 === 0) drums.push({ beat: i, ch: 7, drum: 'kick', vol: 0.4 });
            if (i % 2 === 1) drums.push({ beat: i, ch: 7, drum: 'snare', vol: 0.35 });
        }

        return { melody, bass, drums, length: 8 };
    }

    generateFighterTheme() {
        const melody = [
            { beat: 0, ch: 0, preset: 'squareLead', note: 'A', oct: 4, dur: 0.25 },
            { beat: 0.25, ch: 0, preset: 'squareLead', note: 'C', oct: 5, dur: 0.25 },
            { beat: 0.5, ch: 0, preset: 'squareLead', note: 'E', oct: 5, dur: 0.5 },
            { beat: 1, ch: 0, preset: 'squareLead', note: 'A', oct: 5, dur: 1 },
            { beat: 2, ch: 0, preset: 'squareLead', note: 'G', oct: 5, dur: 0.5 },
            { beat: 2.5, ch: 0, preset: 'squareLead', note: 'E', oct: 5, dur: 0.5 },
            { beat: 3, ch: 0, preset: 'squareLead', note: 'C', oct: 5, dur: 1 },
        ];

        const bass = [
            { beat: 0, ch: 1, preset: 'aggressiveBass', note: 'A', oct: 2, dur: 1 },
            { beat: 1, ch: 1, preset: 'aggressiveBass', note: 'E', oct: 2, dur: 1 },
            { beat: 2, ch: 1, preset: 'aggressiveBass', note: 'F', oct: 2, dur: 1 },
            { beat: 3, ch: 1, preset: 'aggressiveBass', note: 'E', oct: 2, dur: 1 },
        ];

        const drums = [];
        for (let i = 0; i < 4; i++) {
            drums.push({ beat: i, ch: 7, drum: 'kick', vol: 0.5 });
            drums.push({ beat: i + 0.5, ch: 7, drum: 'hihat', vol: 0.2 });
            if (i % 2 === 1) drums.push({ beat: i, ch: 7, drum: 'snare', vol: 0.4 });
        }

        return { melody, bass, drums, length: 4 };
    }

    generateChronoTheme() {
        // Melancholic, flowing
        const melody = [
            { beat: 0, ch: 0, preset: 'flute', note: 'D', oct: 5, dur: 1 },
            { beat: 1, ch: 0, preset: 'flute', note: 'F', oct: 5, dur: 1 },
            { beat: 2, ch: 0, preset: 'flute', note: 'A', oct: 5, dur: 2 },
            { beat: 4, ch: 0, preset: 'flute', note: 'G', oct: 5, dur: 1 },
            { beat: 5, ch: 0, preset: 'flute', note: 'F', oct: 5, dur: 1 },
            { beat: 6, ch: 0, preset: 'flute', note: 'D', oct: 5, dur: 2 },
        ];

        const pad = [
            { beat: 0, ch: 2, preset: 'stringPad', note: 'D', oct: 3, dur: 4 },
            { beat: 4, ch: 2, preset: 'stringPad', note: 'B', oct: 2, dur: 4 },
        ];

        const bass = [
            { beat: 0, ch: 1, preset: 'deepBass', note: 'D', oct: 2, dur: 2 },
            { beat: 2, ch: 1, preset: 'deepBass', note: 'A', oct: 1, dur: 2 },
            { beat: 4, ch: 1, preset: 'deepBass', note: 'G', oct: 1, dur: 2 },
            { beat: 6, ch: 1, preset: 'deepBass', note: 'A', oct: 1, dur: 2 },
        ];

        const drums = [];
        for (let i = 0; i < 8; i += 2) {
            drums.push({ beat: i, ch: 7, drum: 'kick', vol: 0.25 });
            drums.push({ beat: i + 1, ch: 7, drum: 'hihat', vol: 0.1 });
        }

        return { melody, bass, drums, pad, length: 8 };
    }

    generateMetroidTheme() {
        // Dark, atmospheric
        const melody = [
            { beat: 0, ch: 0, preset: 'flute', note: 'E', oct: 4, dur: 2 },
            { beat: 2, ch: 0, preset: 'flute', note: 'F', oct: 4, dur: 2 },
            { beat: 4, ch: 0, preset: 'flute', note: 'E', oct: 4, dur: 1 },
            { beat: 5, ch: 0, preset: 'flute', note: 'D', oct: 4, dur: 1 },
            { beat: 6, ch: 0, preset: 'flute', note: 'C', oct: 4, dur: 2 },
        ];

        const pad = [
            { beat: 0, ch: 2, preset: 'darkPad', note: 'E', oct: 2, dur: 8 },
        ];

        const bass = [
            { beat: 0, ch: 1, preset: 'deepBass', note: 'E', oct: 1, dur: 4 },
            { beat: 4, ch: 1, preset: 'deepBass', note: 'C', oct: 1, dur: 4 },
        ];

        return { melody, bass, drums: [], pad, length: 8 };
    }

    generateDKCTheme() {
        // Funky, ambient-ish
        const melody = [
            { beat: 0, ch: 0, preset: 'squareLead', note: 'G', oct: 4, dur: 0.5 },
            { beat: 0.5, ch: 0, preset: 'squareLead', note: 'B', oct: 4, dur: 0.5 },
            { beat: 1, ch: 0, preset: 'squareLead', note: 'D', oct: 5, dur: 1 },
            { beat: 2, ch: 0, preset: 'squareLead', note: 'C', oct: 5, dur: 0.5 },
            { beat: 2.5, ch: 0, preset: 'squareLead', note: 'B', oct: 4, dur: 0.5 },
            { beat: 3, ch: 0, preset: 'squareLead', note: 'G', oct: 4, dur: 1 },
        ];

        const bass = [
            { beat: 0, ch: 1, preset: 'synthBass', note: 'G', oct: 2, dur: 1 },
            { beat: 1, ch: 1, preset: 'synthBass', note: 'G', oct: 2, dur: 0.5 },
            { beat: 1.5, ch: 1, preset: 'synthBass', note: 'B', oct: 2, dur: 0.5 },
            { beat: 2, ch: 1, preset: 'synthBass', note: 'D', oct: 3, dur: 1 },
            { beat: 3, ch: 1, preset: 'synthBass', note: 'C', oct: 3, dur: 1 },
        ];

        const drums = [];
        for (let i = 0; i < 4; i++) {
            drums.push({ beat: i, ch: 7, drum: 'kick', vol: 0.35 });
            if (i % 2 === 1) drums.push({ beat: i, ch: 7, drum: 'snare', vol: 0.3 });
            drums.push({ beat: i + 0.25, ch: 7, drum: 'hihat', vol: 0.15 });
            drums.push({ beat: i + 0.75, ch: 7, drum: 'hihat', vol: 0.1 });
        }

        return { melody, bass, drums, length: 4 };
    }

    generateZeldaTheme() {
        // Adventurous, heroic
        const melody = [
            { beat: 0, ch: 0, preset: 'flute', note: 'B', oct: 4, dur: 1.5 },
            { beat: 1.5, ch: 0, preset: 'flute', note: 'F#', oct: 5, dur: 0.5 },
            { beat: 2, ch: 0, preset: 'flute', note: 'F#', oct: 5, dur: 0.5 },
            { beat: 2.5, ch: 0, preset: 'flute', note: 'F#', oct: 5, dur: 0.5 },
            { beat: 3, ch: 0, preset: 'flute', note: 'G', oct: 5, dur: 0.5 },
            { beat: 3.5, ch: 0, preset: 'flute', note: 'A', oct: 5, dur: 1 },
            { beat: 5, ch: 0, preset: 'flute', note: 'B', oct: 5, dur: 2 },
        ];

        const pad = [
            { beat: 0, ch: 2, preset: 'stringPad', note: 'B', oct: 3, dur: 4 },
            { beat: 4, ch: 2, preset: 'stringPad', note: 'G', oct: 3, dur: 4 },
        ];

        const bass = [
            { beat: 0, ch: 1, preset: 'deepBass', note: 'B', oct: 2, dur: 2 },
            { beat: 2, ch: 1, preset: 'deepBass', note: 'E', oct: 2, dur: 2 },
            { beat: 4, ch: 1, preset: 'deepBass', note: 'G', oct: 2, dur: 2 },
            { beat: 6, ch: 1, preset: 'deepBass', note: 'F#', oct: 2, dur: 2 },
        ];

        const drums = [];
        for (let i = 0; i < 8; i += 2) {
            drums.push({ beat: i, ch: 7, drum: 'kick', vol: 0.3 });
            drums.push({ beat: i + 1, ch: 7, drum: 'snare', vol: 0.2 });
        }

        return { melody, bass, drums, pad, length: 8 };
    }

    generateStarFoxTheme() {
        // Urgent, sci-fi
        const melody = [
            { beat: 0, ch: 0, preset: 'sawLead', note: 'F', oct: 5, dur: 0.25 },
            { beat: 0.25, ch: 0, preset: 'sawLead', note: 'F', oct: 5, dur: 0.25 },
            { beat: 0.5, ch: 0, preset: 'sawLead', note: 'G#', oct: 5, dur: 0.5 },
            { beat: 1, ch: 0, preset: 'sawLead', note: 'A#', oct: 5, dur: 0.5 },
            { beat: 1.5, ch: 0, preset: 'sawLead', note: 'C', oct: 6, dur: 1 },
            { beat: 3, ch: 0, preset: 'sawLead', note: 'A#', oct: 5, dur: 0.5 },
            { beat: 3.5, ch: 0, preset: 'sawLead', note: 'G#', oct: 5, dur: 0.5 },
        ];

        const bass = [
            { beat: 0, ch: 1, preset: 'aggressiveBass', note: 'F', oct: 2, dur: 1 },
            { beat: 1, ch: 1, preset: 'aggressiveBass', note: 'G#', oct: 2, dur: 1 },
            { beat: 2, ch: 1, preset: 'aggressiveBass', note: 'A#', oct: 2, dur: 1 },
            { beat: 3, ch: 1, preset: 'aggressiveBass', note: 'G#', oct: 2, dur: 1 },
        ];

        const drums = [];
        for (let i = 0; i < 4; i += 0.5) {
            drums.push({ beat: i, ch: 7, drum: 'hihat', vol: 0.15 });
            if (i % 1 === 0) drums.push({ beat: i, ch: 7, drum: 'kick', vol: 0.45 });
            if (i === 1 || i === 3) drums.push({ beat: i, ch: 7, drum: 'snare', vol: 0.35 });
        }

        return { melody, bass, drums, length: 4 };
    }

    generateEarthboundTheme() {
        // Quirky, slightly off
        const melody = [
            { beat: 0, ch: 0, preset: 'squareLead', note: 'C', oct: 5, dur: 0.75 },
            { beat: 0.75, ch: 0, preset: 'squareLead', note: 'D', oct: 5, dur: 0.25 },
            { beat: 1, ch: 0, preset: 'squareLead', note: 'E', oct: 5, dur: 0.5 },
            { beat: 1.5, ch: 0, preset: 'squareLead', note: 'G', oct: 5, dur: 1 },
            { beat: 3, ch: 0, preset: 'squareLead', note: 'F', oct: 5, dur: 0.5 },
            { beat: 3.5, ch: 0, preset: 'squareLead', note: 'E', oct: 5, dur: 0.5 },
            { beat: 4, ch: 0, preset: 'squareLead', note: 'D', oct: 5, dur: 1 },
            { beat: 5, ch: 0, preset: 'squareLead', note: 'C', oct: 5, dur: 1 },
        ];

        const bass = [
            { beat: 0, ch: 1, preset: 'synthBass', note: 'C', oct: 3, dur: 1.5 },
            { beat: 1.5, ch: 1, preset: 'synthBass', note: 'E', oct: 3, dur: 0.5 },
            { beat: 2, ch: 1, preset: 'synthBass', note: 'G', oct: 2, dur: 2 },
            { beat: 4, ch: 1, preset: 'synthBass', note: 'F', oct: 2, dur: 1 },
            { beat: 5, ch: 1, preset: 'synthBass', note: 'G', oct: 2, dur: 1 },
        ];

        const drums = [];
        for (let i = 0; i < 6; i++) {
            drums.push({ beat: i, ch: 7, drum: 'kick', vol: 0.3 });
            if (i % 3 === 1) drums.push({ beat: i, ch: 7, drum: 'snare', vol: 0.25 });
            drums.push({ beat: i + 0.5, ch: 7, drum: 'hihat', vol: 0.12 });
        }

        return { melody, bass, drums, length: 6 };
    }

    generateCastlevaniaTheme() {
        // Gothic, dramatic
        const melody = [
            { beat: 0, ch: 0, preset: 'sawLead', note: 'D', oct: 5, dur: 0.5 },
            { beat: 0.5, ch: 0, preset: 'sawLead', note: 'E', oct: 5, dur: 0.5 },
            { beat: 1, ch: 0, preset: 'sawLead', note: 'F', oct: 5, dur: 0.5 },
            { beat: 1.5, ch: 0, preset: 'sawLead', note: 'A', oct: 5, dur: 1 },
            { beat: 3, ch: 0, preset: 'sawLead', note: 'G', oct: 5, dur: 0.5 },
            { beat: 3.5, ch: 0, preset: 'sawLead', note: 'F', oct: 5, dur: 0.5 },
            { beat: 4, ch: 0, preset: 'sawLead', note: 'E', oct: 5, dur: 0.5 },
            { beat: 4.5, ch: 0, preset: 'sawLead', note: 'D', oct: 5, dur: 1.5 },
        ];

        const pad = [
            { beat: 0, ch: 2, preset: 'choirPad', note: 'D', oct: 3, dur: 3 },
            { beat: 3, ch: 2, preset: 'choirPad', note: 'A', oct: 2, dur: 3 },
        ];

        const bass = [
            { beat: 0, ch: 1, preset: 'aggressiveBass', note: 'D', oct: 2, dur: 0.5 },
            { beat: 0.5, ch: 1, preset: 'aggressiveBass', note: 'D', oct: 2, dur: 0.5 },
            { beat: 1, ch: 1, preset: 'aggressiveBass', note: 'F', oct: 2, dur: 1 },
            { beat: 2, ch: 1, preset: 'aggressiveBass', note: 'E', oct: 2, dur: 1 },
            { beat: 3, ch: 1, preset: 'aggressiveBass', note: 'A', oct: 1, dur: 1 },
            { beat: 4, ch: 1, preset: 'aggressiveBass', note: 'D', oct: 2, dur: 2 },
        ];

        const drums = [];
        for (let i = 0; i < 6; i++) {
            drums.push({ beat: i, ch: 7, drum: 'kick', vol: 0.4 });
            if (i % 2 === 1) drums.push({ beat: i, ch: 7, drum: 'snare', vol: 0.35 });
            drums.push({ beat: i + 0.5, ch: 7, drum: 'hihat', vol: 0.15 });
        }

        return { melody, bass, drums, pad, length: 6 };
    }

    generateSignalTheme() {
        // Eerie, sparse
        const melody = [
            { beat: 0, ch: 0, preset: 'ghostVoice', note: 'A', oct: 3, dur: 4 },
            { beat: 4, ch: 0, preset: 'ghostVoice', note: 'G', oct: 3, dur: 4 },
            { beat: 8, ch: 0, preset: 'ghostVoice', note: 'F', oct: 3, dur: 4 },
            { beat: 12, ch: 0, preset: 'ghostVoice', note: 'E', oct: 3, dur: 4 },
        ];

        const pad = [
            { beat: 0, ch: 2, preset: 'darkPad', note: 'A', oct: 2, dur: 16 },
        ];

        return { melody, bass: [], drums: [], pad, length: 16 };
    }

    generateCartridgeTheme() {
        // Digital, glitchy
        const melody = [
            { beat: 0, ch: 0, preset: 'glitch', note: 'C', oct: 5, dur: 0.125 },
            { beat: 0.5, ch: 0, preset: 'glitch', note: 'E', oct: 5, dur: 0.125 },
            { beat: 1, ch: 0, preset: 'glitch', note: 'G', oct: 5, dur: 0.125 },
            { beat: 2, ch: 0, preset: 'glitch', note: 'C', oct: 6, dur: 0.125 },
            { beat: 3, ch: 0, preset: 'glitch', note: 'B', oct: 5, dur: 0.125 },
            { beat: 4, ch: 0, preset: 'arpSquare', note: 'C', oct: 4, dur: 0.25 },
            { beat: 4.5, ch: 0, preset: 'arpSquare', note: 'D#', oct: 4, dur: 0.25 },
            { beat: 5, ch: 0, preset: 'arpSquare', note: 'F#', oct: 4, dur: 0.25 },
            { beat: 5.5, ch: 0, preset: 'arpSquare', note: 'A', oct: 4, dur: 0.25 },
        ];

        return { melody, bass: [], drums: [], length: 8 };
    }

    // === PLAYBACK ===

    playTrack(gameId) {
        this.stop();

        const track = this.tracks[gameId];
        if (!track || !audioEngine.initialized) return;

        this.currentTrack = track;
        this.bpm = track.bpm;
        this.beat = 0;
        this.stepInterval = 60000 / this.bpm;
        this.playing = true;

        this.scheduleLoop();
    }

    scheduleLoop() {
        if (!this.playing || !this.currentTrack) return;

        const track = this.currentTrack;
        const seq = track.sequence;
        const beatDuration = 60 / this.bpm;

        // Schedule all events in this loop
        const allEvents = [
            ...(seq.melody || []),
            ...(seq.bass || []),
            ...(seq.pad || []),
        ];

        for (const event of allEvents) {
            const delay = event.beat * beatDuration * 1000;

            setTimeout(() => {
                if (!this.playing) return;

                let freq = instruments.noteToFreq(event.note, event.oct);

                // Corruption: detune and randomize
                if (this.corruptionLevel > 0.1) {
                    freq *= 1 + (Math.random() - 0.5) * this.corruptionLevel * 0.1;
                }

                instruments.play(
                    event.preset,
                    event.ch,
                    freq,
                    event.dur * beatDuration,
                    { volume: (event.vol || 0.3) * (1 - this.corruptionLevel * 0.3) }
                );
            }, delay);
        }

        // Schedule drums
        for (const drum of (seq.drums || [])) {
            const delay = drum.beat * beatDuration * 1000;
            setTimeout(() => {
                if (!this.playing) return;
                instruments.playDrum(drum.drum, drum.ch || 7, drum.vol || 0.3);
            }, delay);
        }

        // Schedule next loop
        const loopDuration = seq.length * beatDuration * 1000;
        setTimeout(() => {
            if (this.playing && this.looping) {
                this.scheduleLoop();
            }
        }, loopDuration);
    }

    stop() {
        this.playing = false;
        this.currentTrack = null;
        audioEngine.stopAll();
    }

    setBPM(bpm) {
        this.bpm = bpm;
        this.stepInterval = 60000 / bpm;
    }

    setCorruption(level) {
        this.corruptionLevel = level;

        // At high corruption, detune everything
        if (level > 0.5) {
            this.bpm *= 1 + (Math.random() - 0.5) * level * 0.2;
        }
    }
}

export const musicTracks = new MusicTracks();
export default musicTracks;
