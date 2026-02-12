// renderer.js — Single RAF loop with layer compositing

import { events, EVENTS } from './events.js';
import state from './state.js';
import input from './input.js';

class Renderer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.offscreen = null;
        this.offCtx = null;
        this.width = 512;
        this.height = 448;
        this.running = false;
        this.rafId = null;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.fps = 0;
        this.fpsSmooth = 60;
        this.frameCount = 0;

        // Layer system
        this.layers = [];
        this.postProcessors = [];

        // Performance
        this.targetFPS = 60;
        this.frameInterval = 1000 / 60;
        this.accumulator = 0;
    }

    init() {
        this.canvas = document.getElementById('game-canvas');
        if (!this.canvas) {
            console.error('[Renderer] Canvas not found');
            return;
        }

        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        // Offscreen buffer for games to draw to
        this.offscreen = document.createElement('canvas');
        this.offscreen.width = this.width;
        this.offscreen.height = this.height;
        this.offCtx = this.offscreen.getContext('2d');
        this.offCtx.imageSmoothingEnabled = false;
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();
        this.loop(this.lastTime);
    }

    stop() {
        this.running = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    loop(timestamp) {
        if (!this.running) return;
        this.rafId = requestAnimationFrame(this.loop.bind(this));

        this.deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        // FPS calc
        if (this.deltaTime > 0) {
            this.fps = 1000 / this.deltaTime;
            this.fpsSmooth = this.fpsSmooth * 0.9 + this.fps * 0.1;
        }

        this.frameCount++;
        state.set('frameCount', this.frameCount);

        // Pre-render event
        events.emit(EVENTS.RENDER_PRE, {
            dt: this.deltaTime,
            time: timestamp,
            frame: this.frameCount
        });

        // Process ghost inputs
        input.processGhostInputs(timestamp);

        // Clear offscreen
        this.offCtx.clearRect(0, 0, this.width, this.height);

        // Render layers (game, UI overlays)
        for (const layer of this.layers) {
            if (layer.visible !== false) {
                try {
                    layer.render(this.offCtx, this.deltaTime, timestamp);
                } catch (e) {
                    console.error(`[Renderer] Layer error:`, e);
                }
            }
        }

        // Composite to main canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.drawImage(this.offscreen, 0, 0);

        // Post-processing (CRT, corruption, etc.)
        for (const pp of this.postProcessors) {
            if (pp.enabled !== false) {
                try {
                    pp.process(this.ctx, this.width, this.height, this.deltaTime, timestamp);
                } catch (e) {
                    console.error(`[Renderer] Post-processor error:`, e);
                }
            }
        }

        // Frame event
        events.emit(EVENTS.RENDER_FRAME, {
            dt: this.deltaTime,
            time: timestamp,
            frame: this.frameCount,
            fps: Math.round(this.fpsSmooth)
        });

        // Clear just-pressed states
        input.clearFrameState();
    }

    addLayer(layer, zIndex = 0) {
        layer.zIndex = zIndex;
        this.layers.push(layer);
        this.layers.sort((a, b) => a.zIndex - b.zIndex);
    }

    removeLayer(layer) {
        const idx = this.layers.indexOf(layer);
        if (idx !== -1) this.layers.splice(idx, 1);
    }

    addPostProcessor(processor) {
        this.postProcessors.push(processor);
    }

    removePostProcessor(processor) {
        const idx = this.postProcessors.indexOf(processor);
        if (idx !== -1) this.postProcessors.splice(idx, 1);
    }

    // Helper: fill screen with color
    fill(ctx, color) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, this.width, this.height);
    }

    // Helper: draw text with SNES-style font
    drawText(ctx, text, x, y, options = {}) {
        const {
            size = 16,
            color = '#fff',
            align = 'left',
            font = 'monospace',
            shadow = false,
            shadowColor = '#000'
        } = options;

        ctx.font = `${size}px ${font}`;
        ctx.textAlign = align;

        if (shadow) {
            ctx.fillStyle = shadowColor;
            ctx.fillText(text, x + 1, y + 1);
        }

        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
    }

    // Get canvas for screenshots / corruption
    getImageData() {
        return this.ctx.getImageData(0, 0, this.width, this.height);
    }

    putImageData(data) {
        this.ctx.putImageData(data, 0, 0);
    }

    getContext() {
        return this.offCtx;
    }

    getMainContext() {
        return this.ctx;
    }

    getDimensions() {
        return { width: this.width, height: this.height };
    }
}

export const renderer = new Renderer();
export default renderer;
