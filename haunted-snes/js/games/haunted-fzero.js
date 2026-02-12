// haunted-fzero.js — Pseudo-3D racing game with haunting corruption
// Mode 7 style road rendering with ghost racers and track warps

import { GameBase } from './game-base.js';
import { input, BUTTONS } from '../core/input.js';
import { sfx } from '../audio/sfx.js';
import state from '../core/state.js';
import { events, EVENTS } from '../core/events.js';

// Physics constants
const MAX_SPEED = 320;
const ACCEL = 180;
const BRAKE_FORCE = 260;
const DRAG = 0.97;
const STEER_SPEED = 3.0;
const STEER_RETURN = 2.0;
const CENTRIFUGAL = 0.35;
const ROAD_WIDTH = 2200;
const SEGMENT_LENGTH = 200;
const RUMBLE_LENGTH = 3;
const TOTAL_SEGMENTS = 600;
const DRAW_DISTANCE = 150;

// Colors
const SKY_TOP = '#000030';
const SKY_BOTTOM = '#000818';

export class HauntedFZero extends GameBase {
    constructor() {
        super({
            id: 'fzero',
            name: 'HAUNTED F-ZERO',
            channel: 5,
            titleColor: '#00ccff',
            bgColor: '#000020',
            titleText: 'HAUNTED F-ZERO'
        });

        // Player state
        this.playerX = 0;           // -1 to 1 (left to right on road)
        this.speed = 0;
        this.position = 0;          // track position (z distance)
        this.steer = 0;

        // Track
        this.segments = [];
        this.trackLength = 0;

        // Rival racers
        this.rivals = [];

        // Ghost racers (haunting)
        this.ghostRacers = [];

        // Lap tracking
        this.lap = 1;
        this.maxLaps = 3;
        this.lapStartPosition = 0;
        this.raceTimer = 0;
        this.raceFinished = false;
        this.bestLapTime = Infinity;
        this.lapTimes = [];
        this.currentLapTime = 0;

        // Boost
        this.boostEnergy = 100;
        this.boostActive = false;
        this.boostCooldown = 0;

        // Effects
        this.shakeX = 0;
        this.shakeY = 0;
        this.speedLines = [];
        this.noFinishLineShown = false;
        this.trackWarpTimer = 0;
        this.textureCorruptionPhase = 0;
    }

    onInit() {
        this.buildTrack();
        this.resetRace();
    }

    onStart() {
        this.buildTrack();
        this.resetRace();
    }

    onStop() {
        this.clearTimers();
    }

    onRestart() {
        this.buildTrack();
        this.resetRace();
    }

    onDeath() {
        this.speed = 0;
        this.boostEnergy = 50;
    }

    onTitleDismiss() {
        sfx.play('confirm');
    }

    buildTrack() {
        this.segments = [];

        for (let i = 0; i < TOTAL_SEGMENTS; i++) {
            const curve = this.getTrackCurve(i);
            const hill = this.getTrackHill(i);

            this.segments.push({
                index: i,
                curve: curve,
                y: hill,
                sprite: null,
                color: null
            });
        }

        this.trackLength = TOTAL_SEGMENTS * SEGMENT_LENGTH;

        // Place rival racers
        this.rivals = [];
        for (let r = 0; r < 5; r++) {
            this.rivals.push({
                offset: (Math.random() - 0.5) * 1.4,
                z: 300 + r * 400 + Math.random() * 200,
                speed: 160 + Math.random() * 80,
                color: this.getRivalColor(r),
                width: 60,
                height: 30,
                active: true
            });
        }
    }

