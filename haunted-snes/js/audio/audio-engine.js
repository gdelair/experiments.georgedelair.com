// audio-engine.js — SPC700-style 8-channel mixer

import { events, EVENTS } from '../core/events.js';
import state from '../core/state.js';

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.initialized = false;
        this.channels = new Array(8).fill(null);
        this.channelGains = [];
        this.channelPans = [];
        this.masterGain = null;
        this.compressor = null;
        this.reverbNode = null;
        this.chorusNode = null;
        this.corruptionInsert = null;

        // Corruption effects
        this.bitcrusher = null;
        this.distortion = null;
        this.ringMod = null;

        this.sampleCache = new Map();
        this.activeNotes = new Map();
    }

    async init() {
        if (this.initialized) return;

        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 32000  // SPC700 sample rate
            });

            if (this.ctx.state === 'suspended') {
                await this.ctx.resume();
            }

            this.buildSignalChain();
            this.initialized = true;
            state.set('audioInitialized', true);
            events.emit(EVENTS.AUDIO_INIT);
        } catch (e) {
            console.warn('[Audio] Failed to initialize:', e);
        }
    }

    buildSignalChain() {
        const ctx = this.ctx;

        // Master output
        this.masterGain = ctx.createGain();
        this.masterGain.gain.value = state.get('masterVolume');

        // Compressor
        this.compressor = ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -24;
        this.compressor.knee.value = 12;
        this.compressor.ratio.value = 4;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.25;

        // Reverb (convolution)
        this.reverbNode = ctx.createGain();
        this.reverbNode.gain.value = 0.15;
        this.reverbSend = ctx.createGain();
        this.reverbSend.gain.value = 0.3;
        this.createReverbImpulse();

        // Chorus (via delay modulation)
        this.chorusNode = ctx.createDelay(0.05);
        this.chorusNode.delayTime.value = 0.015;
        this.chorusGain = ctx.createGain();
        this.chorusGain.gain.value = 0.3;

        // Chorus LFO
        this.chorusLFO = ctx.createOscillator();
        this.chorusLFO.type = 'sine';
        this.chorusLFO.frequency.value = 0.5;
        this.chorusLFOGain = ctx.createGain();
        this.chorusLFOGain.gain.value = 0.002;
        this.chorusLFO.connect(this.chorusLFOGain);
        this.chorusLFOGain.connect(this.chorusNode.delayTime);
        this.chorusLFO.start();

        // Corruption insert (bypassed by default)
        this.corruptionGain = ctx.createGain();
        this.corruptionGain.gain.value = 0;

        // Distortion
        this.distortion = ctx.createWaveShaper();
        this.distortion.curve = this.makeDistortionCurve(0);
        this.distortion.oversample = '4x';

        // Create 8 channels
        for (let i = 0; i < 8; i++) {
            const gain = ctx.createGain();
            gain.gain.value = 0.7;
            const pan = ctx.createStereoPanner();
            pan.pan.value = 0;

            // Channel → Pan → Chorus → Compressor → Master → Out
            gain.connect(pan);
            pan.connect(this.compressor);
            pan.connect(this.chorusNode);
            pan.connect(this.reverbSend);

            this.channelGains.push(gain);
            this.channelPans.push(pan);
        }

        this.chorusNode.connect(this.chorusGain);
        this.chorusGain.connect(this.compressor);

        this.reverbSend.connect(this.reverbNode);
        this.reverbNode.connect(this.compressor);

        this.compressor.connect(this.masterGain);

        // Corruption path
        this.compressor.connect(this.corruptionGain);
        this.corruptionGain.connect(this.distortion);
        this.distortion.connect(this.masterGain);

        this.masterGain.connect(ctx.destination);
    }

    createReverbImpulse() {
        const ctx = this.ctx;
        const length = ctx.sampleRate * 1.5;
        const impulse = ctx.createBuffer(2, length, ctx.sampleRate);

        for (let ch = 0; ch < 2; ch++) {
            const data = impulse.getChannelData(ch);
            for (let i = 0; i < length; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.4));
            }
        }

        const convolver = ctx.createConvolver();
        convolver.buffer = impulse;

        // Re-wire reverb through convolver
        this.reverbSend.disconnect();
        this.reverbSend.connect(convolver);
        convolver.connect(this.reverbNode);
    }

    // Play a note on a channel
    playNote(channel, frequency, duration, options = {}) {
        if (!this.initialized || channel < 0 || channel >= 8) return null;

        const {
            type = 'square',
            volume = 0.5,
            pan = 0,
            attack = 0.01,
            decay = 0.1,
            sustain = 0.7,
            release = 0.2,
            vibrato = 0,
            vibratoSpeed = 5,
            detune = 0
        } = options;

        const ctx = this.ctx;
        const now = ctx.currentTime;

        // Create oscillator
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = frequency;
        osc.detune.value = detune;

        // Envelope
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, now);
        env.gain.linearRampToValueAtTime(volume, now + attack);
        env.gain.linearRampToValueAtTime(volume * sustain, now + attack + decay);

        if (duration > 0) {
            const endTime = now + duration;
            env.gain.setValueAtTime(volume * sustain, endTime - release);
            env.gain.linearRampToValueAtTime(0, endTime);
            osc.stop(endTime + 0.01);
        }

        // Vibrato
        if (vibrato > 0) {
            const vibratoOsc = ctx.createOscillator();
            const vibratoGain = ctx.createGain();
            vibratoOsc.frequency.value = vibratoSpeed;
            vibratoGain.gain.value = vibrato;
            vibratoOsc.connect(vibratoGain);
            vibratoGain.connect(osc.frequency);
            vibratoOsc.start();
            if (duration > 0) vibratoOsc.stop(now + duration + 0.01);
        }

        // Connect
        osc.connect(env);
        this.channelPans[channel].pan.value = pan;
        env.connect(this.channelGains[channel]);

        osc.start();

        const noteId = `${channel}-${Date.now()}`;
        this.activeNotes.set(noteId, { osc, env, channel });

        if (duration > 0) {
            setTimeout(() => this.activeNotes.delete(noteId), duration * 1000 + 100);
        }

        return noteId;
    }

    // Play a sample buffer on a channel
    playSample(channel, buffer, options = {}) {
        if (!this.initialized || !buffer) return null;

        const {
            volume = 0.5,
            pan = 0,
            playbackRate = 1,
            loop = false,
            loopStart = 0,
            loopEnd = 0
        } = options;

        const ctx = this.ctx;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = playbackRate;
        source.loop = loop;
        if (loop && loopEnd > 0) {
            source.loopStart = loopStart;
            source.loopEnd = loopEnd;
        }

        const env = ctx.createGain();
        env.gain.value = volume;

        source.connect(env);
        this.channelPans[channel].pan.value = pan;
        env.connect(this.channelGains[channel]);

        source.start();

        const noteId = `sample-${channel}-${Date.now()}`;
        this.activeNotes.set(noteId, { source, env, channel });

        return noteId;
    }

    // Stop a specific note
    stopNote(noteId) {
        const note = this.activeNotes.get(noteId);
        if (!note) return;

        try {
            if (note.osc) {
                note.env.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.05);
                note.osc.stop(this.ctx.currentTime + 0.06);
            }
            if (note.source) {
                note.env.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.05);
                note.source.stop(this.ctx.currentTime + 0.06);
            }
        } catch (e) { /* already stopped */ }

        this.activeNotes.delete(noteId);
    }

    // Stop all sounds
    stopAll() {
        for (const [id] of this.activeNotes) {
            this.stopNote(id);
        }
        this.activeNotes.clear();
    }

    // Stop a channel
    stopChannel(channel) {
        for (const [id, note] of this.activeNotes) {
            if (note.channel === channel) {
                this.stopNote(id);
            }
        }
    }

    // Generate sample buffer
    generateSample(type, duration, frequency = 440) {
        if (!this.ctx) return null;

        const sampleRate = this.ctx.sampleRate;
        const length = Math.floor(sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        switch (type) {
            case 'noise':
                for (let i = 0; i < length; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                break;

            case 'sine':
                for (let i = 0; i < length; i++) {
                    data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate);
                }
                break;

            case 'kick':
                for (let i = 0; i < length; i++) {
                    const t = i / sampleRate;
                    const freq = 150 * Math.exp(-t * 20);
                    data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 8);
                }
                break;

            case 'snare':
                for (let i = 0; i < length; i++) {
                    const t = i / sampleRate;
                    const noise = Math.random() * 2 - 1;
                    const tone = Math.sin(2 * Math.PI * 200 * t);
                    data[i] = (noise * 0.6 + tone * 0.4) * Math.exp(-t * 15);
                }
                break;

            case 'hihat':
                for (let i = 0; i < length; i++) {
                    const t = i / sampleRate;
                    data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 40);
                }
                break;

            case 'piano':
                for (let i = 0; i < length; i++) {
                    const t = i / sampleRate;
                    let sample = 0;
                    for (let h = 1; h <= 8; h++) {
                        sample += Math.sin(2 * Math.PI * frequency * h * t) / (h * h);
                    }
                    data[i] = sample * Math.exp(-t * 2) * 0.5;
                }
                break;

            case 'strings':
                for (let i = 0; i < length; i++) {
                    const t = i / sampleRate;
                    let sample = 0;
                    for (let h = 1; h <= 6; h++) {
                        const vibrato = 1 + 0.002 * Math.sin(2 * Math.PI * 5 * t);
                        sample += Math.sin(2 * Math.PI * frequency * h * vibrato * t) / h;
                    }
                    const env = Math.min(1, t * 4) * Math.exp(-t * 0.5);
                    data[i] = sample * env * 0.3;
                }
                break;

            case 'choir':
                for (let i = 0; i < length; i++) {
                    const t = i / sampleRate;
                    let sample = 0;
                    for (let v = 0; v < 3; v++) {
                        const detune = 1 + (v - 1) * 0.003;
                        const vibrato = 1 + 0.004 * Math.sin(2 * Math.PI * (4 + v) * t);
                        for (let h = 1; h <= 4; h++) {
                            sample += Math.sin(2 * Math.PI * frequency * h * detune * vibrato * t) / (h * 3);
                        }
                    }
                    const env = Math.min(1, t * 2) * Math.exp(-t * 0.3);
                    data[i] = sample * env * 0.2;
                }
                break;

            case 'bass':
                for (let i = 0; i < length; i++) {
                    const t = i / sampleRate;
                    const fundamental = Math.sin(2 * Math.PI * frequency * t);
                    const second = Math.sin(2 * Math.PI * frequency * 2 * t) * 0.5;
                    const sub = Math.sin(2 * Math.PI * frequency * 0.5 * t) * 0.3;
                    data[i] = (fundamental + second + sub) * Math.exp(-t * 3) * 0.4;
                }
                break;
        }

        // Cache it
        const key = `${type}-${duration}-${frequency}`;
        this.sampleCache.set(key, buffer);
        return buffer;
    }

    // Corruption effects
    setCorruption(amount) {
        if (!this.initialized) return;

        this.corruptionGain.gain.value = amount * 0.3;
        this.distortion.curve = this.makeDistortionCurve(amount * 400);

        // Pitch drift
        if (amount > 0.3) {
            for (const [, note] of this.activeNotes) {
                if (note.osc) {
                    const drift = (Math.random() - 0.5) * amount * 50;
                    note.osc.detune.value = drift;
                }
            }
        }
    }

    makeDistortionCurve(amount) {
        const samples = 44100;
        const curve = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            if (amount === 0) {
                curve[i] = x;
            } else {
                curve[i] = ((3 + amount) * x * 20 * (Math.PI / 180)) /
                    (Math.PI + amount * Math.abs(x));
            }
        }
        return curve;
    }

    // Volume controls
    setMasterVolume(v) {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, v));
        }
        state.set('masterVolume', v);
    }

    setChannelVolume(channel, v) {
        if (this.channelGains[channel]) {
            this.channelGains[channel].gain.value = Math.max(0, Math.min(1, v));
        }
    }

    setChannelPan(channel, p) {
        if (this.channelPans[channel]) {
            this.channelPans[channel].pan.value = Math.max(-1, Math.min(1, p));
        }
    }

    setReverbAmount(amount) {
        if (this.reverbSend) {
            this.reverbSend.gain.value = Math.max(0, Math.min(1, amount));
        }
    }

    getContext() {
        return this.ctx;
    }

    getCurrentTime() {
        return this.ctx ? this.ctx.currentTime : 0;
    }
}

export const audioEngine = new AudioEngine();
export default audioEngine;
