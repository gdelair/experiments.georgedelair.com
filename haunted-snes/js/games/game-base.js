// game-base.js — Base class for all games: lifecycle, render, input

import { events, EVENTS } from '../core/events.js';
import state from '../core/state.js';
import { input, BUTTONS } from '../core/input.js';
import { sfx } from '../audio/sfx.js';

export class GameBase {
    constructor(config = {}) {
        this.id = config.id || 'unknown';
        this.name = config.name || 'Unknown Game';
        this.channel = config.channel || 0;

        // Display
        this.width = 512;
        this.height = 448;
        this.visible = true;
        this.zIndex = 0;

        // State
        this.running = false;
        this.paused = false;
        this.gameOver = false;
        this.showingTitle = true;
        this.titleDismissed = false;
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.time = 0;

        // Title screen
        this.titleColor = config.titleColor || '#fff';
        this.bgColor = config.bgColor || '#000';
        this.titleText = config.titleText || this.name;

        // Corruption
        this.corruptionLevel = 0;
        this.hauntStage = 0;
        this.crossGameBleed = null;

        // Timers
        this.timers = [];
    }

    init(dimensions) {
        if (dimensions) {
            this.width = dimensions.width;
            this.height = dimensions.height;
        }
        this.onInit();
    }

    start() {
        this.running = true;
        this.paused = false;
        this.showingTitle = !this.titleDismissed;
        this.time = 0;
        this.hauntStage = state.get('hauntStage');
        this.corruptionLevel = state.get('corruptionLevel');
        this.onStart();
    }

    stop() {
        this.running = false;
        this.clearTimers();
        this.onStop();
    }

    pause() {
        this.paused = true;
        events.emit(EVENTS.GAME_PAUSE, { game: this.id });
    }

    resume() {
        this.paused = false;
        events.emit(EVENTS.GAME_RESUME, { game: this.id });
    }

    // Render method called by renderer
    render(ctx, dt, timestamp) {
        if (!this.running) return;

        this.time += dt;
        this.hauntStage = state.get('hauntStage');
        this.corruptionLevel = state.get('corruptionLevel');

        if (this.showingTitle) {
            this.renderTitleScreen(ctx, dt, timestamp);

            // Dismiss on Start press
            if (input.isJustPressed(BUTTONS.START)) {
                this.showingTitle = false;
                this.titleDismissed = true;
                sfx.play('confirm');
                this.onTitleDismiss();
            }
            return;
        }

        if (this.gameOver) {
            this.renderGameOver(ctx, dt, timestamp);

            // Restart on Start press
            if (input.isJustPressed(BUTTONS.START)) {
                this.restart();
            }
            return;
        }

        if (this.paused) {
            this.renderPause(ctx, dt, timestamp);
            if (input.isJustPressed(BUTTONS.START)) {
                this.resume();
            }
            return;
        }

        // Handle Start for pause
        if (input.isJustPressed(BUTTONS.START)) {
            this.pause();
            return;
        }

        // Game update and render
        this.onUpdate(dt, timestamp);
        this.onRender(ctx, dt, timestamp);

        // HUD
        this.renderHUD(ctx);

        // Cross-game bleed overlay
        if (this.crossGameBleed) {
            this.renderCrossGameBleed(ctx);
        }
    }

    // Title screen
    renderTitleScreen(ctx, dt, timestamp) {
        ctx.fillStyle = this.bgColor;
        ctx.fillRect(0, 0, this.width, this.height);

        // Game title
        ctx.fillStyle = this.titleColor;
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.titleText, this.width / 2, this.height / 2 - 30);

        // Press Start
        const blink = Math.sin(timestamp / 400) > 0;
        if (blink) {
            ctx.fillStyle = '#ffcc00';
            ctx.font = '14px monospace';
            ctx.fillText('PRESS START', this.width / 2, this.height / 2 + 40);
        }

        // Haunting: corrupt title text
        if (this.hauntStage >= 2) {
            this.renderCorruptTitle(ctx, timestamp);
        }