    getTrackCurve(index) {
        // Varied curves along the track
        if (index > 50 && index < 80) return Math.sin((index - 50) / 30 * Math.PI) * 3;
        if (index > 120 && index < 160) return -Math.sin((index - 120) / 40 * Math.PI) * 4;
        if (index > 200 && index < 250) return Math.sin((index - 200) / 50 * Math.PI) * 2.5;
        if (index > 320 && index < 380) return -Math.cos((index - 320) / 60 * Math.PI) * 5;
        if (index > 420 && index < 470) return Math.sin((index - 420) / 25 * Math.PI) * 3.5;
        if (index > 500 && index < 560) return -Math.sin((index - 500) / 60 * Math.PI) * 2;
        return 0;
    }

    getTrackHill(index) {
        // Rolling hills
        return Math.sin(index * 0.02) * 1500 + Math.sin(index * 0.05) * 800;
    }

    getRivalColor(index) {
        const colors = ['#ff3333', '#33ff33', '#ff9900', '#cc33ff', '#33ccff'];
        return colors[index % colors.length];
    }

    resetRace() {
        this.playerX = 0;
        this.speed = 0;
        this.position = 0;
        this.steer = 0;
        this.lap = 1;
        this.raceTimer = 0;
        this.raceFinished = false;
        this.lapTimes = [];
        this.currentLapTime = 0;
        this.bestLapTime = Infinity;
        this.boostEnergy = 100;
        this.boostActive = false;
        this.boostCooldown = 0;
        this.shakeX = 0;
        this.shakeY = 0;
        this.speedLines = [];
        this.noFinishLineShown = false;
        this.trackWarpTimer = 0;
        this.textureCorruptionPhase = 0;
        this.ghostRacers = [];
        this.score = 0;

        // Reset rivals
        for (let r = 0; r < this.rivals.length; r++) {
            this.rivals[r].z = 300 + r * 400 + Math.random() * 200;
            this.rivals[r].active = true;
        }
    }

