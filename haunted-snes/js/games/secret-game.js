// secret-game.js — Hidden 13th game: play AS the ghost in a child's bedroom

import { GameBase } from './game-base.js';
import { input, BUTTONS } from '../core/input.js';
import { sfx } from '../audio/sfx.js';
import state from '../core/state.js';
import { events, EVENTS } from '../core/events.js';

export class SecretGame extends GameBase {
    constructor() {
        super({
            id: 'secret-game',
            name: '???',
            channel: 12,
            titleColor: '#f0f',
            bgColor: '#000',
            titleText: '???'
        });

        // Player IS the ghost
        this.ghostX = 256;
        this.ghostY = 224;
        this.ghostAlpha = 0.3;
        this.ghostSize = 20;
        this.ghostPulse = 0;

        // Room: child's bedroom in 1994
        this.roomObjects = [];
        this.interactableObjects = [];
        this.childState = 'sleeping';  // sleeping, playing, watching, scared, aware
        this.childX = 100;
        this.childY = 280;
        this.childFacing = 'right';

        // SNES in the room
        this.snesOn = false;
        this.tvGlow = 0;

        // Narrative
        this.interactionCount = 0;
        this.messagesShown = [];
        this.currentMessage = '';
        this.messageTimer = 0;
        this.ending = false;
        this.endingPhase = 0;
        this.endingTimer = 0;

        // Atmosphere
        this.ambientTimer = 0;
        this.moonPhase = 0;
        this.flickerTimer = 0;
    }

    onInit() {
        this.roomObjects = [
            { type: 'bed', x: 50, y: 240, w: 160, h: 90, color: '#4a3a2a' },
            { type: 'desk', x: 300, y: 200, w: 100, h: 60, color: '#5a4a30' },
            { type: 'window', x: 350, y: 80, w: 80, h: 100, color: '#1a1a3a' },
            { type: 'door', x: 0, y: 140, w: 40, h: 160, color: '#3a2a1a' },
            { type: 'poster', x: 200, y: 60, w: 50, h: 70, color: '#2a2a4a' },
            { type: 'shelf', x: 430, y: 120, w: 70, h: 20, color: '#5a4a30' },
            { type: 'snes', x: 250, y: 310, w: 60, h: 15, color: '#d0d0d0' },
            { type: 'tv', x: 230, y: 220, w: 100, h: 80, color: '#2a2a2a' },
            { type: 'cartridges', x: 430, y: 130, w: 50, h: 15, color: '#666' }
        ];

        this.interactableObjects = [
            {
                name: 'SNES',
                x: 250, y: 310, w: 60, h: 15,
                onInteract: () => this.interactSNES()
            },
            {
                name: 'TV',
                x: 230, y: 220, w: 100, h: 80,
                onInteract: () => this.interactTV()
            },
            {
                name: 'CHILD',
                x: 90, y: 270, w: 40, h: 50,
                onInteract: () => this.interactChild()
            },
            {
                name: 'WINDOW',
                x: 350, y: 80, w: 80, h: 100,
                onInteract: () => this.interactWindow()
            },
            {
                name: 'DOOR',
                x: 0, y: 140, w: 40, h: 160,
                onInteract: () => this.interactDoor()
            }
        ];
    }

    onStart() {
        if (!state.get('secretGameUnlocked') && state.get('hauntStage') < 4) {
            this.showingTitle = true;
            this.titleText = 'LOCKED';
            return;
        }

        this.ghostX = 256;
        this.ghostY = 200;
        this.interactionCount = 0;
        this.childState = 'sleeping';
        this.snesOn = false;
        this.ending = false;
        this.endingPhase = 0;
        this.showMessage('YOU ARE THE GHOST.', 4000);
    }

    onStop() {}

