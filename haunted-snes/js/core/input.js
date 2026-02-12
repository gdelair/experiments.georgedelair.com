// input.js — Keyboard, controller, and touch input system

import { events, EVENTS } from './events.js';
import state from './state.js';

// SNES button constants
export const BUTTONS = {
    UP: 'up',
    DOWN: 'down',
    LEFT: 'left',
    RIGHT: 'right',
    A: 'a',
    B: 'b',
    X: 'x',
    Y: 'y',
    L: 'l',
    R: 'r',
    START: 'start',
    SELECT: 'select'
};

// Keyboard to SNES mapping
const KEY_MAP = {
    'ArrowUp': BUTTONS.UP,
    'ArrowDown': BUTTONS.DOWN,
    'ArrowLeft': BUTTONS.LEFT,
    'ArrowRight': BUTTONS.RIGHT,
    'z': BUTTONS.B,
    'Z': BUTTONS.B,
    'x': BUTTONS.A,
    'X': BUTTONS.A,
    'a': BUTTONS.Y,
    'A': BUTTONS.Y,
    's': BUTTONS.X,
    'S': BUTTONS.X,
    'q': BUTTONS.L,
    'Q': BUTTONS.L,
    'w': BUTTONS.R,
    'W': BUTTONS.R,
    'Enter': BUTTONS.START,
    'Shift': BUTTONS.SELECT
};

// Konami Code: Up Up Down Down Left Right Left Right B A Start
const KONAMI_CODE = [
    BUTTONS.UP, BUTTONS.UP, BUTTONS.DOWN, BUTTONS.DOWN,
    BUTTONS.LEFT, BUTTONS.RIGHT, BUTTONS.LEFT, BUTTONS.RIGHT,
    BUTTONS.B, BUTTONS.A, BUTTONS.START
];

// Secret game code: L R L R Select Start
const SECRET_CODE = [
    BUTTONS.L, BUTTONS.R, BUTTONS.L, BUTTONS.R,
    BUTTONS.SELECT, BUTTONS.START
];

class InputManager {
    constructor() {
        this.pressed = new Set();
        this.justPressed = new Set();
        this.justReleased = new Set();
        this.inputDelay = 0;
        this.ghostInputs = [];
        this.enabled = true;
        this.touchActive = false;
        this.konamiIndex = 0;
        this.secretIndex = 0;
        this.lastButtonTime = 0;
        this.inputHistory = [];
        this.maxHistory = 50;
        this.boundKeyDown = null;
        this.boundKeyUp = null;
    }

    init() {
        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.boundKeyUp = this.handleKeyUp.bind(this);

        document.addEventListener('keydown', this.boundKeyDown);
        document.addEventListener('keyup', this.boundKeyUp);

        this.initTouchControls();
        this.initControllerButtons();

        events.on(EVENTS.GHOST_INPUT, (data) => {
            this.queueGhostInput(data.button, data.duration || 200);
        });
    }

    destroy() {
        document.removeEventListener('keydown', this.boundKeyDown);
        document.removeEventListener('keyup', this.boundKeyUp);
    }

    handleKeyDown(e) {
        if (!this.enabled) return;

        const button = KEY_MAP[e.key];
        if (!button) return;

        e.preventDefault();

        if (this.inputDelay > 0) {
            setTimeout(() => this.pressButton(button), this.inputDelay);
        } else {
            this.pressButton(button);
        }
    }

    handleKeyUp(e) {
        const button = KEY_MAP[e.key];
        if (!button) return;
        e.preventDefault();
        this.releaseButton(button);
    }

    pressButton(button, isGhost = false) {
        if (this.pressed.has(button)) return;

        this.pressed.add(button);
        this.justPressed.add(button);
        state.get('activeButtons').add(button);
        state.set('lastInputTime', Date.now());

        this.lastButtonTime = Date.now();
        this.inputHistory.push({ button, time: Date.now(), ghost: isGhost });
        if (this.inputHistory.length > this.maxHistory) {
            this.inputHistory.shift();
        }

        // Check code sequences
        this.checkKonamiCode(button);
        this.checkSecretCode(button);

        events.emit(EVENTS.INPUT_DOWN, { button, ghost: isGhost });
        events.emit(EVENTS.BUTTON_PRESS, { button, ghost: isGhost });

        // Highlight controller button
        this.highlightButton(button, true, isGhost);
    }