    onUpdate(dt, timestamp) {
        if (this.raceFinished) return;

        const dtSec = dt / 1000;
        this.updateTimers(dt);
        this.raceTimer += dtSec;
        this.currentLapTime += dtSec;
        this.textureCorruptionPhase += dtSec;

        // --- Input ---
        const dpad = input.getDPad();

        // Steering
        if (dpad.x !== 0) {
            this.steer += dpad.x * STEER_SPEED * dtSec;
        } else {
            // Return to center
            if (Math.abs(this.steer) > 0.01) {
                this.steer -= Math.sign(this.steer) * STEER_RETURN * dtSec;
            } else {
                this.steer = 0;
            }
        }
        this.steer = Math.max(-1, Math.min(1, this.steer));

        // Accelerate (B)
        if (input.isPressed(BUTTONS.B)) {
            this.speed += ACCEL * dtSec;
        }

        // Brake (Y)
        if (input.isPressed(BUTTONS.Y)) {
            this.speed -= BRAKE_FORCE * dtSec;
        }

        // Boost (A)
        if (input.isJustPressed(BUTTONS.A) && this.boostEnergy > 20 && this.boostCooldown <= 0) {
            this.boostActive = true;
            this.boostCooldown = 0.5;
            sfx.play('boost');
        }

        if (this.boostActive) {
            this.speed += ACCEL * 3 * dtSec;
            this.boostEnergy -= 40 * dtSec;
            if (this.boostEnergy <= 0) {
                this.boostEnergy = 0;
                this.boostActive = false;
            }
        } else {
            this.boostEnergy = Math.min(100, this.boostEnergy + 8 * dtSec);
        }
        this.boostCooldown = Math.max(0, this.boostCooldown - dtSec);

        // Drag
        this.speed *= DRAG;
        this.speed = Math.max(0, Math.min(MAX_SPEED, this.speed));

        // Off-road penalty
        if (Math.abs(this.playerX) > 0.8) {
            this.speed *= 0.96;
            this.shakeX = (Math.random() - 0.5) * 4;
            this.shakeY = (Math.random() - 0.5) * 2;
        } else {
            this.shakeX *= 0.8;
            this.shakeY *= 0.8;
        }

        // Track position
        const prevPosition = this.position;
        this.position += this.speed * dtSec;

        // Current segment for curve influence
        const segIndex = Math.floor(this.position / SEGMENT_LENGTH) % TOTAL_SEGMENTS;
        const seg = this.segments[segIndex];
        if (seg) {
            // Apply curve centrifugal force
            this.playerX += seg.curve * CENTRIFUGAL * (this.speed / MAX_SPEED) * dtSec;
        }

        // Apply steering
        this.playerX += this.steer * (this.speed / MAX_SPEED) * 2.5 * dtSec;
        this.playerX = Math.max(-2.5, Math.min(2.5, this.playerX));

        // Crash into walls
        if (Math.abs(this.playerX) > 2.0) {
            this.speed *= 0.5;
            this.playerX = Math.sign(this.playerX) * 2.0;
            sfx.play('damage');
            this.shakeX = (Math.random() - 0.5) * 10;
            this.shakeY = (Math.random() - 0.5) * 6;
        }

        // --- Lap detection ---
        if (this.position >= this.trackLength) {
            this.position -= this.trackLength;
            this.lapTimes.push(this.currentLapTime);
            if (this.currentLapTime < this.bestLapTime) {
                this.bestLapTime = this.currentLapTime;
            }
            this.currentLapTime = 0;
            this.lap++;

            // Haunting: no finish line at stage 3+
            if (this.hauntStage >= 3) {
                this.maxLaps = this.maxLaps + 1; // Race never ends
                if (!this.noFinishLineShown) {
                    this.noFinishLineShown = true;
                    sfx.play('glitch');
                }
            }

            if (this.lap > this.maxLaps && this.hauntStage < 3) {
                this.raceFinished = true;
                this.addScore(Math.floor(10000 / this.raceTimer));
                sfx.play('levelUp');
            }
        }

        // --- Update rivals ---
        this.updateRivals(dtSec);

        // --- Ghost racers (haunting) ---
        if (this.hauntStage >= 2) {
            this.updateGhostRacers(dtSec, timestamp);
        }

        // --- Track warp (haunting) ---
        if (this.hauntStage >= 2) {
            this.trackWarpTimer += dtSec;
        }

        // --- Speed lines ---
        if (this.speed > MAX_SPEED * 0.6) {
            this.speedLines.push({
                x: Math.random() * this.width,
                y: 0,
                length: 20 + Math.random() * 40,
                speed: this.speed * 2,
                life: 0.5
            });
        }
        for (const sl of this.speedLines) {
            sl.y += sl.speed * dtSec;
            sl.life -= dtSec;
        }
        this.speedLines = this.speedLines.filter(sl => sl.life > 0 && sl.y < this.height);

        // Score
        this.score = Math.floor(this.position / 10);
    }

    updateRivals(dtSec) {
        for (const rival of this.rivals) {
            if (!rival.active) continue;
            rival.z += rival.speed * dtSec;
            if (rival.z >= this.trackLength) rival.z -= this.trackLength;

            // Wobble sideways
            rival.offset += (Math.random() - 0.5) * 0.3 * dtSec;
            rival.offset = Math.max(-1.2, Math.min(1.2, rival.offset));
        }
    }

    updateGhostRacers(dtSec, timestamp) {
        // Spawn ghost racers periodically
        if (this.ghostRacers.length < 3 && Math.random() < 0.003 * this.hauntStage) {
            this.ghostRacers.push({
                offset: (Math.random() - 0.5) * 1.0,
                z: this.position + 1000 + Math.random() * 2000,
                speed: this.speed * (0.8 + Math.random() * 0.4),
                alpha: 0.3 + this.corruptionLevel * 0.4,
                color: '#ff0066',
                width: 65,
                height: 32,
                flicker: 0
            });
        }

        for (const ghost of this.ghostRacers) {
            ghost.z += ghost.speed * dtSec;
            ghost.flicker += dtSec * 10;
            ghost.alpha = 0.2 + Math.sin(ghost.flicker) * 0.15;
            if (ghost.z >= this.trackLength) ghost.z -= this.trackLength;
        }
    }

