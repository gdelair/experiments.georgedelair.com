// sfx.js — Sound effects library

import { audioEngine } from './audio-engine.js';
import state from '../core/state.js';

class SFX {
    constructor() {
        this.buffers = new Map();
        this.definitions = {};
    }

    init() {
        this.definitions = {
            // System
            powerOn: () => this.synthPowerOn(),
            powerOff: () => this.synthPowerOff(),
            bootChime: () => this.synthBootChime(),
            channelChange: () => this.synthChannelChange(),

            // Game common
            jump: () => this.synthJump(),
            land: () => this.synthLand(),
            hit: () => this.synthHit(),
            coin: () => this.synthCoin(),
            explosion: () => this.synthExplosion(),
            select: () => this.synthSelect(),
            confirm: () => this.synthConfirm(),
            cancel: () => this.synthCancel(),
            menuMove: () => this.synthMenuMove(),
            damage: () => this.synthDamage(),
            heal: () => this.synthHeal(),
            death: () => this.synthDeath(),
            levelUp: () => this.synthLevelUp(),
            powerUp: () => this.synthPowerUp(),
            whip: () => this.synthWhip(),
            sword: () => this.synthSword(),
            shoot: () => this.synthShoot(),
            boost: () => this.synthBoost(),
            punch: () => this.synthPunch(),
            block: () => this.synthBlock(),

            // Haunting
            glitch: () => this.synthGlitch(),
            scare: () => this.synthScare(),
            whisper: () => this.synthWhisper(),
            static: () => this.synthStatic(),
            heartbeat: () => this.synthHeartbeat(),
            distortion: () => this.synthDistortion(),
            ghostVoice: () => this.synthGhostVoice(),
            eject: () => this.synthEject(),
            overheat: () => this.synthOverheat(),
            konamiActivate: () => this.synthKonamiActivate()
        };
    }

    play(name) {
        if (!audioEngine.initialized) return;
        if (state.get('muted')) return;

        const fn = this.definitions[name];
        if (fn) {
            try { fn(); } catch (e) { /* silent fail */ }
        }
    }

    // === SYSTEM SFX ===

