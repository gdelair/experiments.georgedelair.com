// narrative.js — Hidden story fragments about Alex and the cartridge

import { events, EVENTS } from '../core/events.js';
import state from '../core/state.js';

class Narrative {
    constructor() {
        this.fragments = new Map();
        this.displayQueue = [];
        this.showing = false;
        this.currentText = '';
        this.fadeTimer = 0;
        this.overlay = null;
        this.textEl = null;
    }

    init() {
        this.overlay = document.getElementById('narrative-overlay');
        this.textEl = document.getElementById('narrative-text');

        // Define all story fragments
        this.defineFragments();

        // Listen for fragment discoveries
        events.on(EVENTS.NARRATIVE_FRAGMENT, (data) => {
            this.discoverFragment(data.id, data.text);
        });

        // Ghost speech display
        events.on(EVENTS.GHOST_SPEAK, (data) => {
            this.showGhostSpeech(data.text, data.style);
        });

        // Jump scare
        events.on(EVENTS.JUMPSCARE, (data) => {
            this.triggerJumpScare(data.duration || 500);
        });
    }

    defineFragments() {
        // The full story of Alex and the cartridge
        const storyFragments = [
            {
                id: 'origin',
                text: 'Christmas 1993. A child named Alex unwraps a Super Nintendo.',
                game: 'any', stage: 1
            },
            {
                id: 'obsession',
                text: 'By February 1994, Alex plays every day after school. The save files grow.',
                game: 'mario-world', stage: 1
            },
            {
                id: 'anomaly',
                text: 'March 1994. The save file has 300 hours. Alex has only had the SNES for 3 months.',
                game: 'chrono-trigger', stage: 2
            },
            {
                id: 'nightplay',
                text: 'Alex\'s mother hears the SNES playing at 3 AM. Alex is asleep in bed.',
                game: 'any', stage: 2
            },
            {
                id: 'warmth',
                text: 'The cartridge is warm to the touch, even when the console has been off for days.',
                game: 'the-cartridge', stage: 2
            },
            {
                id: 'return',
                text: 'Alex\'s father tries to return the cartridge. The store has no record of the sale.',
                game: 'any', stage: 2
            },
            {
                id: 'drawings',
                text: 'Alex starts drawing characters that aren\'t in any of the games.',
                game: 'any', stage: 3
            },
            {
                id: 'voices',
                text: '"The game talks to me," Alex tells a friend. The friend doesn\'t visit again.',
                game: 'lost-signal', stage: 3
            },
            {
                id: 'lastday',
                text: 'December 14, 1994. Alex plays for the last time. The screen goes white.',
                game: 'any', stage: 3
            },
            {
                id: 'aftermath',
                text: 'Alex is fine. Alex grows up, moves away, forgets. But the cartridge remembers.',
                game: 'any', stage: 4
            },
            {
                id: 'donation',
                text: 'The SNES is donated to Goodwill in 1996. Bought. Returned. Bought. Returned.',
                game: 'the-cartridge', stage: 4
            },
            {
                id: 'truth',
                text: 'The ghost isn\'t Alex. The ghost is every hour Alex spent playing. Every button pressed. Every game over. Memories don\'t die. They just wait.',
                game: 'secret-game', stage: 4
            }
        ];

        for (const f of storyFragments) {
            this.fragments.set(f.id, f);
        }
    }

    discoverFragment(id, text) {
        if (state.get('narrativeFragments').has(id)) return;

        state.get('narrativeFragments').add(id);

        // Queue display
        this.displayQueue.push({
            text: text || this.fragments.get(id)?.text || '???',
            id
        });

        if (!this.showing) {
            this.showNext();
        }

        // Check completion
        const completion = state.getNarrativeCompletion();
        if (completion >= 1) {
            console.log('%cTHE FULL STORY HAS BEEN REVEALED', 'color: #f0f; font-size: 16px;');
        }

        events.emit(EVENTS.DEBUG_LOG, {
            msg: `Fragment discovered: ${id} (${state.get('narrativeFragments').size}/${state.get('totalFragments')})`
        });
    }

    showNext() {
        if (this.displayQueue.length === 0) {
            this.hiding();
            return;
        }

        const item = this.displayQueue.shift();
        this.showText(item.text, 5000);
    }

    showText(text, duration) {
        if (!this.overlay || !this.textEl) return;

        this.showing = true;
        this.currentText = text;
        this.textEl.textContent = text;
        this.overlay.classList.add('visible');

        setTimeout(() => {
            this.overlay?.classList.remove('visible');
            setTimeout(() => {
                this.showing = false;
                this.showNext();
            }, 1000);
        }, duration);
    }

    hiding() {
        this.showing = false;
        this.overlay?.classList.remove('visible');
    }

    showGhostSpeech(text, style = 'normal') {
        if (!this.textEl || !this.overlay) return;

        this.textEl.textContent = text;

        if (style === 'direct') {
            this.textEl.style.color = 'rgba(255, 50, 100, 0.8)';
            this.textEl.style.fontSize = '24px';
        } else {
            this.textEl.style.color = 'rgba(255, 255, 255, 0.5)';
            this.textEl.style.fontSize = '18px';
        }

        this.overlay.classList.add('visible');

        const duration = style === 'direct' ? 4000 : 3000;
        setTimeout(() => {
            this.overlay?.classList.remove('visible');
            // Reset style
            if (this.textEl) {
                this.textEl.style.color = '';
                this.textEl.style.fontSize = '';
            }
        }, duration);
    }

    triggerJumpScare(duration) {
        const overlay = document.getElementById('jumpscare-overlay');
        if (!overlay) return;

        // Create scare content
        overlay.innerHTML = '';
        overlay.classList.add('active');

        // Distorted face / static
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 448;
        const ctx = canvas.getContext('2d');
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.imageRendering = 'pixelated';

        // Draw disturbing imagery
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 512, 448);

        // Noise
        const imgData = ctx.getImageData(0, 0, 512, 448);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
            const v = Math.random() * 40;
            data[i] = v;
            data[i + 1] = 0;
            data[i + 2] = 0;
            data[i + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);

        // Face
        ctx.fillStyle = 'rgba(200,180,160,0.8)';
        ctx.beginPath();
        ctx.ellipse(256, 180, 80, 100, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eyes (black voids)
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(220, 160, 20, 25, 0, 0, Math.PI * 2);
        ctx.ellipse(290, 160, 20, 25, 0, 0, Math.PI * 2);
        ctx.fill();

        // Mouth (open scream)
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(256, 230, 30, 40, 0, 0, Math.PI * 2);
        ctx.fill();

        // Text
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 48px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('FOUND YOU', 256, 380);

        overlay.appendChild(canvas);

        setTimeout(() => {
            overlay.classList.remove('active');
            overlay.innerHTML = '';
        }, duration);
    }

    // Get story completion percentage
    getCompletionText() {
        const found = state.get('narrativeFragments').size;
        const total = state.get('totalFragments');
        return `${found}/${total} fragments (${Math.floor(found / total * 100)}%)`;
    }

    // Get list of discovered fragments
    getDiscoveredList() {
        const discovered = [];
        for (const [id, fragment] of this.fragments) {
            if (state.get('narrativeFragments').has(id)) {
                discovered.push(fragment);
            }
        }
        return discovered;
    }
}

export const narrative = new Narrative();
export default narrative;