    onUpdate(dt, timestamp) {
        if (!state.get('secretGameUnlocked') && state.get('hauntStage') < 4) return;

        this.ambientTimer += dt;
        this.moonPhase = Math.sin(timestamp / 5000) * 0.3 + 0.7;
        this.ghostPulse = Math.sin(timestamp / 800) * 0.1;

        if (this.ending) {
            this.updateEnding(dt);
            return;
        }

        // Ghost movement (float, not walk)
        const speed = 0.15;
        const dpad = input.getDPad();
        this.ghostX += dpad.x * speed * dt;
        this.ghostY += dpad.y * speed * dt;

        // Boundaries
        this.ghostX = Math.max(10, Math.min(this.width - 10, this.ghostX));
        this.ghostY = Math.max(50, Math.min(this.height - 30, this.ghostY));

        // Ghost alpha fluctuation
        this.ghostAlpha = 0.2 + this.ghostPulse + Math.random() * 0.05;

        // B button to interact
        if (input.isJustPressed(BUTTONS.B)) {
            this.tryInteract();
        }

        // A button to "haunt" (flicker lights, make noise)
        if (input.isJustPressed(BUTTONS.A)) {
            this.hauntAction();
        }

        // Update child behavior
        this.updateChild(dt, timestamp);

        // Message timer
        if (this.messageTimer > 0) {
            this.messageTimer -= dt;
            if (this.messageTimer <= 0) {
                this.currentMessage = '';
            }
        }

        // Check for ending condition
        if (this.interactionCount >= 8 && this.childState === 'aware') {
            this.startEnding();
        }
    }

    tryInteract() {
        for (const obj of this.interactableObjects) {
            const dx = this.ghostX - (obj.x + obj.w / 2);
            const dy = this.ghostY - (obj.y + obj.h / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 60) {
                obj.onInteract();
                this.interactionCount++;
                sfx.play('ghostVoice');
                return;
            }
        }

        // Nothing nearby
        this.showMessage('...', 1000);
    }

    hauntAction() {
        sfx.play('glitch');
        this.flickerTimer = 500;

        if (this.childState === 'sleeping' && this.interactionCount > 2) {
            this.childState = 'watching';
            this.showMessage('THE CHILD STIRS.', 2000);
        }

        if (this.childState === 'watching') {
            this.showMessage('THE CHILD LOOKS AROUND.', 2000);
        }
    }

    interactSNES() {
        if (!this.snesOn) {
            this.snesOn = true;
            this.tvGlow = 1;
            this.showMessage('THE SNES TURNS ON BY ITSELF.', 3000);

            if (this.childState === 'sleeping') {
                setTimeout(() => {
                    this.childState = 'watching';
                    this.showMessage('THE CHILD WAKES UP.', 3000);
                }, 2000);
            }
        } else {
            this.showMessage('THE SCREEN FLICKERS.', 2000);
        }
    }

    interactTV() {
        if (this.snesOn) {
            this.showMessage('YOU SEE YOURSELF IN THE GAME.', 3000);
            events.emit(EVENTS.NARRATIVE_FRAGMENT, {
                id: 'secret-tv',
                text: 'The ghost looked at the TV and saw... the player.'
            });
        } else {
            this.tvGlow = 0.5;
            this.showMessage('THE TV SHOWS STATIC.', 2000);
            setTimeout(() => { this.tvGlow = 0; }, 2000);
        }
    }

    interactChild() {
        const messages = {
            sleeping: 'THE CHILD SLEEPS PEACEFULLY. YOU REMEMBER THIS.',
            playing: 'THE CHILD PLAYS YOUR GAME. YOUR PRISON.',
            watching: 'THE CHILD LOOKS AT THE TV. THEY SENSE SOMETHING.',
            scared: 'THE CHILD IS AFRAID. YOU DIDN\'T MEAN TO SCARE THEM.',
            aware: 'THE CHILD SEES YOU. THEY ALWAYS COULD.'
        };

        this.showMessage(messages[this.childState] || '...', 4000);

        if (this.childState === 'watching' && this.interactionCount > 4) {
            this.childState = 'scared';
        }
        if (this.childState === 'scared' && this.interactionCount > 6) {
            this.childState = 'aware';
            this.showMessage('ALEX: "I KNOW YOU\'RE THERE."', 5000);
            events.emit(EVENTS.NARRATIVE_FRAGMENT, {
                id: 'secret-aware',
                text: 'Alex knew. Alex always knew.'
            });
        }
    }

    interactWindow() {
        this.showMessage('OUTSIDE: A SUBURBAN STREET. 1994.', 3000);
        this.showMessage('YOU CAN NEVER LEAVE.', 3000);
    }

    interactDoor() {
        this.showMessage('THE DOOR WON\'T OPEN. NOT FOR YOU.', 3000);
        events.emit(EVENTS.NARRATIVE_FRAGMENT, {
            id: 'secret-door',
            text: 'The ghost tried the door. It never opens.'
        });
    }

