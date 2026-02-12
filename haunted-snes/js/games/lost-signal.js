// lost-signal.js — Test pattern / corrupted SNES boot / transmissions from 1994

import { GameBase } from './game-base.js';
import { input, BUTTONS } from '../core/input.js';
import { sfx } from '../audio/sfx.js';
import state from '../core/state.js';
import { events, EVENTS } from '../core/events.js';

export class LostSignal extends GameBase {
    constructor() {
        super({
            id: 'lost-signal',
            name: 'LOST SIGNAL',
            channel: 10,
            titleColor: '#888',
            bgColor: '#111',
            titleText: '— NO SIGNAL —'
        });

        this.phase = 'static';    // static, testpattern, transmission, scene
        this.staticPixels = [];
        this.testBarColors = [
            '#fff', '#ff0', '#0ff', '#0f0', '#f0f', '#f00', '#00f', '#000'
        ];
        this.transmissionText = '';
        this.transmissionIndex = 0;
        this.transmissionTimer = 0;
        this.sceneTimer = 0;
        this.currentScene = 0;
        this.signalStrength = 0;
        this.tuningOffset = 0;
        this.discovered = false;

        this.transmissions = [
            'CAN ANYONE HEAR THIS?',
            'THE CARTRIDGE... IT REMEMBERS...',
            'DECEMBER 14, 1994',
            'ALEX PLAYED EVERY DAY AFTER SCHOOL',
            'THE SAVE FILE GREW ON ITS OWN',
            'SOMETHING LIVES IN CHANNEL 12',
            'DON\'T TURN IT OFF DON\'T TURN IT OFF DON\'T',
            'I CAN SEE YOU THROUGH THE SCREEN',
            'THE OTHER GAMES KNOW YOU\'RE HERE',
            'HELP ME',
        ];

        this.scenes = [
            { name: 'bedroom', desc: 'A child\'s bedroom. SNES on the floor. 1994.' },
            { name: 'screen', desc: 'The TV glows in the dark. No one is playing.' },
            { name: 'hallway', desc: 'A hallway. The sound of a game playing downstairs.' },
            { name: 'static', desc: 'SIGNAL LOST' },
        ];
    }

