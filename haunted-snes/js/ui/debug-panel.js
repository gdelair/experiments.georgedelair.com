// debug-panel.js — Developer mode overlay

import { events, EVENTS } from '../core/events.js';
import state from '../core/state.js';
import { renderer } from '../core/renderer.js';

class DebugPanel {
    constructor() {
        this.panel = null;
        this.content = null;
        this.visible = false;
        this.updateInterval = null;
    }

    init() {
        this.panel = document.getElementById('debug-panel');
        this.content = document.getElementById('debug-content');

        events.on(EVENTS.DEBUG_TOGGLE, () => this.toggle());
    }

    toggle() {
        this.visible = !this.visible;
        state.set('debugMode', this.visible);

        if (this.visible) {
            this.panel?.classList.remove('hidden');
            this.startUpdating();
        } else {
            this.panel?.classList.add('hidden');
            this.stopUpdating();
        }
    }

    startUpdating() {
        this.update();
        this.updateInterval = setInterval(() => this.update(), 500);
    }

    stopUpdating() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    update() {
        if (!this.content) return;

        const elapsed = state.getElapsedMinutes().toFixed(1);
        const stage = state.get('hauntStage');
        const stageName = state.getHauntStageName();
        const corruption = (state.get('corruptionLevel') * 100).toFixed(0);
        const fragments = state.get('narrativeFragments').size;
        const total = state.get('totalFragments');
        const fps = Math.round(renderer.fpsSmooth);
        const game = state.get('currentGame') || 'none';
        const channel = state.get('currentChannel');
        const visits = state.get('visitCount');
        const ghost = state.get('ghostPersonality');
        const secret = state.get('secretGameUnlocked');

        this.content.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 12px;font-size:10px;color:#0f0;">
                <span>FPS:</span><span>${fps}</span>
                <span>TIME:</span><span>${elapsed} min</span>
                <span>STAGE:</span><span style="color:${stage >= 3 ? '#f44' : '#0f0'}">${stage} (${stageName})</span>
                <span>CORRUPT:</span><span>${corruption}%</span>
                <span>GAME:</span><span>${game}</span>
                <span>CHANNEL:</span><span>${channel + 1}</span>
                <span>FRAGMENTS:</span><span>${fragments}/${total}</span>
                <span>VISITS:</span><span>${visits}</span>
                <span>SECRET:</span><span>${secret ? 'UNLOCKED' : 'LOCKED'}</span>
                <span>AGGR:</span><span>${ghost.aggression.toFixed(2)}</span>
                <span>INTEL:</span><span>${ghost.intelligence.toFixed(2)}</span>
                <span>CRUEL:</span><span>${ghost.cruelty.toFixed(2)}</span>
                <span>NIGHT:</span><span>${state.isNightTime() ? 'YES' : 'NO'}</span>
            </div>
            <div style="margin-top:8px;font-size:9px;color:#888;">
                Triple-click POWER to toggle | __SNES.haunt(4) for max
            </div>
        `;
    }
}

export const debugPanel = new DebugPanel();
export default debugPanel;