    // ==================== RENDERING ====================

    onRender(ctx, dt, timestamp) {
        // --- Sky ---
        this.renderSky(ctx, timestamp);

        // --- Road (pseudo-3D) ---
        this.renderRoad(ctx, timestamp);

        // --- Speed lines ---
        this.renderSpeedLines(ctx);

        // --- Player car ---
        this.renderPlayerCar(ctx, timestamp);

        // --- HUD ---
        this.renderRacingHUD(ctx, timestamp);

        // --- Haunting overlays ---
        this.renderHauntingOverlays(ctx, timestamp);
    }

    renderSky(ctx, timestamp) {
        const grad = ctx.createLinearGradient(0, 0, 0, this.height * 0.45);
        if (this.hauntStage >= 3) {
            grad.addColorStop(0, '#1a0000');
            grad.addColorStop(1, '#200010');
        } else {
            grad.addColorStop(0, SKY_TOP);
            grad.addColorStop(1, SKY_BOTTOM);
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height * 0.45);

        // Stars
        for (let i = 0; i < 40; i++) {
            const seed = i * 7919;
            const sx = (Math.sin(seed) * 43758.5453) % 1 * this.width;
            const sy = (Math.sin(seed * 2) * 43758.5453) % 1 * this.height * 0.35;
            const twinkle = Math.sin(timestamp / 600 + seed) * 0.3 + 0.7;
            ctx.globalAlpha = Math.abs(twinkle);
            ctx.fillStyle = '#fff';
            ctx.fillRect(Math.abs(sx), Math.abs(sy), 1.5, 1.5);
        }
        ctx.globalAlpha = 1;
    }

    renderRoad(ctx, timestamp) {
        const baseSegIdx = Math.floor(this.position / SEGMENT_LENGTH);
        const basePercent = (this.position % SEGMENT_LENGTH) / SEGMENT_LENGTH;
        const playerY = this.height * 0.72;

        let x = this.width / 2;
        let dx = 0;
        let maxY = this.height;

        const camHeight = 1200;
        const playerSegY = this.segments[baseSegIdx % TOTAL_SEGMENTS]?.y || 0;

        for (let n = 0; n < DRAW_DISTANCE; n++) {
            const segIdx = (baseSegIdx + n) % TOTAL_SEGMENTS;
            const seg = this.segments[segIdx];
            if (!seg) continue;

            // Project to screen
            const camDist = (n - basePercent) * SEGMENT_LENGTH;
            if (camDist <= 0) continue;

            const scale = camHeight / camDist;
            const projY = playerY - (seg.y - playerSegY) * scale;
            const projW = ROAD_WIDTH * scale;

            if (projY >= maxY) continue;

            // Road drawing from bottom up
            const y1 = maxY;
            const y2 = projY;
            const screenX = x + this.shakeX;

            if (y2 < y1) {
                // Track warp corruption
                let warpOffset = 0;
                if (this.hauntStage >= 2 && this.trackWarpTimer > 0) {
                    warpOffset = Math.sin(n * 0.3 + this.trackWarpTimer * 2) * this.corruptionLevel * 40;
                }

                // Determine segment colors (rumble strips alternate)
                const rumble = Math.floor(segIdx / RUMBLE_LENGTH) % 2 === 0;

                // Road surface
                let roadColor = rumble ? '#555' : '#444';
                let grassColor = rumble ? '#1a6a1a' : '#166616';
                let rumbleColor = rumble ? '#cc0000' : '#fff';
                let lineColor = rumble ? '#fff' : '#444';

                // Texture corruption at haunt stage 3+
                if (this.hauntStage >= 3) {
                    const corruptPhase = this.textureCorruptionPhase + n * 0.1;
                    if (Math.sin(corruptPhase * 3) > 0.7) {
                        roadColor = '#330033';
                        grassColor = '#003300';
                    }
                    if (this.corruptionLevel > 0.5 && Math.random() < 0.05) {
                        roadColor = `rgb(${Math.floor(Math.random() * 100)},0,${Math.floor(Math.random() * 100)})`;
                    }
                }

                // Grass
                ctx.fillStyle = grassColor;
                ctx.fillRect(0, y2, this.width, y1 - y2);

                // Road
                const roadW = projW;
                const roadLeft = screenX - roadW / 2 + warpOffset;
                ctx.fillStyle = roadColor;
                ctx.fillRect(roadLeft, y2, roadW, y1 - y2);

                // Rumble strips
                const rumbleW = roadW * 0.05;
                ctx.fillStyle = rumbleColor;
                ctx.fillRect(roadLeft - rumbleW, y2, rumbleW, y1 - y2);
                ctx.fillRect(roadLeft + roadW, y2, rumbleW, y1 - y2);

                // Center line
                if (lineColor !== roadColor) {
                    ctx.fillStyle = lineColor;
                    const lineW = roadW * 0.01;
                    ctx.fillRect(screenX - lineW / 2 + warpOffset, y2, lineW, y1 - y2);
                }

                // Finish line marker
                if (segIdx === 0 || segIdx === 1) {
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(roadLeft, y2, roadW, Math.min(4, y1 - y2));
                    ctx.fillStyle = '#000';
                    const checkerSize = roadW / 10;
                    for (let c = 0; c < 10; c += 2) {
                        ctx.fillRect(roadLeft + c * checkerSize, y2, checkerSize, Math.min(4, y1 - y2));
                    }
                }

                // Draw rivals
                this.renderRivalsAtSegment(ctx, segIdx, screenX + warpOffset, y2, projW, scale, timestamp);
            }

            maxY = y2;
            dx += seg.curve;
            x += dx * scale * 1.5 - this.playerX * projW * 0.15;
        }
    }