    onInit() {
        // Pre-generate static noise positions
        for (let i = 0; i < 2000; i++) {
            this.staticPixels.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                brightness: Math.random()
            });
        }
    }

    onStart() {
        this.phase = 'static';
        this.transmissionIndex = 0;
        this.transmissionTimer = 0;
        this.sceneTimer = 0;
        this.signalStrength = 0;
        this.showingTitle = false;
        this.titleDismissed = true;
    }

    onStop() {}

    onUpdate(dt, timestamp) {
        this.signalStrength = Math.sin(timestamp / 2000) * 0.3 + 0.5;

        // D-pad up/down to "tune" the signal
        if (input.isPressed(BUTTONS.UP)) {
            this.tuningOffset += dt * 0.001;
        }
        if (input.isPressed(BUTTONS.DOWN)) {
            this.tuningOffset -= dt * 0.001;
        }

        // Phase transitions based on tuning and haunt stage
        const tuned = Math.abs(this.tuningOffset % 1) < 0.15;

        if (this.phase === 'static') {
            if (tuned && this.hauntStage >= 1) {
                this.phase = 'testpattern';
                this.transmissionTimer = 0;
            }
        } else if (this.phase === 'testpattern') {
            this.transmissionTimer += dt;
            if (this.transmissionTimer > 3000 || this.hauntStage >= 2) {
                this.phase = 'transmission';
                this.transmissionTimer = 0;
                this.transmissionText = '';
            }
            if (!tuned) {
                this.phase = 'static';
            }
        } else if (this.phase === 'transmission') {
            this.transmissionTimer += dt;

            // Type out text character by character
            const msg = this.transmissions[this.transmissionIndex % this.transmissions.length];
            const charIdx = Math.floor(this.transmissionTimer / 80);
            this.transmissionText = msg.substring(0, charIdx);

            if (charIdx > msg.length + 20) {
                this.transmissionIndex++;
                this.transmissionTimer = 0;
                this.transmissionText = '';

                // After a few transmissions, switch to scene
                if (this.transmissionIndex > 3 && this.hauntStage >= 2) {
                    this.phase = 'scene';
                    this.sceneTimer = 0;
                    this.currentScene = 0;
                }

                // Narrative fragment
                if (this.transmissionIndex === 3) {
                    events.emit(EVENTS.NARRATIVE_FRAGMENT, {
                        id: 'signal-date',
                        text: 'December 14, 1994 — the last day Alex played normally.'
                    });
                }
            }

            if (!tuned && this.hauntStage < 3) {
                this.phase = 'static';
            }
        } else if (this.phase === 'scene') {
            this.sceneTimer += dt;
            if (this.sceneTimer > 5000) {
                this.currentScene = (this.currentScene + 1) % this.scenes.length;
                this.sceneTimer = 0;
            }

            // B button to interact
            if (input.isJustPressed(BUTTONS.B)) {
                this.discovered = true;
                events.emit(EVENTS.NARRATIVE_FRAGMENT, {
                    id: 'signal-scene',
                    text: 'Through the static, you see a room. A child\'s room.'
                });
            }
        }

        // At stage 4, the signal is always clear
        if (this.hauntStage >= 4) {
            this.phase = 'scene';
        }
    }

    onRender(ctx, dt, timestamp) {
        switch (this.phase) {
            case 'static':
                this.renderStatic(ctx, timestamp);
                break;
            case 'testpattern':
                this.renderTestPattern(ctx, timestamp);
                break;
            case 'transmission':
                this.renderTransmission(ctx, timestamp);
                break;
            case 'scene':
                this.renderScene(ctx, timestamp);
                break;
        }

        // Signal strength indicator
        this.renderSignalMeter(ctx);

        // Tuning hint
        if (this.phase === 'static') {
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('USE ▲▼ TO TUNE', this.width / 2, this.height - 20);
            ctx.textAlign = 'left';
        }
    }

    renderStatic(ctx, timestamp) {
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, this.width, this.height);

        // Draw static noise
        const imgData = ctx.getImageData(0, 0, this.width, this.height);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
            if (Math.random() < 0.15) {
                const v = Math.floor(Math.random() * 80);
                data[i] = v;
                data[i + 1] = v;
                data[i + 2] = v;
                data[i + 3] = 255;
            }
        }

        ctx.putImageData(imgData, 0, 0);

        // Occasional horizontal lines
        if (Math.random() < 0.1) {
            const y = Math.floor(Math.random() * this.height);
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(0, y, this.width, 2);
        }

        // "NO SIGNAL" text
        ctx.fillStyle = `rgba(255,255,255,${0.2 + Math.sin(timestamp / 1000) * 0.1})`;
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('NO SIGNAL', this.width / 2, this.height / 2);
        ctx.textAlign = 'left';

        // Ghost face hidden in static at high haunt stages
        if (this.hauntStage >= 3 && Math.random() < 0.005) {
            ctx.fillStyle = 'rgba(255,200,200,0.03)';
            ctx.font = '120px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(':(', this.width / 2, this.height / 2 + 40);
            ctx.textAlign = 'left';
        }
    }

    renderTestPattern(ctx, timestamp) {
        // SMPTE-style color bars
        const barWidth = this.width / this.testBarColors.length;
        for (let i = 0; i < this.testBarColors.length; i++) {
            ctx.fillStyle = this.testBarColors[i];
            ctx.fillRect(i * barWidth, 0, barWidth, this.height * 0.7);
        }

        // Bottom section: black/white bars
        const bottomY = this.height * 0.7;
        const bottomH = this.height * 0.1;
        for (let i = 0; i < 8; i++) {
            ctx.fillStyle = i % 2 === 0 ? '#111' : '#eee';
            ctx.fillRect(i * barWidth, bottomY, barWidth, bottomH);
        }

        // Gray ramp at very bottom
        const rampY = bottomY + bottomH;
        for (let x = 0; x < this.width; x++) {
            const v = Math.floor((x / this.width) * 255);
            ctx.fillStyle = `rgb(${v},${v},${v})`;
            ctx.fillRect(x, rampY, 1, this.height - rampY);
        }

        // Station ID
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SNES TEST PATTERN', this.width / 2, 30);

        // Corruption: bars shift
        if (this.hauntStage >= 2) {
            const shift = Math.sin(timestamp / 500) * 5;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, this.height / 2 + shift - 2, this.width, 4);
        }

        // Date stamp corruption
        if (this.hauntStage >= 1) {
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = '10px monospace';
            ctx.fillText('12/14/1994  03:47 AM', this.width / 2, this.height - 30);
        }

        ctx.textAlign = 'left';
    }

    renderTransmission(ctx, timestamp) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.width, this.height);

        // Static in background (faint)
        for (let i = 0; i < 500; i++) {
            if (Math.random() < 0.3) {
                const x = Math.floor(Math.random() * this.width);
                const y = Math.floor(Math.random() * this.height);
                const v = Math.floor(Math.random() * 30);
                ctx.fillStyle = `rgb(${v},${v},${v})`;
                ctx.fillRect(x, y, 1, 1);
            }
        }

        // Transmission text
        if (this.transmissionText) {
            // Glowing text
            ctx.shadowColor = '#0f0';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#0f0';
            ctx.font = '16px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(this.transmissionText, this.width / 2, this.height / 2);

            // Cursor blink
            const cursorVisible = Math.sin(timestamp / 300) > 0;
            if (cursorVisible) {
                const textWidth = ctx.measureText(this.transmissionText).width;
                ctx.fillRect(this.width / 2 + textWidth / 2 + 4, this.height / 2 - 12, 8, 16);
            }

            ctx.shadowBlur = 0;
        }

        // Transmission source indicator
        ctx.fillStyle = 'rgba(0,255,0,0.3)';
        ctx.font = '10px monospace';
        ctx.fillText('SOURCE: UNKNOWN', this.width / 2, 30);
        ctx.fillText(`SIGNAL: ${(this.signalStrength * 100).toFixed(0)}%`, this.width / 2, 50);

        // At high stages, the source changes
        if (this.hauntStage >= 3) {
            ctx.fillStyle = 'rgba(255,0,0,0.5)';
            ctx.font = '10px monospace';
            ctx.fillText('SOURCE: INTERNAL', this.width / 2, 30);
        }

        ctx.textAlign = 'left';
    }

    renderScene(ctx, timestamp) {
        const scene = this.scenes[this.currentScene];

        ctx.fillStyle = '#0a0a12';
        ctx.fillRect(0, 0, this.width, this.height);

        switch (scene.name) {
            case 'bedroom':
                this.drawBedroom(ctx, timestamp);
                break;
            case 'screen':
                this.drawScreen(ctx, timestamp);
                break;
            case 'hallway':
                this.drawHallway(ctx, timestamp);
                break;
            case 'static':
                this.renderStatic(ctx, timestamp);
                break;
        }

        // Scene description
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(scene.desc, this.width / 2, this.height - 30);

        // VHS timestamp
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        ctx.fillText('DEC 14 1994  11:47PM', this.width - 20, 20);

        // REC indicator
        const recBlink = Math.sin(timestamp / 500) > 0;
        if (recBlink) {
            ctx.fillStyle = '#cc0000';
            ctx.beginPath();
            ctx.arc(30, 16, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#cc0000';
            ctx.textAlign = 'left';
            ctx.fillText('REC', 40, 20);
        }

        ctx.textAlign = 'left';
    }

    drawBedroom(ctx, timestamp) {
        // Floor
        ctx.fillStyle = '#2a2018';
        ctx.fillRect(0, 300, this.width, 148);

        // Back wall
        ctx.fillStyle = '#3a3838';
        ctx.fillRect(0, 100, this.width, 200);

        // Window (moonlight)
        ctx.fillStyle = '#1a1a3a';
        ctx.fillRect(320, 130, 80, 100);
        ctx.fillStyle = '#2a2a5a';
        ctx.fillRect(325, 135, 70, 90);

        // Moon
        ctx.fillStyle = '#ddd';
        ctx.beginPath();
        ctx.arc(360, 165, 15, 0, Math.PI * 2);
        ctx.fill();

        // Bed
        ctx.fillStyle = '#4a3a2a';
        ctx.fillRect(50, 260, 150, 80);
        ctx.fillStyle = '#6a5a4a';
        ctx.fillRect(50, 250, 150, 15);
        // Pillow
        ctx.fillStyle = '#8a8a8a';
        ctx.fillRect(55, 265, 40, 25);

        // SNES on floor
        ctx.fillStyle = '#d0d0d0';
        ctx.fillRect(250, 320, 60, 15);
        ctx.fillStyle = '#5a4a8a';
        ctx.fillRect(260, 310, 40, 12);

        // TV glow
        const glowIntensity = 0.3 + Math.sin(timestamp / 1000) * 0.1;
        ctx.fillStyle = `rgba(100,150,255,${glowIntensity})`;
        ctx.fillRect(230, 200, 100, 80);

        // Child figure? (at stage 4)
        if (this.hauntStage >= 4) {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(270, 280, 20, 40);
            // Sitting in front of TV
        }
    }

    drawScreen(ctx, timestamp) {
        // Dark room
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, this.width, this.height);

        // TV
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(156, 120, 200, 180);

        // Screen glow
        const colors = ['#0040ff', '#4000ff', '#00ff40'];
        const color = colors[Math.floor(timestamp / 2000) % colors.length];
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.6;
        ctx.fillRect(166, 130, 180, 150);
        ctx.globalAlpha = 1;

        // Glow on surroundings
        ctx.fillStyle = `${color}22`;
        ctx.fillRect(100, 100, 312, 220);

        // Text on screen
        ctx.fillStyle = '#fff';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        const texts = ['GAME OVER', 'CONTINUE?', 'PRESS START', 'ALEX...'];
        ctx.fillText(texts[Math.floor(timestamp / 3000) % texts.length], 256, 210);
        ctx.textAlign = 'left';
    }

    drawHallway(ctx, timestamp) {
        // Perspective hallway
        ctx.fillStyle = '#2a2020';
        ctx.fillRect(0, 0, this.width, this.height);

        // Floor
        ctx.fillStyle = '#3a2a1a';
        ctx.beginPath();
        ctx.moveTo(0, this.height);
        ctx.lineTo(this.width, this.height);
        ctx.lineTo(this.width * 0.65, this.height * 0.4);
        ctx.lineTo(this.width * 0.35, this.height * 0.4);
        ctx.closePath();
        ctx.fill();

        // Walls
        ctx.fillStyle = '#3a3030';
        // Left wall
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, this.height);
        ctx.lineTo(this.width * 0.35, this.height * 0.4);
        ctx.lineTo(this.width * 0.35, 0);
        ctx.closePath();
        ctx.fill();

        // Right wall
        ctx.fillStyle = '#2a2020';
        ctx.beginPath();
        ctx.moveTo(this.width, 0);
        ctx.lineTo(this.width, this.height);
        ctx.lineTo(this.width * 0.65, this.height * 0.4);
        ctx.lineTo(this.width * 0.65, 0);
        ctx.closePath();
        ctx.fill();

        // Door at end (light under it)
        ctx.fillStyle = '#1a1010';
        ctx.fillRect(this.width * 0.4, this.height * 0.15, this.width * 0.2, this.height * 0.28);

        // Light under door
        const lightPulse = 0.3 + Math.sin(timestamp / 2000) * 0.2;
        ctx.fillStyle = `rgba(100,150,255,${lightPulse})`;
        ctx.fillRect(this.width * 0.4, this.height * 0.4 - 3, this.width * 0.2, 5);

        // Sound text
        if (Math.sin(timestamp / 1500) > 0.5) {
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('♪ ♫ ♪', this.width / 2, this.height * 0.35);
            ctx.textAlign = 'left';
        }
    }

    renderSignalMeter(ctx) {
        const x = 20;
        const y = this.height - 50;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(x, y, 60, 8);

        const signalWidth = this.signalStrength * 56;
        const color = this.signalStrength > 0.6 ? '#0f0' : this.signalStrength > 0.3 ? '#ff0' : '#f00';
        ctx.fillStyle = color;
        ctx.fillRect(x + 2, y + 2, signalWidth, 4);

        ctx.fillStyle = color;
        ctx.font = '8px monospace';
        ctx.fillText('SIGNAL', x, y - 3);
    }

    onRestart() {
        this.phase = 'static';
        this.transmissionIndex = 0;
    }

    onDeath() {}
    onTitleDismiss() {}
}

export default LostSignal;
