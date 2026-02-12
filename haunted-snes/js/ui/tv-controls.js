// tv-controls.js — Volume/brightness knobs, channels

import { events, EVENTS } from '../core/events.js';
import state from '../core/state.js';
import { audioEngine } from '../audio/audio-engine.js';

class TVControls {
    constructor() {
        this.volumeAngle = 200; // degrees
        this.brightnessAngle = 220;
        this.dragging = null;
        this.startAngle = 0;
    }

    init() {
        const volumeKnob = document.getElementById('volume-knob');
        const brightnessKnob = document.getElementById('brightness-knob');

        if (volumeKnob) {
            this.setupKnob(volumeKnob, 'volume');
            this.updateKnobVisual(volumeKnob, this.volumeAngle);
        }

        if (brightnessKnob) {
            this.setupKnob(brightnessKnob, 'brightness');
            this.updateKnobVisual(brightnessKnob, this.brightnessAngle);
        }

        // Mouse up to stop dragging
        document.addEventListener('mouseup', () => { this.dragging = null; });
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    }

    setupKnob(el, type) {
        el.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.dragging = type;
            this.startAngle = this.getMouseAngle(e, el);
        });

        // Click to toggle
        el.addEventListener('click', (e) => {
            if (type === 'volume') {
                this.volumeAngle = (this.volumeAngle + 30) % 360;
                const vol = Math.max(0, Math.min(1, this.volumeAngle / 300));
                audioEngine.setMasterVolume(vol);
                state.set('tvVolume', vol);
                this.updateKnobVisual(el, this.volumeAngle);
            } else {
                this.brightnessAngle = (this.brightnessAngle + 30) % 360;
                const brt = Math.max(0.3, Math.min(1.2, this.brightnessAngle / 300));
                state.set('tvBrightness', brt);
                this.applyBrightness(brt);
                this.updateKnobVisual(el, this.brightnessAngle);
            }
        });
    }

    onMouseMove(e) {
        if (!this.dragging) return;

        const el = document.getElementById(
            this.dragging === 'volume' ? 'volume-knob' : 'brightness-knob'
        );
        if (!el) return;

        const angle = this.getMouseAngle(e, el);

        if (this.dragging === 'volume') {
            this.volumeAngle = Math.max(0, Math.min(300, angle));
            const vol = this.volumeAngle / 300;
            audioEngine.setMasterVolume(vol);
            state.set('tvVolume', vol);
            this.updateKnobVisual(el, this.volumeAngle);
        } else {
            this.brightnessAngle = Math.max(0, Math.min(300, angle));
            const brt = 0.3 + (this.brightnessAngle / 300) * 0.9;
            state.set('tvBrightness', brt);
            this.applyBrightness(brt);
            this.updateKnobVisual(el, this.brightnessAngle);
        }
    }

    getMouseAngle(e, el) {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        let angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
        if (angle < 0) angle += 360;
        return angle;
    }

    updateKnobVisual(el, angle) {
        const indicator = el.querySelector('.knob-indicator');
        if (indicator) {
            indicator.style.transform = `rotate(${angle}deg)`;
        }
    }

    applyBrightness(value) {
        const canvas = document.getElementById('game-canvas');
        if (canvas) {
            canvas.style.filter = `brightness(${value})`;
        }
    }
}

export const tvControls = new TVControls();
export default tvControls;