    renderRivalsAtSegment(ctx, segIdx, screenX, screenY, projW, scale, timestamp) {
        // Regular rivals
        for (const rival of this.rivals) {
            if (!rival.active) continue;
            const rivalSeg = Math.floor(rival.z / SEGMENT_LENGTH) % TOTAL_SEGMENTS;
            if (rivalSeg !== segIdx) continue;

            const rw = rival.width * scale * 30;
            const rh = rival.height * scale * 30;
            const rx = screenX + rival.offset * projW * 0.4 - rw / 2;

            if (rw < 2) continue;

            // Car body
            ctx.fillStyle = rival.color;
            ctx.fillRect(rx, screenY - rh, rw, rh);
            // Windshield
            ctx.fillStyle = '#111';
            ctx.fillRect(rx + rw * 0.2, screenY - rh * 0.8, rw * 0.6, rh * 0.3);
            // Spoiler
            ctx.fillStyle = rival.color;
            ctx.fillRect(rx - rw * 0.1, screenY - rh * 0.3, rw * 1.2, rh * 0.08);
        }

        // Ghost racers
        for (const ghost of this.ghostRacers) {
            const ghostSeg = Math.floor(ghost.z / SEGMENT_LENGTH) % TOTAL_SEGMENTS;
            if (ghostSeg !== segIdx) continue;

            const rw = ghost.width * scale * 30;
            const rh = ghost.height * scale * 30;
            const rx = screenX + ghost.offset * projW * 0.4 - rw / 2;

            if (rw < 2) continue;

            ctx.globalAlpha = ghost.alpha;
            ctx.fillStyle = ghost.color;
            ctx.fillRect(rx, screenY - rh, rw, rh);
            // Glowing outline
            ctx.strokeStyle = '#ff0066';
            ctx.lineWidth = 1;
            ctx.strokeRect(rx, screenY - rh, rw, rh);
            ctx.globalAlpha = 1;
        }
    }

