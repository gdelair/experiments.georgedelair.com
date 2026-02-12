// vhs.js — Tracking errors, color bleed, head-switch noise, tape distortion

import { events, EVENTS } from '../core/events.js';
import state from '../core/state.js';

class VHSEffect {
    constructor() {
        this.enabled = false;
        this.trackingError = 0;
        this.colorBleed = 0;
        this.headSwitchNoise = 0;
        this.tapeWobble = 0;
        this.noiseAmount = 0;
        this.time = 0;
    }

    init() {
        events.on(EVENTS.VHS_ARTIFACT, (data) => {
            this.triggerArtifact(data.type, data.intensity || 0.5, data.duration || 1000);
        });
    }

    update(dt) {
        this.time += dt / 1000;
    }

    render(ctx, width, height, dt) {
        if (!this.enabled) return;

        this.update(dt);
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Tracking error — horizontal displacement with sine wave
        if (this.trackingError > 0) {
            const trackingY = (Math.sin(this.time * 0.5) * 0.5 + 0.5) * height;
            const bandHeight = 20 + this.trackingError * 40;

            for (let y = Math.floor(trackingY); y < Math.min(Math.floor(trackingY + bandHeight), height); y++) {
                const offset = Math.floor(Math.sin(y * 0.3 + this.time * 5) * this.trackingError * 15);
                if (offset === 0) continue;

                const row = new Uint8ClampedArray(width * 4);
                for (let x = 0; x < width; x++) {
                    const srcX = ((x + offset) % width + width) % width;
                    const si = (y * width + srcX) * 4;
                    const di = x * 4;
                    row[di] = data[si];
                    row[di + 1] = data[si + 1];
                    row[di + 2] = data[si + 2];
                    row[di + 3] = data[si + 3];
                }
                for (let x = 0; x < width; x++) {
                    const i = (y * width + x) * 4;
                    data[i] = row[x * 4];
                    data[i + 1] = row[x * 4 + 1];
                    data[i + 2] = row[x * 4 + 2];
                    data[i + 3] = row[x * 4 + 3];
                }

                // White noise in tracking band
                if (Math.random() < 0.3) {
                    for (let x = 0; x < width; x++) {
                        if (Math.random() < 0.5) {
                            const i = (y * width + x) * 4;
                            const noise = Math.random() * 100;
                            data[i] = Math.min(255, data[i] + noise);
                            data[i + 1] = Math.min(255, data[i + 1] + noise);
                            data[i + 2] = Math.min(255, data[i + 2] + noise);
                        }
                    }
                }
            }
        }

        // Color bleed — shift chroma channels horizontally
        if (this.colorBleed > 0) {
            const bleedOffset = Math.ceil(this.colorBleed * 3);
            for (let y = 0; y < height; y++) {
                for (let x = bleedOffset; x < width; x++) {
                    const i = (y * width + x) * 4;
                    const iPrev = (y * width + (x - bleedOffset)) * 4;
                    // Smear red channel
                    data[i] = Math.floor(data[i] * 0.7 + data[iPrev] * 0.3);
                }
            }
        }

        // Head switch noise — bottom of frame distortion
        if (this.headSwitchNoise > 0) {
            const switchY = height - Math.floor(this.headSwitchNoise * 30) - 5;
            for (let y = switchY; y < height; y++) {
                const offset = Math.floor(Math.random() * this.headSwitchNoise * 20);
                for (let x = 0; x < width; x++) {
                    const i = (y * width + x) * 4;
                    const srcX = (x + offset) % width;
                    const si = (y * width + srcX) * 4;
                    data[i] = data[si];
                    data[i + 1] = data[si + 1];
                    data[i + 2] = data[si + 2];

                    // Noise
                    if (Math.random() < 0.3) {
                        const n = Math.random() * 80;
                        data[i] = Math.min(255, data[i] + n);
                        data[i + 1] = Math.min(255, data[i + 1] + n);
                        data[i + 2] = Math.min(255, data[i + 2] + n);
                    }
                }
            }
        }

        // Tape wobble — vertical jitter
        if (this.tapeWobble > 0) {
            const wobble = Math.sin(this.time * 3) * this.tapeWobble * 3;
            if (Math.abs(wobble) > 0.5) {
                const shift = Math.round(wobble);
                const copy = new Uint8ClampedArray(data);
                for (let y = 0; y < height; y++) {
                    const srcY = Math.max(0, Math.min(height - 1, y + shift));
                    for (let x = 0; x < width; x++) {
                        const di = (y * width + x) * 4;
                        const si = (srcY * width + x) * 4;
                        data[di] = copy[si];
                        data[di + 1] = copy[si + 1];
                        data[di + 2] = copy[si + 2];
                    }
                }
            }
        }

        // Random noise overlay
        if (this.noiseAmount > 0) {
            for (let i = 0; i < data.length; i += 4) {
                if (Math.random() < this.noiseAmount * 0.1) {
                    const noise = (Math.random() - 0.5) * this.noiseAmount * 60;
                    data[i] = Math.max(0, Math.min(255, data[i] + noise));
                    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
                    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);
    }

    triggerArtifact(type, intensity, duration) {
        switch (type) {
            case 'tracking':
                this.trackingError = intensity;
                setTimeout(() => { this.trackingError *= 0.5; }, duration);
                break;
            case 'colorBleed':
                this.colorBleed = intensity;
                setTimeout(() => { this.colorBleed = 0; }, duration);
                break;
            case 'headSwitch':
                this.headSwitchNoise = intensity;
                setTimeout(() => { this.headSwitchNoise = 0; }, duration);
                break;
            case 'wobble':
                this.tapeWobble = intensity;
                setTimeout(() => { this.tapeWobble *= 0.3; }, duration);
                break;
        }
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }

    reset() {
        this.trackingError = 0;
        this.colorBleed = 0;
        this.headSwitchNoise = 0;
        this.tapeWobble = 0;
        this.noiseAmount = 0;
    }
}

export const vhs = new VHSEffect();
export default vhs;
