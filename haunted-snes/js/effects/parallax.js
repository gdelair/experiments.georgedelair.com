// parallax.js — Multi-layer parallax scrolling with corruption

import state from '../core/state.js';

class ParallaxLayer {
    constructor(config = {}) {
        this.speed = config.speed || 1;
        this.y = config.y || 0;
        this.height = config.height || 100;
        this.color = config.color || '#333';
        this.elements = config.elements || [];
        this.offset = 0;
        this.zIndex = config.zIndex || 0;
        this.corrupted = false;
        this.corruptSpeed = 0;
    }
}

class ParallaxSystem {
    constructor() {
        this.layers = [];
        this.scrollX = 0;
        this.scrollSpeed = 0;
        this.corruptionLevel = 0;
    }

    createLayers(config) {
        this.layers = [];
        for (const layerConfig of config) {
            this.layers.push(new ParallaxLayer(layerConfig));
        }
        this.layers.sort((a, b) => a.zIndex - b.zIndex);
    }

    // Pre-built layer sets
    createPlatformerLayers() {
        this.createLayers([
            {
                speed: 0.1, y: 0, height: 180, zIndex: 0,
                color: '#0a0a2a',
                elements: [
                    { type: 'gradient', colors: ['#0a0a2a', '#1a1040'] },
                    { type: 'stars', count: 40, size: 1 }
                ]
            },
            {
                speed: 0.2, y: 120, height: 100, zIndex: 1,
                color: '#1a1a3a',
                elements: [
                    { type: 'mountains', color: '#2a2a4a', peaks: 5 }
                ]
            },
            {
                speed: 0.4, y: 180, height: 80, zIndex: 2,
                color: '#2a3a2a',
                elements: [
                    { type: 'mountains', color: '#3a4a3a', peaks: 8 }
                ]
            },
            {
                speed: 0.6, y: 240, height: 60, zIndex: 3,
                color: '#3a4a3a',
                elements: [
                    { type: 'trees', color: '#2a6a2a', count: 12 }
                ]
            },
            {
                speed: 1.0, y: 300, height: 148, zIndex: 4,
                color: '#4a6a4a',
                elements: [] // Foreground / game layer
            }
        ]);
    }

    createDarkCastleLayers() {
        this.createLayers([
            {
                speed: 0.05, y: 0, height: 200, zIndex: 0,
                color: '#0a0000',
                elements: [
                    { type: 'gradient', colors: ['#1a0000', '#0a0000'] },
                    { type: 'stars', count: 20, size: 1, color: '#ff4444' }
                ]
            },
            {
                speed: 0.15, y: 100, height: 150, zIndex: 1,
                elements: [
                    { type: 'castle', color: '#1a1a1a' }
                ]
            },
            {
                speed: 0.3, y: 200, height: 100, zIndex: 2,
                elements: [
                    { type: 'pillars', color: '#2a2a2a', count: 6 }
                ]
            },
            {
                speed: 1.0, y: 300, height: 148, zIndex: 3,
                elements: []
            }
        ]);
    }

    update(dt, speed = 1) {
        this.scrollSpeed = speed;
        this.scrollX += speed * dt / 16;

        for (const layer of this.layers) {
            let effectiveSpeed = layer.speed;

            // Corruption: wrong scroll speeds
            if (this.corruptionLevel > 0.3 && layer.corrupted) {
                effectiveSpeed = layer.corruptSpeed || -layer.speed;
            }

            layer.offset = this.scrollX * effectiveSpeed;
        }
    }

    render(ctx, width, height) {
        for (const layer of this.layers) {
            this.renderLayer(ctx, layer, width, height);
        }
    }

    renderLayer(ctx, layer, width, height) {
        const offset = layer.offset % width;

        // Background fill
        if (layer.color) {
            ctx.fillStyle = layer.color;
            ctx.fillRect(0, layer.y, width, layer.height);
        }

        // Render elements
        for (const el of layer.elements) {
            switch (el.type) {
                case 'gradient':
                    this.renderGradient(ctx, layer, el, width);
                    break;
                case 'stars':
                    this.renderStars(ctx, layer, el, width, offset);
                    break;
                case 'mountains':
                    this.renderMountains(ctx, layer, el, width, offset);
                    break;
                case 'trees':
                    this.renderTrees(ctx, layer, el, width, offset);
                    break;
                case 'castle':
                    this.renderCastle(ctx, layer, el, width, offset);
                    break;
                case 'pillars':
                    this.renderPillars(ctx, layer, el, width, offset);
                    break;
            }
        }

        // Corruption: z-order flip (draw back layers on top)
        if (this.corruptionLevel > 0.5 && Math.random() < this.corruptionLevel * 0.05) {
            ctx.globalAlpha = 0.3;
            // Will be drawn over by later layers, creating ghosting
            ctx.globalAlpha = 1;
        }
    }