    updateChild(dt, timestamp) {
        if (this.childState === 'watching' || this.childState === 'scared') {
            // Child looks toward ghost
            this.childFacing = this.ghostX > this.childX + 20 ? 'right' : 'left';
        }

        if (this.childState === 'playing') {
            // Child sits in front of TV
            this.childX = 245;
            this.childY = 290;
        }

        if (this.childState === 'aware') {
            // Child stands up and faces ghost
            this.childY = 260;
        }
    }

    startEnding() {
        this.ending = true;
        this.endingPhase = 0;
        this.endingTimer = 0;
    }

    updateEnding(dt) {
        this.endingTimer += dt;

        if (this.endingPhase === 0 && this.endingTimer > 3000) {
            this.endingPhase = 1;
            this.showMessage('ALEX: "YOU\'VE BEEN IN THERE A LONG TIME."', 5000);
        }
        if (this.endingPhase === 1 && this.endingTimer > 8000) {
            this.endingPhase = 2;
            this.showMessage('ALEX: "I GREW UP. I LEFT."', 5000);
        }
        if (this.endingPhase === 2 && this.endingTimer > 14000) {
            this.endingPhase = 3;
            this.showMessage('ALEX: "BUT PART OF ME STAYED WITH YOU."', 5000);
        }
        if (this.endingPhase === 3 && this.endingTimer > 20000) {
            this.endingPhase = 4;
            this.showMessage('ALEX: "YOU\'RE NOT TRAPPED. YOU\'RE REMEMBERED."', 6000);
        }
        if (this.endingPhase === 4 && this.endingTimer > 28000) {
            this.endingPhase = 5;
            this.showMessage('THE SCREEN FADES. YOU ARE FREE.', 5000);

            events.emit(EVENTS.NARRATIVE_FRAGMENT, {
                id: 'secret-ending',
                text: 'The ghost was a memory. Memories don\'t die. They just... wait.'
            });
        }
    }

    showMessage(text, duration = 3000) {
        this.currentMessage = text;
        this.messageTimer = duration;
    }