    synthPowerOn() {
        const ctx = audioEngine.getContext();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.2);
        osc.frequency.linearRampToValueAtTime(600, now + 0.4);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.connect(gain);
        gain.connect(audioEngine.masterGain);
        osc.start(now);
        osc.stop(now + 0.5);
    }

    synthPowerOff() {
        const ctx = audioEngine.getContext();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.3);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.4);
        osc.connect(gain);
        gain.connect(audioEngine.masterGain);
        osc.start(now);
        osc.stop(now + 0.4);
    }

    synthBootChime() {
        const ctx = audioEngine.getContext();
        const now = ctx.currentTime;
        const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, now + i * 0.15);
            gain.gain.linearRampToValueAtTime(0.2, now + i * 0.15 + 0.02);
            gain.gain.linearRampToValueAtTime(0, now + i * 0.15 + 0.4);
            osc.connect(gain);
            gain.connect(audioEngine.masterGain);
            osc.start(now + i * 0.15);
            osc.stop(now + i * 0.15 + 0.5);
        });
    }

    synthChannelChange() {
        const ctx = audioEngine.getContext();
        const now = ctx.currentTime;
        // Static burst
        const bufferSize = ctx.sampleRate * 0.1;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / bufferSize * 3);
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.value = 0.15;
        source.connect(gain);
        gain.connect(audioEngine.masterGain);
        source.start(now);
    }

    // === GAME SFX ===

    synthJump() {
        const ctx = audioEngine.getContext();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.connect(gain);
        gain.connect(audioEngine.masterGain);
        osc.start(now);
        osc.stop(now + 0.2);
    }

    synthLand() {
        const ctx = audioEngine.getContext();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.12);
        osc.connect(gain);
        gain.connect(audioEngine.masterGain);
        osc.start(now);
        osc.stop(now + 0.12);
    }

    synthHit() {
        audioEngine.generateSample('snare', 0.15);
        audioEngine.playSample(6, audioEngine.generateSample('snare', 0.15), { volume: 0.3 });
    }

    synthCoin() {
        const ctx = audioEngine.getContext();
        const now = ctx.currentTime;
        [988, 1319].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.15, now + i * 0.08);
            gain.gain.linearRampToValueAtTime(0, now + i * 0.08 + 0.15);
            osc.connect(gain);
            gain.connect(audioEngine.masterGain);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.2);
        });
    }

    synthExplosion() {
        const buf = audioEngine.generateSample('noise', 0.5);
        if (buf) audioEngine.playSample(6, buf, { volume: 0.25, playbackRate: 0.5 });
    }

    synthSelect() {
        const ctx = audioEngine.getContext();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = 440;
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.08);
        osc.connect(gain);
        gain.connect(audioEngine.masterGain);
        osc.start(now);
        osc.stop(now + 0.08);
    }

    synthConfirm() {
        const ctx = audioEngine.getContext();
        const now = ctx.currentTime;
        [440, 660].forEach((f, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = f;
            gain.gain.setValueAtTime(0.12, now + i * 0.06);
            gain.gain.linearRampToValueAtTime(0, now + i * 0.06 + 0.1);
            osc.connect(gain);
            gain.connect(audioEngine.masterGain);
            osc.start(now + i * 0.06);
            osc.stop(now + i * 0.06 + 0.12);
        });
    }

    synthCancel() {
        const ctx = audioEngine.getContext();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(220, now + 0.1);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.12);
        osc.connect(gain);
        gain.connect(audioEngine.masterGain);
        osc.start(now);
        osc.stop(now + 0.12);
    }

    synthMenuMove() {
        const ctx = audioEngine.getContext();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = 660;
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.05);
        osc.connect(gain);
        gain.connect(audioEngine.masterGain);
        osc.start(now);
        osc.stop(now + 0.05);
    }

    synthDamage() {
        const ctx = audioEngine.getContext();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.connect(gain);
        gain.connect(audioEngine.masterGain);
        osc.start(now);
        osc.stop(now + 0.2);
    }

    synthHeal() {
        const ctx = audioEngine.getContext();
        const now = ctx.currentTime;
        [330, 440, 550, 660].forEach((f, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = f;
            gain.gain.setValueAtTime(0.1, now + i * 0.1);
            gain.gain.linearRampToValueAtTime(0, now + i * 0.1 + 0.2);
            osc.connect(gain);
            gain.connect(audioEngine.masterGain);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.25);
        });
    }

    synthDeath() {
        const ctx = audioEngine.getContext();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 1.0);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 1.2);
        osc.connect(gain);
        gain.connect(audioEngine.masterGain);
        osc.start(now);
        osc.stop(now + 1.2);
    }

    synthLevelUp() {
        const ctx = audioEngine.getContext();
        const now = ctx.currentTime;
        const notes = [262, 330, 392, 523, 660, 784];
        notes.forEach((f, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = f;
            gain.gain.setValueAtTime(0.15, now + i * 0.08);
            gain.gain.linearRampToValueAtTime(0, now + i * 0.08 + 0.2);
            osc.connect(gain);
            gain.connect(audioEngine.masterGain);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.3);
        });
    }

    synthPowerUp() {
        const ctx = audioEngine.getContext();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.5);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.6);
        osc.connect(gain);
        gain.connect(audioEngine.masterGain);
        osc.start(now);
        osc.stop(now + 0.6);
    }

    synthWhip() {
        const buf = audioEngine.generateSample('noise', 0.15);
        if (buf) audioEngine.playSample(6, buf, { volume: 0.2, playbackRate: 2.0 });
    }

    synthSword() {
        const buf = audioEngine.generateSample('noise', 0.1);
        if (buf) audioEngine.playSample(6, buf, { volume: 0.15, playbackRate: 3.0 });
    }

    synthShoot() {
        const ctx = audioEngine.getContext();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.12);
        osc.connect(gain);
        gain.connect(audioEngine.masterGain);
        osc.start(now);
        osc.stop(now + 0.12);
    }

    synthBoost() {
        const ctx = audioEngine.getContext();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.4);
        osc.connect(gain);
        gain.connect(audioEngine.masterGain);
        osc.start(now);
        osc.stop(now + 0.4);
    }

    synthPunch() {
        const buf = audioEngine.generateSample('kick', 0.2);
        if (buf) audioEngine.playSample(6, buf, { volume: 0.3, playbackRate: 1.5 });
    }

    synthBlock() {
        const buf = audioEngine.generateSample('snare', 0.1);
        if (buf) audioEngine.playSample(6, buf, { volume: 0.15, playbackRate: 2.0 });
    }

    // === HAUNTING SFX ===

    synthGlitch() {
        const ctx = audioEngine.getContext();
        const now = ctx.currentTime;
        for (let i = 0; i < 3; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = Math.random() * 2000 + 200;
            gain.gain.setValueAtTime(0.1, now + i * 0.03);
            gain.gain.linearRampToValueAtTime(0, now + i * 0.03 + 0.04);
            osc.connect(gain);
            gain.connect(audioEngine.masterGain);
            osc.start(now + i * 0.03);
            osc.stop(now + i * 0.03 + 0.05);
        }
    }

    synthScare() {
        const ctx = audioEngine.getContext();
        const now = ctx.currentTime;
        // Loud chord blast
        [110, 139, 165, 220].forEach(freq => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.8);
            osc.connect(gain);
            gain.connect(audioEngine.masterGain);
            osc.start(now);
            osc.stop(now + 0.8);
        });
        // Noise burst
        const buf = audioEngine.generateSample('noise', 0.3);
        if (buf) audioEngine.playSample(6, buf, { volume: 0.3 });
    }

    synthWhisper() {
        const buf = audioEngine.generateSample('noise', 0.8);
        if (buf) audioEngine.playSample(5, buf, { volume: 0.05, playbackRate: 0.3 });
    }

    synthStatic() {
        const buf = audioEngine.generateSample('noise', 0.5);
        if (buf) audioEngine.playSample(6, buf, { volume: 0.1, playbackRate: 1.0 });
    }

    synthHeartbeat() {
        const ctx = audioEngine.getContext();
        const now = ctx.currentTime;
        [0, 0.15].forEach(offset => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 60;
            gain.gain.setValueAtTime(0.25, now + offset);
            gain.gain.linearRampToValueAtTime(0, now + offset + 0.15);
            osc.connect(gain);
            gain.connect(audioEngine.masterGain);
            osc.start(now + offset);
            osc.stop(now + offset + 0.2);
        });
    }

    synthDistortion() {
        const ctx = audioEngine.getContext();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = 55;
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.connect(gain);
        gain.connect(audioEngine.masterGain);
        osc.start(now);
        osc.stop(now + 0.5);
    }

    synthGhostVoice() {
        const ctx = audioEngine.getContext();
        const now = ctx.currentTime;
        const freqs = [220, 233, 247];
        freqs.forEach((f, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = f;
            osc.frequency.setValueAtTime(f, now);
            osc.frequency.linearRampToValueAtTime(f * 0.95, now + 1.5);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.08, now + 0.5);
            gain.gain.linearRampToValueAtTime(0, now + 2);
            osc.connect(gain);
            gain.connect(audioEngine.masterGain);
            osc.start(now);
            osc.stop(now + 2);
        });
    }

    synthEject() {
        const ctx = audioEngine.getContext();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.25);
        osc.connect(gain);
        gain.connect(audioEngine.masterGain);
        osc.start(now);
        osc.stop(now + 0.25);
    }

    synthOverheat() {
        const ctx = audioEngine.getContext();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 80;
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 1);
        gain.gain.linearRampToValueAtTime(0, now + 2);
        osc.connect(gain);
        gain.connect(audioEngine.masterGain);
        osc.start(now);
        osc.stop(now + 2);
    }

    synthKonamiActivate() {
        const ctx = audioEngine.getContext();
        const now = ctx.currentTime;
        // Ascending chaos
        for (let i = 0; i < 8; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = ['square', 'sawtooth', 'triangle'][i % 3];
            osc.frequency.value = 200 + i * 100;
            gain.gain.setValueAtTime(0.15, now + i * 0.05);
            gain.gain.linearRampToValueAtTime(0, now + i * 0.05 + 0.3);
            osc.connect(gain);
            gain.connect(audioEngine.masterGain);
            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.35);
        }
    }
}

export const sfx = new SFX();
sfx.init();
export default sfx;