        ctx.textAlign = 'left';
    }

    renderCorruptTitle(ctx, timestamp) {
        if (Math.random() > 0.02 * this.hauntStage) return;

        ctx.fillStyle = 'rgba(255,0,80,0.5)';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        const offset = (Math.random() - 0.5) * 6;
        ctx.fillText(this.titleText, this.width / 2 + offset, this.height / 2 - 30 + offset);
        ctx.textAlign = 'left';
    }

    // Game over screen
    renderGameOver(ctx, dt, timestamp) {
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = '#cc2222';
        ctx.font = 'bold 32px monospace';
        ctx.textAlign = 'center';

        const text = this.hauntStage >= 3 ? 'YOU CANNOT ESCAPE' : 'GAME OVER';
        ctx.fillText(text, this.width / 2, this.height / 2 - 20);

        ctx.fillStyle = '#aaa';
        ctx.font = '14px monospace';
        ctx.fillText(`SCORE: ${this.score}`, this.width / 2, this.height / 2 + 20);

        const blink = Math.sin(timestamp / 400) > 0;
        if (blink) {
            ctx.fillStyle = '#888';
            ctx.font = '12px monospace';
            ctx.fillText('PRESS START', this.width / 2, this.height / 2 + 60);
        }

        ctx.textAlign = 'left';
    }

    // Pause screen
    renderPause(ctx, dt, timestamp) {
        // Draw the game underneath
        this.onRender(ctx, 0, timestamp);

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', this.width / 2, this.height / 2);

        // Haunting: "ARE YOU AFRAID?"
        if (this.hauntStage >= 2 && Math.random() < 0.01) {
            ctx.fillStyle = 'rgba(255,0,80,0.3)';
            ctx.font = '12px monospace';
            ctx.fillText('ARE YOU AFRAID?', this.width / 2, this.height / 2 + 30);
        }

        ctx.textAlign = 'left';
    }

    // HUD
    renderHUD(ctx) {
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';

        // Score
        ctx.fillText(`SCORE: ${this.score}`, 10, 20);

        // Lives
        for (let i = 0; i < this.lives; i++) {
            ctx.fillStyle = '#cc2222';
            ctx.fillRect(this.width - 20 - i * 16, 8, 12, 12);
        }

        ctx.textAlign = 'left';
    }

    // Cross-game bleed overlay
    renderCrossGameBleed(ctx) {
        const bleed = this.crossGameBleed;
        if (!bleed) return;

        ctx.globalAlpha = 0.15;
        ctx.fillStyle = bleed.color || '#ff00ff';
        ctx.font = `${bleed.size || 20}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(bleed.text, bleed.x || this.width / 2, bleed.y || this.height / 2);
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';

        // Expire
        if (bleed.duration) {
            bleed.duration -= 16;
            if (bleed.duration <= 0) this.crossGameBleed = null;
        }
    }

    restart() {
        this.gameOver = false;
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.time = 0;
        this.onRestart();
    }

    die() {
        this.lives--;
        if (this.lives <= 0) {
            this.gameOver = true;
            sfx.play('death');
        } else {
            sfx.play('damage');
            this.onDeath();
        }
    }

    addScore(points) {
        this.score += points;
    }

    // Timer helpers
    addTimer(callback, interval, repeat = false) {
        const timer = {
            callback,
            interval,
            repeat,
            elapsed: 0,
            id: Date.now() + Math.random()
        };
        this.timers.push(timer);
        return timer.id;
    }

    clearTimers() {
        this.timers = [];
    }

    updateTimers(dt) {
        const toRemove = [];
        for (let i = 0; i < this.timers.length; i++) {
            const t = this.timers[i];
            t.elapsed += dt;
            if (t.elapsed >= t.interval) {
                t.callback();
                if (t.repeat) {
                    t.elapsed = 0;
                } else {
                    toRemove.push(i);
                }
            }
        }
        for (let i = toRemove.length - 1; i >= 0; i--) {
            this.timers.splice(toRemove[i], 1);
        }
    }

    // Cross-game bleed: receive character from another game
    receiveCrossGameBleed(data) {
        this.crossGameBleed = {
            text: data.text || '???',
            x: data.x || Math.random() * this.width,
            y: data.y || Math.random() * this.height,
            color: data.color || '#ff00ff',
            size: data.size || 20,
            duration: data.duration || 3000
        };
    }

    // Override these in subclasses
    onInit() {}
    onStart() {}
    onStop() {}
    onUpdate(dt, timestamp) {}
    onRender(ctx, dt, timestamp) {}
    onRestart() {}
    onDeath() {}
    onTitleDismiss() {}
}

export default GameBase;
