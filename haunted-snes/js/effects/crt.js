// crt.js — Scanlines, phosphor, bloom, curvature post-processor

import { events, EVENTS } from '../core/events.js';
import state from '../core/state.js';

class CRTEffect {
    constructor() {
        this.enabled = true;
        this.scanlineIntensity = 0.12;
        this.phosphorPersistence = 0.15;
        this.bloomStrength = 0;
        this.chromaticAberration = 0;
        this.flickerAmount = 0;
        this.curvature = 0.02;

        this.prevFrame = null;
        this.glitchTimer = 0;
        this.glitchActive = false;
    }

    init() {
        events.on(EVENTS.CRT_GLITCH, (data) => {
            this.triggerGlitch(data.duration || 300, data.intensity || 0.5);
        });

        events.on(EVENTS.HAUNT_STAGE_CHANGE, (data) => {
            this.adjustForHauntStage(data.stage);
        });
    }

    process(ctx, width, height, dt, timestamp) {
        if (!this.enabled || !state.get('crtEnabled')) return;

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Phosphor persistence (frame blending)
        if (this.phosphorPersistence > 0 && this.prevFrame) {
            const prev = this.prevFrame.data;
            const blend = this.phosphorPersistence;
            for (let i = 0; i < data.length; i += 4) {
                data[i] = data[i] * (1 - blend) + prev[i] * blend;
                data[i + 1] = data[i + 1] * (1 - blend) + prev[i + 1] * blend;
                data[i + 2] = data[i + 2] * (1 - blend) + prev[i + 2] * blend;
            }
        }

        // Scanlines
        if (this.scanlineIntensity > 0) {
            for (let y = 0; y < height; y += 2) {
                const rowStart = y * width * 4;
                for (let x = 0; x < width; x++) {
                    const i = rowStart + x * 4;
                    const dim = 1 - this.scanlineIntensity;
                    data[i] *= dim;
                    data[i + 1] *= dim;
                    data[i + 2] *= dim;
                }
            }
        }

        // Chromatic aberration
        if (this.chromaticAberration > 0) {
            const offset = Math.ceil(this.chromaticAberration);
            for (let y = 0; y < height; y++) {
                for (let x = offset; x < width - offset; x++) {
                    const i = (y * width + x) * 4;
                    const iLeft = (y * width + x - offset) * 4;
                    const iRight = (y * width + x + offset) * 4;
                    // Shift red left, blue right
                    data[i] = data[iLeft];         // Red from left
                    data[i + 2] = data[iRight + 2]; // Blue from right
                }
            }
        }

        // Bloom/glow on bright pixels
        if (this.bloomStrength > 0) {
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const i = (y * width + x) * 4;
                    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    if (brightness > 200) {
                        const bloom = this.bloomStrength * (brightness - 200) / 55;
                        // Bleed to neighbors
                        for (let dy = -1; dy <= 1; dy++) {
                            for (let dx = -1; dx <= 1; dx++) {
                                if (dx === 0 && dy === 0) continue;
                                const ni = ((y + dy) * width + (x + dx)) * 4;
                                data[ni] = Math.min(255, data[ni] + bloom * 0.3);
                                data[ni + 1] = Math.min(255, data[ni + 1] + bloom * 0.3);
                                data[ni + 2] = Math.min(255, data[ni + 2] + bloom * 0.3);
                            }
                        }
                    }
                }
            }
        }

        // Vignette (darken edges)
        const cx = width / 2;
        const cy = height / 2;
        const maxDist = Math.sqrt(cx * cx + cy * cy);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dx = (x - cx) / cx;
                const dy = (y - cy) / cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0.7) {
                    const dim = 1 - (dist - 0.7) * 1.5;
                    const factor = Math.max(0, dim);
                    const i = (y * width + x) * 4;
                    data[i] *= factor;
                    data[i + 1] *= factor;
                    data[i + 2] *= factor;
                }
            }
        }

        // Flicker
        if (this.flickerAmount > 0) {
            const flicker = 1 - Math.random() * this.flickerAmount;
            for (let i = 0; i < data.length; i += 4) {
                data[i] *= flicker;
                data[i + 1] *= flicker;
                data[i + 2] *= flicker;
            }
        }

        // Glitch horizontal tear
        if (this.glitchActive) {
            const tearY = Math.floor(Math.random() * height);
            const tearHeight = Math.floor(Math.random() * 8) + 2;
            const tearOffset = Math.floor((Math.random() - 0.5) * 30);

            for (let y = tearY; y < Math.min(tearY + tearHeight, height); y++) {
                for (let x = 0; x < width; x++) {
                    const srcX = ((x + tearOffset) % width + width) % width;
                    const di = (y * width + x) * 4;
                    const si = (y * width + srcX) * 4;
                    data[di] = data[si];
                    data[di + 1] = data[si + 1];
                    data[di + 2] = data[si + 2];
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);

        // Store frame for phosphor persistence
        this.prevFrame = ctx.getImageData(0, 0, width, height);
    }

    triggerGlitch(duration, intensity) {
        this.glitchActive = true;
        this.chromaticAberration = intensity * 3;
        this.flickerAmount = intensity * 0.1;

        setTimeout(() => {
            this.glitchActive = false;
            this.chromaticAberration = state.get('hauntStage') > 1 ? 0.5 : 0;
            this.flickerAmount = state.get('hauntStage') > 2 ? 0.02 : 0;
        }, duration);
    }

    adjustForHauntStage(stage) {
        switch (stage) {
            case 0:
                this.scanlineIntensity = 0.12;
                this.phosphorPersistence = 0.15;
                this.chromaticAberration = 0;
                this.flickerAmount = 0;
                this.bloomStrength = 0;
                break;
            case 1:
                this.scanlineIntensity = 0.15;
                this.phosphorPersistence = 0.2;
                this.chromaticAberration = 0.3;
                this.flickerAmount = 0.005;
                break;
            case 2:
                this.scanlineIntensity = 0.18;
                this.phosphorPersistence = 0.25;
                this.chromaticAberration = 0.8;
                this.flickerAmount = 0.01;
                this.bloomStrength = 0.3;
                break;
            case 3:
                this.scanlineIntensity = 0.22;
                this.phosphorPersistence = 0.3;
                this.chromaticAberration = 1.5;
                this.flickerAmount = 0.03;
                this.bloomStrength = 0.5;
                break;
            case 4:
                this.scanlineIntensity = 0.3;
                this.phosphorPersistence = 0.4;
                this.chromaticAberration = 2.5;
                this.flickerAmount = 0.05;
                this.bloomStrength = 0.8;
                break;
        }
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        state.set('crtEnabled', enabled);
    }
}

export const crt = new CRTEffect();
export default crt;
