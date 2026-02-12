// instruments.js — Sample-based synth presets for SNES-style music

import { audioEngine } from './audio-engine.js';

class Instruments {
    constructor() {
        this.presets = {};
        this.buffers = new Map();
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        this.presets = {
            // Lead instruments
            squareLead: {
                type: 'square',
                attack: 0.01,
                decay: 0.1,
                sustain: 0.6,
                release: 0.15,
                vibrato: 3,
                vibratoSpeed: 5
            },
            sawLead: {
                type: 'sawtooth',
                attack: 0.01,
                decay: 0.08,
                sustain: 0.7,
                release: 0.1,
                vibrato: 2,
                vibratoSpeed: 6
            },
            flute: {
                type: 'sine',
                attack: 0.05,
                decay: 0.1,
                sustain: 0.8,
                release: 0.2,
                vibrato: 4,
                vibratoSpeed: 4
            },

            // Pads
            stringPad: {
                type: 'sawtooth',
                attack: 0.3,
                decay: 0.2,
                sustain: 0.6,
                release: 0.5,
                vibrato: 2,
                vibratoSpeed: 3,
                detune: 5
            },
            choirPad: {
                type: 'sine',
                attack: 0.4,
                decay: 0.3,
                sustain: 0.5,
                release: 0.6,
                vibrato: 5,
                vibratoSpeed: 4
            },
            darkPad: {
                type: 'sawtooth',
                attack: 0.5,
                decay: 0.3,
                sustain: 0.4,
                release: 0.8,
                vibrato: 3,
                vibratoSpeed: 2,
                detune: -10
            },

            // Bass
            synthBass: {
                type: 'square',
                attack: 0.005,
                decay: 0.15,
                sustain: 0.4,
                release: 0.1
            },
            deepBass: {
                type: 'triangle',
                attack: 0.01,
                decay: 0.2,
                sustain: 0.5,
                release: 0.15
            },
            aggressiveBass: {
                type: 'sawtooth',
                attack: 0.003,
                decay: 0.1,
                sustain: 0.6,
                release: 0.08
            },

            // Creepy instruments
            ghostVoice: {
                type: 'sine',
                attack: 0.8,
                decay: 0.5,
                sustain: 0.3,
                release: 1.0,
                vibrato: 8,
                vibratoSpeed: 3,
                detune: -5
            },
            detuned: {
                type: 'sawtooth',
                attack: 0.02,
                decay: 0.1,
                sustain: 0.5,
                release: 0.2,
                detune: 25
            },
            glitch: {
                type: 'square',
                attack: 0.001,
                decay: 0.02,
                sustain: 0.3,
                release: 0.01
            },

            // Arpeggios
            arpSquare: {
                type: 'square',
                attack: 0.003,
                decay: 0.05,
                sustain: 0.3,
                release: 0.05
            },
            arpTriangle: {
                type: 'triangle',
                attack: 0.005,
                decay: 0.08,
                sustain: 0.4,
                release: 0.08
            }
        };

        this.initialized = true;
    }

    // Play a preset instrument
    play(presetName, channel, frequency, duration, overrides = {}) {
        const preset = this.presets[presetName];
        if (!preset) {
            console.warn(`[Instruments] Unknown preset: ${presetName}`);
            return null;
        }

        return audioEngine.playNote(channel, frequency, duration, {
            ...preset,
            ...overrides
        });
    }

    // Play a pre-generated sample
    playSample(sampleType, channel, options = {}) {
        const key = `${sampleType}-${options.frequency || 440}`;
        let buffer = this.buffers.get(key);

        if (!buffer) {
            buffer = audioEngine.generateSample(
                sampleType,
                options.duration || 1,
                options.frequency || 440
            );
            if (buffer) this.buffers.set(key, buffer);
        }

        if (!buffer) return null;
        return audioEngine.playSample(channel, buffer, options);
    }

    // Play a drum hit
    playDrum(type, channel = 7, volume = 0.5) {
        const key = `drum-${type}`;
        let buffer = this.buffers.get(key);

        if (!buffer) {
            const durations = { kick: 0.3, snare: 0.2, hihat: 0.1 };
            buffer = audioEngine.generateSample(type, durations[type] || 0.2);
            if (buffer) this.buffers.set(key, buffer);
        }

        if (!buffer) return null;
        return audioEngine.playSample(channel, buffer, { volume });
    }

    // Note frequency helpers
    noteToFreq(note, octave = 4) {
        const notes = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
        const semitone = notes[note];
        if (semitone === undefined) return 440;
        return 440 * Math.pow(2, (semitone - 9 + (octave - 4) * 12) / 12);
    }

    midiToFreq(midi) {
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    // Scale generators
    getScale(root, type = 'minor', octave = 4) {
        const intervals = {
            major: [0, 2, 4, 5, 7, 9, 11],
            minor: [0, 2, 3, 5, 7, 8, 10],
            pentatonic: [0, 2, 4, 7, 9],
            blues: [0, 3, 5, 6, 7, 10],
            chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
            diminished: [0, 2, 3, 5, 6, 8, 9, 11],
            wholeTone: [0, 2, 4, 6, 8, 10],
            // Creepy scales
            phrygian: [0, 1, 3, 5, 7, 8, 10],
            locrian: [0, 1, 3, 5, 6, 8, 10],
            hungarianMinor: [0, 2, 3, 6, 7, 8, 11]
        };

        const rootFreq = this.noteToFreq(root, octave);
        return (intervals[type] || intervals.minor).map(i =>
            rootFreq * Math.pow(2, i / 12)
        );
    }

    // Chord helpers
    getChord(root, type = 'minor', octave = 4) {
        const intervals = {
            major: [0, 4, 7],
            minor: [0, 3, 7],
            diminished: [0, 3, 6],
            augmented: [0, 4, 8],
            sus2: [0, 2, 7],
            sus4: [0, 5, 7],
            dom7: [0, 4, 7, 10],
            min7: [0, 3, 7, 10],
            maj7: [0, 4, 7, 11],
            dim7: [0, 3, 6, 9]
        };

        const rootFreq = this.noteToFreq(root, octave);
        return (intervals[type] || intervals.minor).map(i =>
            rootFreq * Math.pow(2, i / 12)
        );
    }
}

export const instruments = new Instruments();
export default instruments;
