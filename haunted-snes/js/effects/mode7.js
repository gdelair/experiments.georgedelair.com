// mode7.js — Rotation/scaling/perspective transforms (SNES Mode 7)

import state from '../core/state.js';

class Mode7 {
    constructor() {
        this.enabled = false;
        this.horizon = 0.35;
        this.fov = 256;
        this.cameraX = 0;
        this.cameraY = 0;
        this.cameraZ = 64;
        this.angle = 0;
        this.scaleX = 1;
        this.scaleY = 1;
        this.scrollX = 0;
        this.scrollY = 0;

        this.sourceCanvas = null;
        this.sourceCtx = null;
    }

    init(width, height) {
        this.sourceCanvas = document.createElement('canvas');
        this.sourceCanvas.width = width || 512;
        this.sourceCanvas.height = height || 512;
        this.sourceCtx = this.sourceCanvas.getContext('2d');
        this.sourceCtx.imageSmoothingEnabled = false;
    }

    getSourceContext() {
        return this.sourceCtx;
    }

    // Render Mode 7 perspective transformation
    render(ctx, width, height, options = {}) {
        if (!this.sourceCanvas) return;

        const {
            horizon = this.horizon,
            fov = this.fov,
            camX = this.cameraX,
            camY = this.cameraY,
            camZ = this.cameraZ,
            angle = this.angle,
            corruption = 0
        } = options;

        const horizonY = Math.floor(height * horizon);
        const sourceData = this.sourceCtx.getImageData(
            0, 0, this.sourceCanvas.width, this.sourceCanvas.height
        );
        const destData = ctx.getImageData(0, 0, width, height);
        const src = sourceData.data;
        const dst = destData.data;
        const sw = this.sourceCanvas.width;
        const sh = this.sourceCanvas.height;

        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        // Render each scanline below horizon
        for (let screenY = horizonY; screenY < height; screenY++) {
            const py = screenY - horizonY;
            if (py <= 0) continue;

            // Perspective: farther rows = more compressed
            const perspScale = camZ / py;

            // Corruption: distort perspective per-scanline
            let corruptOffset = 0;
            if (corruption > 0 && Math.random() < corruption * 0.3) {
                corruptOffset = (Math.random() - 0.5) * corruption * 20;
            }

            for (let screenX = 0; screenX < width; screenX++) {
                // Map screen coords to world space
                const dx = (screenX - width / 2 + corruptOffset) * perspScale / fov;
                const dy = py * perspScale / fov;

                // Rotate
                const worldX = dx * cosA - dy * sinA + camX;
                const worldY = dx * sinA + dy * cosA + camY;

                // Map to source texture (wrapping)
                let srcX = ((Math.floor(worldX) % sw) + sw) % sw;
                let srcY = ((Math.floor(worldY) % sh) + sh) % sh;

                const si = (srcY * sw + srcX) * 4;
                const di = (screenY * width + screenX) * 4;

                // Distance fog
                const fogFactor = Math.min(1, py / (height * 0.6));
                const fog = 1 - fogFactor * 0.5;

                dst[di] = src[si] * fog;
                dst[di + 1] = src[si + 1] * fog;
                dst[di + 2] = src[si + 2] * fog;
                dst[di + 3] = 255;
            }
        }

        ctx.putImageData(destData, 0, 0);
    }

    // Render a simpler "flat rotation" Mode 7 (like world map)
    renderFlat(ctx, width, height, options = {}) {
        if (!this.sourceCanvas) return;

        const {
            centerX = width / 2,
            centerY = height / 2,
            angle = this.angle,
            scaleX = this.scaleX,
            scaleY = this.scaleY,
            scrollX = this.scrollX,
            scrollY = this.scrollY
        } = options;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle);
        ctx.scale(scaleX, scaleY);
        ctx.drawImage(
            this.sourceCanvas,
            -this.sourceCanvas.width / 2 + scrollX,
            -this.sourceCanvas.height / 2 + scrollY
        );
        ctx.restore();
    }

    // Generate a checkerboard pattern (for F-Zero style tracks)
    generateCheckerboard(colors = ['#333', '#444'], size = 32) {
        const ctx = this.sourceCtx;
        const w = this.sourceCanvas.width;
        const h = this.sourceCanvas.height;

        for (let y = 0; y < h; y += size) {
            for (let x = 0; x < w; x += size) {
                const checker = ((x / size) + (y / size)) % 2;
                ctx.fillStyle = colors[checker];
                ctx.fillRect(x, y, size, size);
            }
        }
    }

    // Generate a road/track pattern
    generateTrack(options = {}) {
        const {
            roadColor = '#555',
            lineColor = '#ff0',
            grassColor = '#2a5a2a',
            roadWidth = 200,
            lineWidth = 4
        } = options;

        const ctx = this.sourceCtx;
        const w = this.sourceCanvas.width;
        const h = this.sourceCanvas.height;

        // Grass
        ctx.fillStyle = grassColor;
        ctx.fillRect(0, 0, w, h);

        // Road
        const roadLeft = (w - roadWidth) / 2;
        ctx.fillStyle = roadColor;
        ctx.fillRect(roadLeft, 0, roadWidth, h);

        // Center line (dashed)
        ctx.fillStyle = lineColor;
        for (let y = 0; y < h; y += 32) {
            ctx.fillRect(w / 2 - lineWidth / 2, y, lineWidth, 16);
        }

        // Road edges
        ctx.fillStyle = '#fff';
        ctx.fillRect(roadLeft, 0, 3, h);
        ctx.fillRect(roadLeft + roadWidth - 3, 0, 3, h);
    }

    // Update camera
    setCamera(x, y, z, angle) {
        if (x !== undefined) this.cameraX = x;
        if (y !== undefined) this.cameraY = y;
        if (z !== undefined) this.cameraZ = z;
        if (angle !== undefined) this.angle = angle;
    }

    reset() {
        this.cameraX = 0;
        this.cameraY = 0;
        this.cameraZ = 64;
        this.angle = 0;
        this.scaleX = 1;
        this.scaleY = 1;
    }
}

export const mode7 = new Mode7();
export default mode7;