    releaseButton(button) {
        this.pressed.delete(button);
        this.justReleased.add(button);
        state.get('activeButtons').delete(button);

        events.emit(EVENTS.INPUT_UP, { button });
        events.emit(EVENTS.BUTTON_RELEASE, { button });

        this.highlightButton(button, false, false);
    }

    clearFrameState() {
        this.justPressed.clear();
        this.justReleased.clear();
    }

    isPressed(button) {
        return this.pressed.has(button);
    }

    isJustPressed(button) {
        return this.justPressed.has(button);
    }

    isJustReleased(button) {
        return this.justReleased.has(button);
    }

    getDPad() {
        return {
            x: (this.isPressed(BUTTONS.RIGHT) ? 1 : 0) - (this.isPressed(BUTTONS.LEFT) ? 1 : 0),
            y: (this.isPressed(BUTTONS.DOWN) ? 1 : 0) - (this.isPressed(BUTTONS.UP) ? 1 : 0)
        };
    }

    // Ghost input system
    queueGhostInput(button, duration) {
        this.ghostInputs.push({ button, duration, startTime: null });
    }

    processGhostInputs(timestamp) {
        const toRemove = [];
        for (let i = 0; i < this.ghostInputs.length; i++) {
            const gi = this.ghostInputs[i];
            if (!gi.startTime) {
                gi.startTime = timestamp;
                this.pressButton(gi.button, true);
            } else if (timestamp - gi.startTime >= gi.duration) {
                this.releaseButton(gi.button);
                toRemove.push(i);
            }
        }
        for (let i = toRemove.length - 1; i >= 0; i--) {
            this.ghostInputs.splice(toRemove[i], 1);
        }
    }

    // Konami code detection
    checkKonamiCode(button) {
        if (button === KONAMI_CODE[this.konamiIndex]) {
            this.konamiIndex++;
            if (this.konamiIndex >= KONAMI_CODE.length) {
                this.konamiIndex = 0;
                events.emit('konami:complete');
            }
        } else {
            this.konamiIndex = button === KONAMI_CODE[0] ? 1 : 0;
        }
        state.set('konamiProgress', this.konamiIndex);
    }

    // Secret code detection
    checkSecretCode(button) {
        if (button === SECRET_CODE[this.secretIndex]) {
            this.secretIndex++;
            if (this.secretIndex >= SECRET_CODE.length) {
                this.secretIndex = 0;
                if (state.canUnlockSecretGame()) {
                    events.emit('secret:unlock');
                }
            }
        } else {
            this.secretIndex = button === SECRET_CODE[0] ? 1 : 0;
        }
        state.set('secretCodeProgress', this.secretIndex);
    }

    // Touch controls
    initTouchControls() {
        const touchButtons = document.querySelectorAll('[data-button]');
        touchButtons.forEach(el => {
            const button = el.dataset.button;

            el.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.touchActive = true;
                this.pressButton(button);
            }, { passive: false });

            el.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.releaseButton(button);
            }, { passive: false });

            el.addEventListener('touchcancel', () => {
                this.releaseButton(button);
            });
        });
    }

    // Click controller buttons
    initControllerButtons() {
        const buttons = document.querySelectorAll('[data-button]');
        buttons.forEach(el => {
            const button = el.dataset.button;

            el.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.pressButton(button);
            });

            el.addEventListener('mouseup', (e) => {
                e.preventDefault();
                this.releaseButton(button);
            });

            el.addEventListener('mouseleave', () => {
                if (this.pressed.has(button)) {
                    this.releaseButton(button);
                }
            });
        });
    }

    // Visual button feedback
    highlightButton(button, active, isGhost) {
        const el = document.querySelector(`[data-button="${button}"]`);
        if (!el) return;

        if (active) {
            el.classList.add('active');
            if (isGhost) {
                el.classList.add('ghost-press');
            }
        } else {
            el.classList.remove('active', 'ghost-press');
        }
    }

    // Set input delay (haunting effect)
    setDelay(ms) {
        this.inputDelay = ms;
    }

    // Get reaction time after a scare
    getReactionTime() {
        if (state.get('lastScareTime') === 0) return null;
        const pauseAfterScare = state.get('lastInputTime') - state.get('lastScareTime');
        return pauseAfterScare > 0 ? pauseAfterScare : null;
    }

    // Recent input pattern for ghost AI
    getRecentPattern(windowMs = 3000) {
        const now = Date.now();
        return this.inputHistory.filter(h =>
            !h.ghost && (now - h.time) < windowMs
        ).map(h => h.button);
    }
}

export const input = new InputManager();
export default input;
