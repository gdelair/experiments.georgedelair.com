// console-ui.js — Power, eject, LEDs, overheat

import { events, EVENTS } from '../core/events.js';
import state from '../core/state.js';
import { sfx } from '../audio/sfx.js';

class ConsoleUI {
    constructor() {
        this.powerLed = null;
        this.tvLed = null;
        this.cartridge = null;
        this.console = null;
        this.screen = null;
        this.powerOffScreen = null;
        this.overheatInterval = null;
    }

    init() {
        this.powerLed = document.getElementById('power-led');
        this.tvLed = document.querySelector('.tv-led');
        this.cartridge = document.getElementById('cartridge');
        this.console = document.getElementById('snes-console');
        this.screen = document.getElementById('screen');
        this.powerOffScreen = document.getElementById('power-off-screen');

        this.wireEvents();
    }

    wireEvents() {
        events.on(EVENTS.POWER_ON, () => this.onPowerOn());
        events.on(EVENTS.POWER_OFF, () => this.onPowerOff());
        events.on(EVENTS.CONSOLE_EJECT, () => this.onEject());
        events.on(EVENTS.CARTRIDGE_INSERT, () => this.onInsert());
        events.on(EVENTS.CONSOLE_OVERHEAT, () => this.onOverheat());
        events.on(EVENTS.LED_CHANGE, (data) => this.setLED(data.color));

        events.on(EVENTS.HAUNT_STAGE_CHANGE, (data) => {
            this.onHauntStageChange(data.stage);
        });
    }

    onPowerOn() {
        this.powerLed?.classList.add('on');
        this.tvLed?.classList.add('on');
        this.powerOffScreen?.classList.add('hidden');

        document.getElementById('power-btn')?.classList.add('active');

        // Start overheat monitoring for haunted stages
        this.overheatInterval = setInterval(() => this.checkOverheat(), 5000);
    }

    onPowerOff() {
        this.powerLed?.classList.remove('on', 'red');
        this.tvLed?.classList.remove('on');
        this.powerOffScreen?.classList.remove('hidden');

        document.getElementById('power-btn')?.classList.remove('active');

        // Screen off animation
        this.screen?.classList.remove('power-on');
        this.screen?.classList.add('power-off');
        setTimeout(() => {
            this.screen?.classList.remove('power-off');
        }, 500);

        sfx.play('powerOff');

        if (this.overheatInterval) {
            clearInterval(this.overheatInterval);
            this.overheatInterval = null;
        }

        this.console?.classList.remove('overheating');
        state.set('consoleOverheating', false);
        state.set('overheatLevel', 0);
    }

    onEject() {
        if (!state.get('cartridgeInserted')) return;

        sfx.play('eject');
        state.set('cartridgeInserted', false);

        this.cartridge?.classList.remove('inserted');
        this.cartridge?.classList.add('ejected');

        // If haunting is active, the cartridge fights back
        if (state.get('hauntStage') >= 2) {
            setTimeout(() => {
                // Cartridge pushes itself back in
                this.onInsert();
                sfx.play('glitch');

                if (state.get('hauntStage') >= 3) {
                    // Message
                    events.emit(EVENTS.GHOST_SPEAK, { text: 'YOU CAN\'T REMOVE ME' });
                }
            }, 1500 + Math.random() * 2000);
        }
    }

    onInsert() {
        state.set('cartridgeInserted', true);
        this.cartridge?.classList.remove('ejected');
        this.cartridge?.classList.add('inserted');
    }

    onOverheat() {
        state.set('consoleOverheating', true);
        this.console?.classList.add('overheating');
        sfx.play('overheat');

        // LED goes red
        this.setLED('red');

        // Console shakes
        document.body.classList.add('shake');
        setTimeout(() => {
            document.body.classList.remove('shake');
        }, 500);

        // Cool down after a while
        setTimeout(() => {
            if (state.get('hauntStage') < 3) {
                state.set('consoleOverheating', false);
                this.console?.classList.remove('overheating');
                this.setLED('green');
                state.set('overheatLevel', 0);
            }
        }, 5000);
    }

    checkOverheat() {
        if (!state.get('powerOn')) return;

        const stage = state.get('hauntStage');
        if (stage < 3) return;

        let heat = state.get('overheatLevel');
        heat += 0.1 * stage;

        if (heat > 1 && !state.get('consoleOverheating')) {
            events.emit(EVENTS.CONSOLE_OVERHEAT);
        }

        state.set('overheatLevel', Math.min(heat, 2));
    }

    setLED(color) {
        if (!this.powerLed) return;

        this.powerLed.classList.remove('on', 'red');

        switch (color) {
            case 'green':
                this.powerLed.classList.add('on');
                break;
            case 'red':
                this.powerLed.classList.add('red');
                break;
            case 'flicker':
                this.powerLed.classList.add('on');
                // Rapid flicker
                let count = 0;
                const flickerInterval = setInterval(() => {
                    this.powerLed.classList.toggle('on');
                    count++;
                    if (count > 10) {
                        clearInterval(flickerInterval);
                        this.powerLed.classList.add('on');
                    }
                }, 100);
                break;
        }

        state.set('ledColor', color);
    }

    onHauntStageChange(stage) {
        switch (stage) {
            case 1:
                // Occasional LED flicker
                setInterval(() => {
                    if (state.get('powerOn') && Math.random() < 0.1) {
                        this.setLED('flicker');
                        setTimeout(() => this.setLED('green'), 500);
                    }
                }, 10000);
                break;

            case 3:
                // LED goes red occasionally
                setInterval(() => {
                    if (state.get('powerOn') && Math.random() < 0.3) {
                        this.setLED('red');
                        setTimeout(() => this.setLED('green'), 2000);
                    }
                }, 8000);
                break;

            case 4:
                // LED stays red
                this.setLED('red');
                break;
        }
    }
}

export const consoleUI = new ConsoleUI();
export default consoleUI;