    renderSpeedLines(ctx) {
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        for (const sl of this.speedLines) {
            ctx.globalAlpha = sl.life * 2;
            ctx.beginPath();
            ctx.moveTo(sl.x, sl.y);
            ctx.lineTo(sl.x, sl.y + sl.length);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    renderPlayerCar(ctx, timestamp) {
        const cx = this.width / 2 + this.steer * 30 + this.shakeX;
        const cy = this.height * 0.78 + this.shakeY;
        const carW = 56;
        const carH = 28;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + carH / 2 + 4, carW * 0.6, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Car body
        ctx.fillStyle = '#0066ff';
        ctx.beginPath();
        ctx.moveTo(cx - carW / 2, cy + carH / 2);
        ctx.lineTo(cx - carW / 2 + 8, cy - carH / 2);
        ctx.lineTo(cx + carW / 2 - 8, cy - carH / 2);
        ctx.lineTo(cx + carW / 2, cy + carH / 2);
        ctx.closePath();
        ctx.fill();

        // Cockpit
        ctx.fillStyle = '#003388';
        ctx.fillRect(cx - 12, cy - carH / 2 + 4, 24, 12);

        // Windshield
        ctx.fillStyle = '#88ccff';
        ctx.fillRect(cx - 8, cy - carH / 2 + 5, 16, 6);

        // Engines (exhaust glow when boosting)
        ctx.fillStyle = this.boostActive ? '#ff6600' : '#333';
        ctx.fillRect(cx - carW / 2 + 4, cy + carH / 2 - 4, 10, 4);
        ctx.fillRect(cx + carW / 2 - 14, cy + carH / 2 - 4, 10, 4);

        // Boost flame
        if (this.boostActive) {
            const flameLen = 10 + Math.random() * 15;
            ctx.fillStyle = '#ff3300';
            ctx.fillRect(cx - carW / 2 + 5, cy + carH / 2, 8, flameLen);
            ctx.fillRect(cx + carW / 2 - 13, cy + carH / 2, 8, flameLen);
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(cx - carW / 2 + 7, cy + carH / 2, 4, flameLen * 0.6);
            ctx.fillRect(cx + carW / 2 - 11, cy + carH / 2, 4, flameLen * 0.6);
        }

        // Steer tilt visual
        if (Math.abs(this.steer) > 0.2) {
            ctx.fillStyle = '#0055cc';
            const tiltDir = Math.sign(this.steer);
            ctx.fillRect(cx + tiltDir * carW / 2 - 3, cy - carH / 4, 6, carH / 2);
        }
    }

    renderRacingHUD(ctx, timestamp) {
        // Speed display
        const speedKMH = Math.floor(this.speed * 3.6);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${speedKMH} km/h`, this.width - 15, this.height - 15);

        // Speed bar
        const barW = 120;
        const barH = 8;
        const barX = this.width - barW - 15;
        const barY = this.height - 35;
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barW, barH);
        const speedPct = this.speed / MAX_SPEED;
        ctx.fillStyle = speedPct > 0.8 ? '#ff3300' : speedPct > 0.5 ? '#ffcc00' : '#00cc66';
        ctx.fillRect(barX, barY, barW * speedPct, barH);

        // Boost energy
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY - 15, barW, barH);
        ctx.fillStyle = this.boostActive ? '#ff6600' : '#00aaff';
        ctx.fillRect(barX, barY - 15, barW * (this.boostEnergy / 100), barH);
        ctx.fillStyle = '#aaa';
        ctx.font = '10px monospace';
        ctx.fillText('BOOST', barX - 5, barY - 7);

        // Lap counter
        ctx.textAlign = 'left';
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px monospace';
        const lapDisplay = this.hauntStage >= 3 && this.noFinishLineShown
            ? `LAP ${this.lap} / ???`
            : `LAP ${this.lap} / ${this.maxLaps}`;
        ctx.fillText(lapDisplay, 15, this.height - 30);

        // Timer
        ctx.font = '12px monospace';
        ctx.fillText(`TIME: ${this.formatTime(this.raceTimer)}`, 15, this.height - 12);

        // Position
        ctx.font = 'bold 20px monospace';
        ctx.fillStyle = '#ffcc00';
        ctx.textAlign = 'center';
        const pos = this.getPlayerPosition();
        const suffix = pos === 1 ? 'ST' : pos === 2 ? 'ND' : pos === 3 ? 'RD' : 'TH';
        ctx.fillText(`${pos}${suffix}`, this.width / 2, 30);

        ctx.textAlign = 'left';
    }

    formatTime(secs) {
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        const ms = Math.floor((secs % 1) * 100);
        return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }

    getPlayerPosition() {
        let pos = 1;
        for (const rival of this.rivals) {
            if (rival.active && rival.z > this.position) pos++;
        }
        return Math.min(pos, 6);
    }

    renderHauntingOverlays(ctx, timestamp) {
        // "NO FINISH LINE" message at stage 3+
        if (this.noFinishLineShown) {
            const alpha = Math.sin(timestamp / 800) * 0.3 + 0.4;
            ctx.fillStyle = `rgba(255, 0, 60, ${alpha})`;
            ctx.font = 'bold 20px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('NO FINISH LINE', this.width / 2, this.height / 2 - 30);
            ctx.font = '12px monospace';
            ctx.fillText('THE RACE NEVER ENDS', this.width / 2, this.height / 2);
            ctx.textAlign = 'left';
        }

        // Road texture corruption visual at stage 3+
        if (this.hauntStage >= 3 && Math.random() < 0.01) {
            const glitchY = Math.random() * this.height * 0.5 + this.height * 0.4;
            const glitchH = 2 + Math.random() * 6;
            const shift = (Math.random() - 0.5) * 40;
            ctx.drawImage(ctx.canvas, shift, glitchY, this.width, glitchH, 0, glitchY, this.width, glitchH);
        }

        // Ghost messages at stage 2+
        if (this.hauntStage >= 2 && Math.random() < 0.001) {
            const msgs = [
                'WRONG WAY',
                'YOU PASSED THIS TURN BEFORE',
                'SPEED WON\'T SAVE YOU',
                'WHO IS IN 0TH PLACE?',
                'LAP -1'
            ];
            const msg = msgs[Math.floor(Math.random() * msgs.length)];
            ctx.fillStyle = `rgba(255, 0, 80, 0.4)`;
            ctx.font = '14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(msg, this.width / 2, this.height * 0.35);
            ctx.textAlign = 'left';
        }

        // Stage 4: visual corruption - scramble road segments
        if (this.hauntStage >= 4) {
            ctx.fillStyle = `rgba(80, 0, 40, ${Math.sin(timestamp / 300) * 0.05 + 0.05})`;
            ctx.fillRect(0, this.height * 0.4, this.width, this.height * 0.6);

            // Static noise in sky
            if (Math.random() < 0.05) {
                for (let i = 0; i < 20; i++) {
                    const nx = Math.random() * this.width;
                    const ny = Math.random() * this.height * 0.4;
                    const ns = 1 + Math.random() * 3;
                    ctx.fillStyle = `rgba(${Math.random() * 255}, 0, ${Math.random() * 255}, 0.5)`;
                    ctx.fillRect(nx, ny, ns, ns);
                }
            }
        }

        // Narrative fragment
        if (this.hauntStage >= 2 && this.raceTimer > 20 && Math.random() < 0.0003) {
            events.emit(EVENTS.NARRATIVE_FRAGMENT, {
                text: 'THE TRACK LOOPS FOREVER',
                game: this.id
            });
        }
    }
}

export default HauntedFZero;