    renderGradient(ctx, layer, el, width) {
        const grad = ctx.createLinearGradient(0, layer.y, 0, layer.y + layer.height);
        el.colors.forEach((c, i) => {
            grad.addColorStop(i / (el.colors.length - 1), c);
        });
        ctx.fillStyle = grad;
        ctx.fillRect(0, layer.y, width, layer.height);
    }

    renderStars(ctx, layer, el, width, offset) {
        // Use seeded positions
        const color = el.color || '#ffffff';
        for (let i = 0; i < el.count; i++) {
            const seed = i * 7919;
            const x = ((seed * 13 % width) - offset * 0.5 + width * 2) % width;
            const y = layer.y + (seed * 17 % layer.height);
            const size = el.size || 1;
            const twinkle = Math.sin(performance.now() / 500 + seed) * 0.3 + 0.7;

            ctx.globalAlpha = twinkle;
            ctx.fillStyle = color;
            ctx.fillRect(Math.floor(x), Math.floor(y), size, size);
        }
        ctx.globalAlpha = 1;
    }

    renderMountains(ctx, layer, el, width, offset) {
        ctx.fillStyle = el.color;
        ctx.beginPath();
        ctx.moveTo(0, layer.y + layer.height);

        const peaks = el.peaks || 5;
        const segWidth = (width + 200) / peaks;

        for (let i = 0; i <= peaks + 1; i++) {
            const seed = i * 3571;
            const px = i * segWidth - (offset % segWidth);
            const py = layer.y + (seed % (layer.height * 0.6)) + layer.height * 0.2;
            const peakY = layer.y + (seed * 7 % (layer.height * 0.4));

            if (i > 0) {
                const cpx = px - segWidth / 2;
                ctx.quadraticCurveTo(cpx, peakY, px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }

        ctx.lineTo(width + 100, layer.y + layer.height);
        ctx.closePath();
        ctx.fill();
    }

    renderTrees(ctx, layer, el, width, offset) {
        ctx.fillStyle = el.color;
        const count = el.count || 10;
        const spacing = (width + 100) / count;

        for (let i = 0; i < count + 2; i++) {
            const x = (i * spacing - (offset % spacing) + width + spacing) % (width + spacing) - spacing / 2;
            const seed = i * 2713;
            const h = 20 + (seed % 30);
            const w = 10 + (seed * 3 % 15);

            // Trunk
            ctx.fillStyle = '#4a3520';
            ctx.fillRect(x - 2, layer.y + layer.height - h, 4, h);

            // Canopy
            ctx.fillStyle = el.color;
            ctx.beginPath();
            ctx.moveTo(x - w / 2, layer.y + layer.height - h + 5);
            ctx.lineTo(x, layer.y + layer.height - h - 15);
            ctx.lineTo(x + w / 2, layer.y + layer.height - h + 5);
            ctx.closePath();
            ctx.fill();
        }
    }

    renderCastle(ctx, layer, el, width, offset) {
        ctx.fillStyle = el.color;
        const segWidth = 80;
        const numSegs = Math.ceil(width / segWidth) + 2;

        for (let i = 0; i < numSegs; i++) {
            const x = i * segWidth - (offset % segWidth);
            const seed = Math.floor((offset / segWidth + i) * 1000) * 1319;
            const h = 40 + (seed % 60);

            ctx.fillRect(x, layer.y + layer.height - h, segWidth - 5, h);

            // Battlement
            for (let b = 0; b < 3; b++) {
                ctx.fillRect(x + b * 20 + 5, layer.y + layer.height - h - 10, 10, 10);
            }

            // Window
            if (seed % 3 === 0) {
                ctx.fillStyle = '#220000';
                ctx.fillRect(x + segWidth / 2 - 4, layer.y + layer.height - h + 10, 8, 12);
                ctx.fillStyle = el.color;
            }
        }
    }

    renderPillars(ctx, layer, el, width, offset) {
        ctx.fillStyle = el.color;
        const count = el.count || 6;
        const spacing = (width + 100) / count;

        for (let i = 0; i < count + 2; i++) {
            const x = (i * spacing - (offset % spacing) + width + spacing) % (width + spacing) - spacing / 2;
            const h = layer.height;

            ctx.fillRect(x - 8, layer.y, 16, h);
            // Capital
            ctx.fillRect(x - 12, layer.y, 24, 8);
            // Base
            ctx.fillRect(x - 12, layer.y + h - 8, 24, 8);
        }
    }

    setCorruption(level) {
        this.corruptionLevel = level;

        if (level > 0.3) {
            // Randomly corrupt layer speeds
            for (const layer of this.layers) {
                if (Math.random() < level * 0.5) {
                    layer.corrupted = true;
                    layer.corruptSpeed = layer.speed * (Math.random() < 0.5 ? -1 : 2 + Math.random());
                }
            }
        } else {
            for (const layer of this.layers) {
                layer.corrupted = false;
            }
        }
    }

    reset() {
        this.scrollX = 0;
        this.corruptionLevel = 0;
        this.layers = [];
    }
}

export const parallax = new ParallaxSystem();
export default parallax;
