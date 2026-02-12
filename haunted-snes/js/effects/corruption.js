// corruption.js — Pixel sort, datamosh, palette corrupt, ghost frames

import { events, EVENTS } from '../core/events.js';
import state from '../core/state.js';

class CorruptionEngine {
    constructor() {
        this.enabled = true;
        this.intensity = 0;
        this.effects = {
            pixelSort: false,
            datamosh: false,
            paletteCorrupt: false,
            tileSwap: false,
            transparencyGlitch: false,
            ghostFrames: false
        };

        this.prevFrames = [];
        this.maxPrevFrames = 5;
        this.glitchQueue = [];
        this.sortDirection = 0;
    }

    init() {
        events.on(EVENTS.CORRUPTION_START, (data) => {
            this.setIntensity(data.intensity || 0.5);
        });

        events.on(EVENTS.CORRUPTION_END, () => {
            this.setIntensity(0);
        });

        events.on(EVENTS.HAUNT_STAGE_CHANGE, (data) => {
            this.adjustForHauntStage(data.stage);
        });
    }

    setIntensity(level) {
        this.intensity = Math.max(0, Math.min(1, level));
        state.set('corruptionLevel', this.intensity);

        // Activate effects based on intensity
        this.effects.pixelSort = this.intensity > 0.1;
        this.effects.paletteCorrupt = this.intensity > 0.2;
        this.effects.ghostFrames = this.intensity > 0.3;
        this.effects.tileSwap = this.intensity > 0.5;
        this.effects.transparencyGlitch = this.intensity > 0.6;
        this.effects.datamosh = this.intensity > 0.7;
    }

    process(ctx, width, height, dt, timestamp) {
        if (!this.enabled || this.intensity <= 0) return;

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Store frame for datamosh/ghost
        if (this.effects.datamosh || this.effects.ghostFrames) {
            this.prevFrames.push(new Uint8ClampedArray(data));
            if (this.prevFrames.length > this.maxPrevFrames) {
                this.prevFrames.shift();
            }
        }

        // Pixel sorting (sort pixels by brightness in random rows)
        if (this.effects.pixelSort && Math.random() < this.intensity * 0.3) {
            this.applyPixelSort(data, width, height);
        }

        // Palette corruption (swap color channels)
        if (this.effects.paletteCorrupt && Math.random() < this.intensity * 0.2) {
            this.applyPaletteCorrupt(data, width, height);
        }

        // Ghost frames (blend old frames)
        if (this.effects.ghostFrames && this.prevFrames.length > 2) {
            this.applyGhostFrames(data);
        }

        // Tile swap (swap rectangular regions)
        if (this.effects.tileSwap && Math.random() < this.intensity * 0.15) {
            this.applyTileSwap(data, width, height);
        }

        // Transparency glitch (random alpha)
        if (this.effects.transparencyGlitch && Math.random() < this.intensity * 0.1) {
            this.applyTransparencyGlitch(data, width, height);
        }

        // Datamosh (freeze/repeat regions from old frames)
        if (this.effects.datamosh && this.prevFrames.length > 1 && Math.random() < this.intensity * 0.1) {
            this.applyDatamosh(data, width, height);
        }

        ctx.putImageData(imageData, 0, 0);

        // Process queued one-shot glitches
        this.processGlitchQueue(ctx, width, height, timestamp);
    }

