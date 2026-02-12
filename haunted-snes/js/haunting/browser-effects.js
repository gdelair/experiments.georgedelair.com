// browser-effects.js — Title bar, favicon, console tricks

import { events, EVENTS } from '../core/events.js';
import state from '../core/state.js';

class BrowserEffects {
    constructor() {
        this.originalTitle = 'SUPER NINTENDO';
        this.originalFavicon = '';
        this.faviconCanvas = null;
        this.notificationTimer = null;
    }

    init() {
        this.originalTitle = document.title;
        this.originalFavicon = document.querySelector('link[rel="icon"]')?.href || '';

        // Create canvas for favicon manipulation
        this.faviconCanvas = document.createElement('canvas');
        this.faviconCanvas.width = 32;
        this.faviconCanvas.height = 32;

        events.on(EVENTS.TAB_TITLE_CHANGE, (data) => {
            this.setTitle(data.text);
        });

        events.on(EVENTS.FAVICON_CHANGE, (data) => {
            this.corruptFavicon(data.type);
        });

        // Tab visibility handling
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && state.get('powerOn') && state.get('hauntStage') >= 2) {
                this.onTabHidden();
            } else if (!document.hidden && state.get('powerOn') && state.get('hauntStage') >= 2) {
                this.onTabVisible();
            }
        });

        // Console tricks
        this.setupConsoleTricks();
    }

    setTitle(text) {
        document.title = text;

        // Revert after delay (unless consumed)
        if (state.get('hauntStage') < 4) {
            setTimeout(() => {
                document.title = this.originalTitle;
            }, 5000 + Math.random() * 5000);
        }
    }

    corruptFavicon(type) {
        const ctx = this.faviconCanvas.getContext('2d');

        switch (type) {
            case 'corrupt': {
                // Generate a creepy favicon
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, 32, 32);

                // Glitchy face
                ctx.fillStyle = '#f00';
                ctx.fillRect(8, 8, 6, 6);   // left eye
                ctx.fillRect(18, 8, 6, 6);  // right eye
                ctx.fillRect(10, 20, 12, 4); // mouth

                // Static noise
                for (let i = 0; i < 50; i++) {
                    ctx.fillStyle = `rgba(255,0,0,${Math.random() * 0.3})`;
                    ctx.fillRect(
                        Math.floor(Math.random() * 32),
                        Math.floor(Math.random() * 32),
                        1, 1
                    );
                }
                break;
            }

            case 'static': {
                // All static
                const imgData = ctx.getImageData(0, 0, 32, 32);
                const data = imgData.data;
                for (let i = 0; i < data.length; i += 4) {
                    const v = Math.floor(Math.random() * 100);
                    data[i] = v;
                    data[i + 1] = v;
                    data[i + 2] = v;
                    data[i + 3] = 255;
                }
                ctx.putImageData(imgData, 0, 0);
                break;
            }

            case 'red': {
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(0, 0, 32, 32);
                ctx.fillStyle = '#000';
                ctx.font = 'bold 24px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('!', 16, 26);
                break;
            }
        }

        // Apply to favicon
        const url = this.faviconCanvas.toDataURL();
        let link = document.querySelector('link[rel="icon"]');
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.href = url;

        // Revert after delay
        if (state.get('hauntStage') < 4) {
            setTimeout(() => {
                link.href = this.originalFavicon ||
                    "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><text y='14' font-size='14'>🎮</text></svg>";
            }, 10000);
        }
    }

    onTabHidden() {
        // When player leaves the tab, creepy title
        const messages = [
            'COME BACK',
            'WHERE DID YOU GO?',
            'I\'M STILL HERE',
            'DON\'T LEAVE ME',
            'WAITING...',
            'THE GAME DOESN\'T PAUSE',
            'I CAN STILL SEE YOU'
        ];

        let index = 0;
        this.notificationTimer = setInterval(() => {
            document.title = messages[index % messages.length];
            index++;

            // Corrupt favicon too
            if (index % 3 === 0) {
                this.corruptFavicon('static');
            }
        }, 3000);
    }

    onTabVisible() {
        if (this.notificationTimer) {
            clearInterval(this.notificationTimer);
            this.notificationTimer = null;
        }

        // Welcome back message
        const stage = state.get('hauntStage');
        if (stage >= 3) {
            document.title = 'YOU CAME BACK';
            setTimeout(() => {
                document.title = this.originalTitle;
            }, 3000);
        } else {
            document.title = this.originalTitle;
        }
    }

    setupConsoleTricks() {
        // Override console.clear to leave a message
        const originalClear = console.clear;
        console.clear = function() {
            originalClear.call(console);
            if (state.get('hauntStage') >= 2) {
                console.log('%cYOU CAN\'T CLEAR ME', 'color: #ff4488; font-size: 14px;');
            }
        };

        // Add custom console CSS
        const stage = state.get('hauntStage');
        if (stage >= 1) {
            console.log(
                '%c⚠ CARTRIDGE DATA ANOMALY DETECTED ⚠',
                'background: #ff0000; color: #fff; font-size: 12px; padding: 4px 8px;'
            );
        }

        // Periodic console messages based on stage
        setInterval(() => {
            if (!state.get('powerOn')) return;
            const currentStage = state.get('hauntStage');

            if (currentStage >= 3 && Math.random() < 0.1) {
                const messages = [
                    'can you read this?',
                    'I\'m in here',
                    'the code is alive',
                    'check localStorage',
                    'ALEX WAS HERE',
                    `visit #${state.get('visitCount')}`,
                    'look behind you',
                    'the cartridge remembers everything'
                ];
                const msg = messages[Math.floor(Math.random() * messages.length)];
                console.log(`%c${msg}`, 'color: rgba(255,68,136,0.5); font-size: 10px;');
            }
        }, 15000);
    }

    // Reset to normal
    reset() {
        document.title = this.originalTitle;
        if (this.notificationTimer) {
            clearInterval(this.notificationTimer);
        }

        let link = document.querySelector('link[rel="icon"]');
        if (link) {
            link.href = this.originalFavicon ||
                "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><text y='14' font-size='14'>🎮</text></svg>";
        }
    }
}

export const browserEffects = new BrowserEffects();
export default browserEffects;