    onRender(ctx, dt, timestamp) {
        if (!state.get('secretGameUnlocked') && state.get('hauntStage') < 4) {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = '#333';
            ctx.font = '16px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('CHANNEL LOCKED', this.width / 2, this.height / 2 - 20);
            ctx.fillStyle = '#555';
            ctx.font = '10px monospace';
            ctx.fillText('Stage 5 + 5 fragments + L,R,L,R,Select,Start', this.width / 2, this.height / 2 + 10);
            ctx.textAlign = 'left';
            return;
        }

        this.renderRoom(ctx, timestamp);
        this.renderChild(ctx, timestamp);
        this.renderGhost(ctx, timestamp);
        this.renderUI(ctx, timestamp);

        // Ending overlay
        if (this.ending && this.endingPhase >= 5) {
            const fadeAlpha = Math.min(1, (this.endingTimer - 28000) / 5000);
            ctx.fillStyle = `rgba(255,255,255,${fadeAlpha})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }
    }

    renderRoom(ctx, timestamp) {
        // Floor
        ctx.fillStyle = '#2a2018';
        ctx.fillRect(0, 330, this.width, 118);

        // Walls
        ctx.fillStyle = '#3a3838';
        ctx.fillRect(0, 50, this.width, 280);

        // Ceiling
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, this.width, 50);

        // Moonlight from window
        if (this.moonPhase > 0) {
            ctx.fillStyle = `rgba(100,120,180,${this.moonPhase * 0.08})`;
            ctx.fillRect(330, 80, 120, 300);
        }

        // Room flicker
        if (this.flickerTimer > 0) {
            this.flickerTimer -= 16;
            ctx.fillStyle = `rgba(255,255,200,${Math.random() * 0.1})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        // Render objects
        for (const obj of this.roomObjects) {
            switch (obj.type) {
                case 'bed':
                    ctx.fillStyle = obj.color;
                    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
                    // Blanket
                    ctx.fillStyle = '#5a5a7a';
                    ctx.fillRect(obj.x, obj.y + 10, obj.w, obj.h - 20);
                    // Pillow
                    ctx.fillStyle = '#8a8a8a';
                    ctx.fillRect(obj.x + 5, obj.y + 15, 50, 30);
                    break;

                case 'desk':
                    ctx.fillStyle = obj.color;
                    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
                    // Legs
                    ctx.fillRect(obj.x + 5, obj.y + obj.h, 8, 50);
                    ctx.fillRect(obj.x + obj.w - 13, obj.y + obj.h, 8, 50);
                    break;

                case 'window':
                    ctx.fillStyle = '#1a1a3a';
                    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
                    // Panes
                    ctx.fillStyle = `rgba(100,120,200,${this.moonPhase * 0.3})`;
                    ctx.fillRect(obj.x + 3, obj.y + 3, obj.w / 2 - 5, obj.h / 2 - 5);
                    ctx.fillRect(obj.x + obj.w / 2 + 2, obj.y + 3, obj.w / 2 - 5, obj.h / 2 - 5);
                    ctx.fillRect(obj.x + 3, obj.y + obj.h / 2 + 2, obj.w / 2 - 5, obj.h / 2 - 5);
                    ctx.fillRect(obj.x + obj.w / 2 + 2, obj.y + obj.h / 2 + 2, obj.w / 2 - 5, obj.h / 2 - 5);
                    // Moon
                    ctx.fillStyle = '#ddd';
                    ctx.beginPath();
                    ctx.arc(obj.x + 25, obj.y + 25, 8, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'door':
                    ctx.fillStyle = obj.color;
                    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
                    // Knob
                    ctx.fillStyle = '#888';
                    ctx.beginPath();
                    ctx.arc(obj.x + 30, obj.y + obj.h / 2, 4, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'poster':
                    ctx.fillStyle = obj.color;
                    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
                    ctx.fillStyle = '#4a4a6a';
                    ctx.font = '6px monospace';
                    ctx.fillText('SUPER', obj.x + 5, obj.y + 20);
                    ctx.fillText('MARIO', obj.x + 5, obj.y + 30);
                    ctx.fillText('WORLD', obj.x + 5, obj.y + 40);
                    break;

                case 'tv':
                    ctx.fillStyle = obj.color;
                    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
                    // Screen
                    if (this.snesOn || this.tvGlow > 0) {
                        const glow = this.snesOn ? 1 : this.tvGlow;
                        ctx.fillStyle = `rgba(80,120,255,${glow * 0.7})`;
                        ctx.fillRect(obj.x + 5, obj.y + 5, obj.w - 10, obj.h - 15);

                        // Light cast on surroundings
                        ctx.fillStyle = `rgba(80,120,255,${glow * 0.05})`;
                        ctx.fillRect(obj.x - 40, obj.y - 20, obj.w + 80, obj.h + 100);
                    } else {
                        ctx.fillStyle = '#111';
                        ctx.fillRect(obj.x + 5, obj.y + 5, obj.w - 10, obj.h - 15);
                    }
                    break;

                case 'snes':
                    ctx.fillStyle = obj.color;
                    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
                    // Purple cart
                    ctx.fillStyle = '#5a4a8a';
                    ctx.fillRect(obj.x + 15, obj.y - 8, 30, 10);
                    // LED
                    if (this.snesOn) {
                        ctx.fillStyle = '#0f0';
                        ctx.fillRect(obj.x + 5, obj.y + 5, 3, 3);
                    }
                    break;

                case 'shelf':
                    ctx.fillStyle = obj.color;
                    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
                    break;

                case 'cartridges':
                    for (let i = 0; i < 5; i++) {
                        ctx.fillStyle = ['#666', '#888', '#5a4a8a', '#666', '#444'][i];
                        ctx.fillRect(obj.x + i * 10, obj.y - 10, 8, 12);
                    }
                    break;
            }
        }
    }

    renderChild(ctx, timestamp) {
        const x = this.childX;
        const y = this.childY;

        if (this.ending && this.endingPhase >= 5) return;

        // Simple child figure
        const faceDir = this.childFacing === 'right' ? 1 : -1;

        // Body
        ctx.fillStyle = '#5566aa'; // pajamas
        ctx.fillRect(x, y + 12, 20, 25);

        // Head
        ctx.fillStyle = '#ddbb99';
        ctx.beginPath();
        ctx.arc(x + 10, y + 6, 8, 0, Math.PI * 2);
        ctx.fill();

        // Hair
        ctx.fillStyle = '#553322';
        ctx.fillRect(x + 2, y - 4, 16, 6);

        // Eyes
        if (this.childState !== 'sleeping') {
            ctx.fillStyle = '#222';
            ctx.fillRect(x + 6 + faceDir, y + 4, 2, 2);
            ctx.fillRect(x + 12 + faceDir, y + 4, 2, 2);

            // Scared eyes are wider
            if (this.childState === 'scared') {
                ctx.fillStyle = '#fff';
                ctx.fillRect(x + 5 + faceDir, y + 3, 4, 4);
                ctx.fillRect(x + 11 + faceDir, y + 3, 4, 4);
                ctx.fillStyle = '#222';
                ctx.fillRect(x + 6 + faceDir, y + 4, 2, 2);
                ctx.fillRect(x + 12 + faceDir, y + 4, 2, 2);
            }

            // Aware: they look directly at ghost
            if (this.childState === 'aware') {
                ctx.fillStyle = '#88aaff';
                ctx.fillRect(x + 5, y + 3, 4, 4);
                ctx.fillRect(x + 11, y + 3, 4, 4);
            }
        } else {
            // Closed eyes
            ctx.fillStyle = '#222';
            ctx.fillRect(x + 5, y + 5, 4, 1);
            ctx.fillRect(x + 11, y + 5, 4, 1);
        }

        // Legs
        ctx.fillStyle = '#5566aa';
        ctx.fillRect(x + 3, y + 37, 6, 10);
        ctx.fillRect(x + 11, y + 37, 6, 10);
    }

    renderGhost(ctx, timestamp) {
        if (this.ending && this.endingPhase >= 5) return;

        const x = this.ghostX;
        const y = this.ghostY;
        const alpha = this.ghostAlpha;
        const pulse = 1 + Math.sin(timestamp / 300) * 0.05;

        // Ghost glow
        ctx.globalAlpha = alpha * 0.3;
        ctx.fillStyle = '#aaccff';
        ctx.beginPath();
        ctx.arc(x, y, this.ghostSize * 1.5 * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Ghost body
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ddeeff';
        ctx.beginPath();
        ctx.arc(x, y - 5, this.ghostSize * pulse, 0, Math.PI);
        ctx.fill();

        // Ghost bottom (wavy)
        ctx.beginPath();
        ctx.moveTo(x - this.ghostSize * pulse, y - 5);
        for (let i = 0; i <= 4; i++) {
            const wx = x - this.ghostSize * pulse + (i * this.ghostSize * 2 * pulse / 4);
            const wy = y + this.ghostSize * 0.5 + Math.sin(timestamp / 200 + i * 1.5) * 3;
            ctx.lineTo(wx, wy);
        }
        ctx.closePath();
        ctx.fill();

        // Eyes
        ctx.fillStyle = `rgba(0,0,0,${alpha * 1.5})`;
        ctx.beginPath();
        ctx.arc(x - 6, y - 8, 3, 0, Math.PI * 2);
        ctx.arc(x + 6, y - 8, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;

        // Proximity indicator to nearest interactable
        let nearest = null;
        let nearestDist = Infinity;
        for (const obj of this.interactableObjects) {
            const dx = x - (obj.x + obj.w / 2);
            const dy = y - (obj.y + obj.h / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < nearestDist) {
                nearest = obj;
                nearestDist = dist;
            }
        }

        if (nearest && nearestDist < 60) {
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`[B] ${nearest.name}`, x, y - this.ghostSize - 10);
            ctx.textAlign = 'left';
        }
    }

    renderUI(ctx, timestamp) {
        // Message display
        if (this.currentMessage) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(30, this.height - 70, this.width - 60, 40);
            ctx.strokeStyle = 'rgba(200,200,255,0.3)';
            ctx.strokeRect(30, this.height - 70, this.width - 60, 40);

            ctx.fillStyle = '#ddeeff';
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(this.currentMessage, this.width / 2, this.height - 44);
            ctx.textAlign = 'left';
        }

        // Controls hint
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.font = '9px monospace';
        ctx.fillText('D-PAD: FLOAT  |  B: INTERACT  |  A: HAUNT', 10, 20);

        // Interaction counter
        ctx.fillStyle = 'rgba(200,200,255,0.3)';
        ctx.font = '9px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`MEMORIES: ${this.interactionCount}`, this.width - 10, 20);
        ctx.textAlign = 'left';
    }

    onRestart() {
        this.ghostX = 256;
        this.ghostY = 200;
        this.interactionCount = 0;
        this.childState = 'sleeping';
        this.snesOn = false;
        this.ending = false;
        this.endingPhase = 0;
        this.endingTimer = 0;
    }

    onDeath() {}
    onTitleDismiss() {}
}

export default SecretGame;