    applyPixelSort(data, width, height) {
        const numRows = Math.floor(this.intensity * 15) + 1;
        this.sortDirection = (this.sortDirection + 1) % 3;

        for (let r = 0; r < numRows; r++) {
            const y = Math.floor(Math.random() * height);
            const startX = Math.floor(Math.random() * width * 0.5);
            const endX = Math.min(startX + Math.floor(Math.random() * width * 0.5) + 20, width);

            // Collect pixel brightness values
            const pixels = [];
            for (let x = startX; x < endX; x++) {
                const i = (y * width + x) * 4;
                pixels.push({
                    r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3],
                    brightness: data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
                });
            }

            // Sort by brightness
            pixels.sort((a, b) => a.brightness - b.brightness);

            // Write back
            for (let x = startX; x < endX; x++) {
                const i = (y * width + x) * 4;
                const p = pixels[x - startX];
                data[i] = p.r;
                data[i + 1] = p.g;
                data[i + 2] = p.b;
            }
        }
    }

    applyPaletteCorrupt(data, width, height) {
        const corruption = Math.random();
        const startY = Math.floor(Math.random() * height);
        const bandHeight = Math.floor(Math.random() * 40) + 10;

        for (let y = startY; y < Math.min(startY + bandHeight, height); y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                if (corruption < 0.33) {
                    // Swap R and B
                    const tmp = data[i];
                    data[i] = data[i + 2];
                    data[i + 2] = tmp;
                } else if (corruption < 0.66) {
                    // Shift all channels
                    const tmp = data[i];
                    data[i] = data[i + 1];
                    data[i + 1] = data[i + 2];
                    data[i + 2] = tmp;
                } else {
                    // Invert
                    data[i] = 255 - data[i];
                    data[i + 1] = 255 - data[i + 1];
                    data[i + 2] = 255 - data[i + 2];
                }
            }
        }
    }

    applyGhostFrames(data) {
        const oldFrame = this.prevFrames[Math.floor(Math.random() * this.prevFrames.length)];
        const blend = this.intensity * 0.2;

        for (let i = 0; i < data.length; i += 4) {
            data[i] = data[i] * (1 - blend) + oldFrame[i] * blend;
            data[i + 1] = data[i + 1] * (1 - blend) + oldFrame[i + 1] * blend;
            data[i + 2] = data[i + 2] * (1 - blend) + oldFrame[i + 2] * blend;
        }
    }

    applyTileSwap(data, width, height) {
        const tileSize = 16 * (1 + Math.floor(Math.random() * 3));
        const x1 = Math.floor(Math.random() * (width - tileSize));
        const y1 = Math.floor(Math.random() * (height - tileSize));
        const x2 = Math.floor(Math.random() * (width - tileSize));
        const y2 = Math.floor(Math.random() * (height - tileSize));

        for (let dy = 0; dy < tileSize; dy++) {
            for (let dx = 0; dx < tileSize; dx++) {
                const i1 = ((y1 + dy) * width + (x1 + dx)) * 4;
                const i2 = ((y2 + dy) * width + (x2 + dx)) * 4;

                for (let c = 0; c < 4; c++) {
                    const tmp = data[i1 + c];
                    data[i1 + c] = data[i2 + c];
                    data[i2 + c] = tmp;
                }
            }
        }
    }

    applyTransparencyGlitch(data, width, height) {
        const startY = Math.floor(Math.random() * height);
        const bandHeight = Math.floor(Math.random() * 20) + 5;

        for (let y = startY; y < Math.min(startY + bandHeight, height); y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                data[i + 3] = Math.floor(Math.random() * 128) + 128;
            }
        }
    }

    applyDatamosh(data, width, height) {
        if (this.prevFrames.length < 2) return;

        const oldFrame = this.prevFrames[0];
        const blockSize = 32;
        const bx = Math.floor(Math.random() * (width / blockSize)) * blockSize;
        const by = Math.floor(Math.random() * (height / blockSize)) * blockSize;

        for (let y = by; y < Math.min(by + blockSize * 2, height); y++) {
            for (let x = bx; x < Math.min(bx + blockSize * 3, width); x++) {
                const i = (y * width + x) * 4;
                data[i] = oldFrame[i];
                data[i + 1] = oldFrame[i + 1];
                data[i + 2] = oldFrame[i + 2];
            }
        }
    }

    // One-shot glitch effects
    queueGlitch(type, params = {}) {
        this.glitchQueue.push({ type, params, time: performance.now() });
    }

    processGlitchQueue(ctx, width, height, timestamp) {
        const expired = [];
        for (let i = 0; i < this.glitchQueue.length; i++) {
            const g = this.glitchQueue[i];
            if (timestamp - g.time > (g.params.duration || 500)) {
                expired.push(i);
                continue;
            }

            switch (g.type) {
                case 'horizontalTear':
                    this.drawHorizontalTear(ctx, width, height, g.params);
                    break;
                case 'colorFlash':
                    this.drawColorFlash(ctx, width, height, g.params);
                    break;
                case 'screenShift':
                    this.drawScreenShift(ctx, width, height, g.params);
                    break;
            }
        }
        for (let i = expired.length - 1; i >= 0; i--) {
            this.glitchQueue.splice(expired[i], 1);
        }
    }

    drawHorizontalTear(ctx, width, height, params) {
        const y = params.y || Math.floor(Math.random() * height);
        const h = params.height || 3;
        const offset = params.offset || Math.floor((Math.random() - 0.5) * 20);
        const strip = ctx.getImageData(0, y, width, h);
        ctx.putImageData(strip, offset, y);
    }

    drawColorFlash(ctx, width, height, params) {
        ctx.fillStyle = params.color || 'rgba(255,0,0,0.1)';
        ctx.fillRect(0, 0, width, height);
    }

    drawScreenShift(ctx, width, height, params) {
        const img = ctx.getImageData(0, 0, width, height);
        const dx = params.dx || Math.floor((Math.random() - 0.5) * 10);
        const dy = params.dy || Math.floor((Math.random() - 0.5) * 10);
        ctx.putImageData(img, dx, dy);
    }

    adjustForHauntStage(stage) {
        switch (stage) {
            case 0:
                this.setIntensity(0);
                break;
            case 1:
                this.setIntensity(0.05);
                break;
            case 2:
                this.setIntensity(0.15);
                break;
            case 3:
                this.setIntensity(0.35);
                break;
            case 4:
                this.setIntensity(0.6);
                break;
        }
    }

    reset() {
        this.setIntensity(0);
        this.prevFrames = [];
        this.glitchQueue = [];
    }
}

export const corruption = new CorruptionEngine();
export default corruption;
