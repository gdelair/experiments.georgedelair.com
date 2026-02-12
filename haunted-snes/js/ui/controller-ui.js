// controller-ui.js — Visual feedback, ghost highlighting

import { events, EVENTS } from '../core/events.js';
import state from '../core/state.js';

class ControllerUI {
    constructor() {
        this.buttons = new Map();
        this.ghostHighlightTimer = null;
    }

    init() {
        // Cache button elements
        document.querySelectorAll('[data-button]').forEach(el => {
            this.buttons.set(el.dataset.button, el);
        });

        this.wireEvents();
    }

    wireEvents() {
        // Ghost input visualization
        events.on(EVENTS.GHOST_INPUT, (data) => {
            this.ghostHighlight(data.button, data.duration || 200);
        });

        // Haunt stage effects on controller
        events.on(EVENTS.HAUNT_STAGE_CHANGE, (data) => {
            this.onHauntStageChange(data.stage);
        });
    }

    ghostHighlight(button, duration) {
        const el = this.buttons.get(button);
        if (!el) return;

        el.classList.add('ghost-press');
        setTimeout(() => {
            el.classList.remove('ghost-press');
        }, duration);
    }

    // At higher haunt stages, buttons glow eerily
    onHauntStageChange(stage) {
        if (stage >= 3) {
            this.startRandomGhostHighlights();
        }
    }

    startRandomGhostHighlights() {
        if (this.ghostHighlightTimer) return;

        this.ghostHighlightTimer = setInterval(() => {
            if (!state.get('powerOn')) return;
            if (state.get('hauntStage') < 3) {
                clearInterval(this.ghostHighlightTimer);
                this.ghostHighlightTimer = null;
                return;
            }

            // Random button ghost press
            const allButtons = [...this.buttons.keys()];
            const btn = allButtons[Math.floor(Math.random() * allButtons.length)];
            this.ghostHighlight(btn, 300);
        }, 3000 + Math.random() * 5000);
    }
}

export const controllerUI = new ControllerUI();
export default controllerUI;
