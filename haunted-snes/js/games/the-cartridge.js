// the-cartridge.js — Meta-game: navigate cartridge memory/ROM viewer

import { GameBase } from './game-base.js';
import { input, BUTTONS } from '../core/input.js';
import { sfx } from '../audio/sfx.js';
import state from '../core/state.js';
import { events, EVENTS } from '../core/events.js';

export class TheCartridge extends GameBase {
    constructor() {
        super({
            id: 'the-cartridge',
            name: 'THE CARTRIDGE',
            channel: 11,
            titleColor: '#0f0',
            bgColor: '#000',
            titleText: 'THE CARTRIDGE'
        });

        this.mode = 'hex';      // hex, ascii, save, rom
        this.cursorX = 0;
        this.cursorY = 0;
        this.scrollOffset = 0;
        this.memoryData = [];
        this.selectedByte = 0;
        this.viewModes = ['HEX DUMP', 'ASCII VIEW', 'SAVE DATA', 'ROM HEADER'];
        this.currentView = 0;

        // Fake memory contents
        this.hexColumns = 16;
        this.visibleRows = 24;
        this.totalBytes = 0x8000; // 32KB

        // Hidden content
        this.saveFiles = [];
        this.romHeader = {};
        this.hiddenMessages = [];
        this.asciiArt = [];
        this.discoveredSecrets = new Set();
    }

    onInit() {
        this.generateMemory();
        this.generateSaveFiles();
        this.generateROMHeader();
        this.generateHiddenContent();
    }

    generateMemory() {
        this.memoryData = new Uint8Array(this.totalBytes);

        // Fill with semi-random data that looks like game ROM
        for (let i = 0; i < this.totalBytes; i++) {
            // Mostly structured data with occasional patterns
            if (i < 0x200) {
                // Header region
                this.memoryData[i] = Math.floor(Math.random() * 256);
            } else if (i >= 0x2000 && i < 0x3000) {
                // Tile data (repeating patterns)
                this.memoryData[i] = ((i * 7) ^ (i >> 3)) & 0xFF;
            } else if (i >= 0x6000 && i < 0x6800) {
                // Save data region
                this.memoryData[i] = 0xFF; // Filled later
            } else {
                this.memoryData[i] = Math.floor(Math.random() * 256);
            }
        }

        // Embed hidden ASCII messages
        this.embedString(0x100, 'SUPER HAUNTED COLLECTION v1.0');
        this.embedString(0x1000, 'ALEX WAS HERE');
        this.embedString(0x1200, 'DECEMBER 14 1994');
        this.embedString(0x2500, 'HELP ME HELP ME HELP ME');
        this.embedString(0x3000, 'THE SAVE FILE KNOWS');
        this.embedString(0x4000, 'I AM STILL INSIDE');
        this.embedString(0x5000, 'DONT TURN IT OFF');
        this.embedString(0x7F00, 'YOU FOUND ME');
    }

    embedString(offset, str) {
        for (let i = 0; i < str.length && offset + i < this.totalBytes; i++) {
            this.memoryData[offset + i] = str.charCodeAt(i);
        }
    }

    generateSaveFiles() {
        this.saveFiles = [
            {
                slot: 1,
                name: 'ALEX',
                level: 99,
                time: '255:59',
                date: '12/14/1994',
                hp: 0,
                status: 'DEAD',
                corrupted: false
            },
            {
                slot: 2,
                name: '????',
                level: -1,
                time: '---:--',
                date: '??/??/????',
                hp: 999,
                status: 'ERROR',
                corrupted: true
            },
            {
                slot: 3,
                name: 'HELP',
                level: 1,
                time: '000:01',
                date: new Date().toLocaleDateString(),
                hp: 1,
                status: 'TRAPPED',
                corrupted: false
            }
        ];

        // At high haunt stages, save file 3 updates in real time
    }

    generateROMHeader() {
        this.romHeader = {
            title: 'SUPER HAUNTED    ',
            mapMode: '21 (HiROM)',
            romType: '02 (ROM+RAM+SRAM)',
            romSize: '0A (1MB)',
            sramSize: '03 (8KB)',
            country: 'UNKNOWN (FF)',
            developer: '00 (NONE)',
            version: '00',
            checksum: 'DEAD',
            complement: 'BEEF',
            // Hidden fields
            _realTitle: 'ALEX\'S PRISON',
            _realDeveloper: 'NO ONE',
            _realDate: '1994-12-14',
            _corruption: '████████████'
        };
    }

    generateHiddenContent() {
        // ASCII art hidden in ROM
        this.asciiArt = [
            '    ████████    ',
            '  ██        ██  ',
            ' █   ●    ●   █ ',
            ' █            █ ',
            ' █    ____    █ ',
            ' █   /    \\   █ ',
            '  ██        ██  ',
            '    ████████    ',
            '                ',
            '  HELLO PLAYER  '
        ];

        this.hiddenMessages = [
            { offset: 0x100, found: false },
            { offset: 0x1000, found: false },
            { offset: 0x1200, found: false },
            { offset: 0x2500, found: false },
            { offset: 0x4000, found: false },
            { offset: 0x7F00, found: false }
        ];
    }

    onStart() {
        this.cursorX = 0;
        this.cursorY = 0;
        this.scrollOffset = 0;
        this.currentView = 0;

        // Corrupt memory based on haunt stage
        if (this.hauntStage >= 2) {
            this.corruptMemory();
        }
    }

    corruptMemory() {
        // Add corruption to random bytes
        const numCorrupt = Math.floor(this.hauntStage * 50);
        for (let i = 0; i < numCorrupt; i++) {
            const addr = Math.floor(Math.random() * this.totalBytes);
            // Replace with creepy values
            const creepyBytes = [0x00, 0xFF, 0xDE, 0xAD, 0x66, 0x06];
            this.memoryData[addr] = creepyBytes[Math.floor(Math.random() * creepyBytes.length)];
        }

        // Change save file 3 to today
        if (this.saveFiles[2]) {
            this.saveFiles[2].date = new Date().toLocaleDateString();
            this.saveFiles[2].time = new Date().toLocaleTimeString().slice(0, 5);
        }
    }

    onStop() {}

    onUpdate(dt, timestamp) {
        // Navigation
        if (input.isJustPressed(BUTTONS.UP)) {
            this.cursorY = Math.max(0, this.cursorY - 1);
            if (this.cursorY < this.scrollOffset) {
                this.scrollOffset = this.cursorY;
            }
            sfx.play('menuMove');
        }
        if (input.isJustPressed(BUTTONS.DOWN)) {
            this.cursorY++;
            if (this.cursorY >= this.scrollOffset + this.visibleRows) {
                this.scrollOffset = this.cursorY - this.visibleRows + 1;
            }
            sfx.play('menuMove');
        }
        if (input.isJustPressed(BUTTONS.LEFT)) {
            this.cursorX = Math.max(0, this.cursorX - 1);
        }
        if (input.isJustPressed(BUTTONS.RIGHT)) {
            this.cursorX = Math.min(this.hexColumns - 1, this.cursorX + 1);
        }

        // Switch view mode
        if (input.isJustPressed(BUTTONS.L) || input.isJustPressed(BUTTONS.R)) {
            const dir = input.isJustPressed(BUTTONS.R) ? 1 : -1;
            this.currentView = ((this.currentView + dir) % this.viewModes.length +
                this.viewModes.length) % this.viewModes.length;
            this.cursorX = 0;
            this.cursorY = 0;
            this.scrollOffset = 0;
            sfx.play('select');
        }

        // Check for hidden messages at cursor
        const byteOffset = (this.cursorY * this.hexColumns) + this.cursorX;
        for (const msg of this.hiddenMessages) {
            if (Math.abs(byteOffset - msg.offset) < 5 && !msg.found) {
                msg.found = true;
                this.discoveredSecrets.add(msg.offset);
                sfx.play('coin');

                events.emit(EVENTS.NARRATIVE_FRAGMENT, {
                    id: `cartridge-${msg.offset.toString(16)}`,
                    text: `Memory address 0x${msg.offset.toString(16).toUpperCase()}: A message was found.`
                });
            }
        }

        // Dynamic corruption at high stages
        if (this.hauntStage >= 3 && Math.random() < 0.01) {
            const addr = Math.floor(Math.random() * this.totalBytes);
            this.memoryData[addr] = this.memoryData[addr] ^ 0xFF;
        }
    }

    onRender(ctx, dt, timestamp) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.width, this.height);

        // Header
        this.renderHeader(ctx, timestamp);

        switch (this.currentView) {
            case 0: this.renderHexView(ctx, timestamp); break;
            case 1: this.renderAsciiView(ctx, timestamp); break;
            case 2: this.renderSaveView(ctx, timestamp); break;
            case 3: this.renderROMView(ctx, timestamp); break;
        }

        // Footer
        this.renderFooter(ctx);
    }

    renderHeader(ctx, timestamp) {
        // Title bar
        ctx.fillStyle = '#003300';
        ctx.fillRect(0, 0, this.width, 24);

        ctx.fillStyle = '#0f0';
        ctx.font = '12px monospace';
        ctx.fillText(` CARTRIDGE MEMORY VIEWER — ${this.viewModes[this.currentView]}`, 4, 16);

        // Corruption indicator
        if (this.hauntStage >= 2) {
            ctx.fillStyle = '#f00';
            ctx.fillText('█ CORRUPTION DETECTED', this.width - 200, 16);
        }
    }

    renderHexView(ctx, timestamp) {
        const startY = 30;
        const lineHeight = 16;
        ctx.font = '11px monospace';

        // Address | Hex bytes | ASCII
        for (let row = 0; row < this.visibleRows; row++) {
            const memRow = row + this.scrollOffset;
            const addr = memRow * this.hexColumns;
            if (addr >= this.totalBytes) break;

            const y = startY + row * lineHeight;

            // Address
            ctx.fillStyle = '#888';
            ctx.fillText(addr.toString(16).toUpperCase().padStart(4, '0'), 8, y + 12);

            // Hex bytes
            let asciiStr = '';
            for (let col = 0; col < this.hexColumns; col++) {
                const byteAddr = addr + col;
                if (byteAddr >= this.totalBytes) break;

                const byte = this.memoryData[byteAddr];
                const x = 60 + col * 24;

                // Highlight cursor
                if (memRow === this.cursorY && col === this.cursorX) {
                    ctx.fillStyle = '#0f0';
                    ctx.fillRect(x - 2, y, 22, lineHeight);
                    ctx.fillStyle = '#000';
                } else if (this.discoveredSecrets.has(byteAddr - (byteAddr % 32))) {
                    ctx.fillStyle = '#ff0';
                } else if (byte === 0x00) {
                    ctx.fillStyle = '#333';
                } else if (byte === 0xFF) {
                    ctx.fillStyle = '#553';
                } else {
                    ctx.fillStyle = '#0a0';
                }

                ctx.fillText(byte.toString(16).toUpperCase().padStart(2, '0'), x, y + 12);

                // ASCII representation
                if (byte >= 32 && byte < 127) {
                    asciiStr += String.fromCharCode(byte);
                } else {
                    asciiStr += '.';
                }
            }

            // ASCII column
            ctx.fillStyle = '#060';
            ctx.fillText(asciiStr, 60 + this.hexColumns * 24 + 10, y + 12);
        }

        // Scrollbar
        const scrollRatio = this.scrollOffset / (this.totalBytes / this.hexColumns);
        const barY = startY + scrollRatio * (this.visibleRows * lineHeight);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(this.width - 6, barY, 4, 20);
    }

    renderAsciiView(ctx, timestamp) {
        const startY = 30;
        const lineHeight = 14;
        const charsPerLine = 60;
        ctx.font = '11px monospace';

        for (let row = 0; row < this.visibleRows + 4; row++) {
            const memRow = row + this.scrollOffset;
            const addr = memRow * charsPerLine;
            if (addr >= this.totalBytes) break;

            const y = startY + row * lineHeight;
            let line = '';

            for (let i = 0; i < charsPerLine; i++) {
                const byteAddr = addr + i;
                if (byteAddr >= this.totalBytes) break;
                const byte = this.memoryData[byteAddr];

                if (byte >= 32 && byte < 127) {
                    line += String.fromCharCode(byte);
                } else {
                    line += ' ';
                }
            }

            // Highlight readable text
            const hasText = /[A-Z]{3,}/.test(line);
            ctx.fillStyle = hasText ? '#0f0' : '#030';
            ctx.fillText(line, 8, y + 12);
        }

        // Hint
        ctx.fillStyle = '#0a0';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('READABLE TEXT HIGHLIGHTED IN GREEN', this.width / 2, this.height - 35);
        ctx.textAlign = 'left';
    }

    renderSaveView(ctx, timestamp) {
        const startY = 40;
        ctx.font = '14px monospace';

        ctx.fillStyle = '#0f0';
        ctx.fillText('═══════════ SAVE DATA ═══════════', 40, startY);

        for (let i = 0; i < this.saveFiles.length; i++) {
            const save = this.saveFiles[i];
            const y = startY + 50 + i * 100;

            // Slot border
            ctx.strokeStyle = save.corrupted ? '#f00' : '#0a0';
            ctx.lineWidth = 1;
            ctx.strokeRect(40, y - 10, this.width - 80, 80);

            // Slot header
            ctx.fillStyle = save.corrupted ? '#f00' : '#0f0';
            ctx.font = '14px monospace';
            ctx.fillText(`SLOT ${save.slot}: ${save.name}`, 50, y + 10);

            ctx.fillStyle = '#0a0';
            ctx.font = '11px monospace';
            ctx.fillText(`LEVEL: ${save.level}    TIME: ${save.time}`, 50, y + 30);
            ctx.fillText(`DATE:  ${save.date}    HP: ${save.hp}`, 50, y + 45);
            ctx.fillText(`STATUS: ${save.status}`, 50, y + 60);

            // Corruption glitch on slot 2
            if (save.corrupted && this.hauntStage >= 1) {
                ctx.fillStyle = 'rgba(255,0,0,0.1)';
                ctx.fillRect(40, y - 10, this.width - 80, 80);

                if (Math.random() < 0.05) {
                    ctx.fillStyle = '#f00';
                    ctx.font = '20px monospace';
                    ctx.fillText('ERROR ERROR ERROR', 60, y + 35);
                }
            }
        }

        // At high haunt stages, a 4th impossible save appears
        if (this.hauntStage >= 3) {
            const y = startY + 50 + 3 * 100;
            ctx.strokeStyle = '#f0f';
            ctx.strokeRect(40, y - 10, this.width - 80, 80);

            ctx.fillStyle = '#f0f';
            ctx.font = '14px monospace';
            ctx.fillText(`SLOT 4: Y̸O̵U̶`, 50, y + 10);

            ctx.font = '11px monospace';
            ctx.fillText(`LEVEL: ???    TIME: NOW`, 50, y + 30);
            ctx.fillText(`DATE:  ${new Date().toLocaleDateString()}    HP: ???`, 50, y + 45);
            ctx.fillText(`STATUS: PLAYING`, 50, y + 60);
        }
    }

    renderROMView(ctx, timestamp) {
        const startY = 40;
        ctx.font = '12px monospace';

        ctx.fillStyle = '#0f0';
        ctx.fillText('═══════════ ROM HEADER ═══════════', 40, startY);

        const entries = Object.entries(this.romHeader);
        let y = startY + 30;

        for (const [key, value] of entries) {
            if (key.startsWith('_')) continue; // Skip hidden entries unless haunted

            ctx.fillStyle = '#0a0';
            ctx.fillText(`${key.toUpperCase().padEnd(15)}`, 40, y);
            ctx.fillStyle = '#0f0';
            ctx.fillText(`${value}`, 220, y);
            y += 20;
        }

        // At higher haunt stages, reveal hidden entries
        if (this.hauntStage >= 2) {
            y += 20;
            ctx.fillStyle = '#f00';
            ctx.fillText('════ HIDDEN DATA ════', 40, y);
            y += 20;

            for (const [key, value] of entries) {
                if (!key.startsWith('_')) continue;
                const displayKey = key.substring(1).toUpperCase();
                ctx.fillStyle = '#800';
                ctx.fillText(`${displayKey.padEnd(15)}`, 40, y);
                ctx.fillStyle = '#f00';
                ctx.fillText(`${value}`, 220, y);
                y += 20;
            }
        }

        // ASCII art at bottom
        if (this.hauntStage >= 3) {
            y += 20;
            ctx.fillStyle = 'rgba(255,0,100,0.6)';
            ctx.font = '10px monospace';
            for (const line of this.asciiArt) {
                ctx.fillText(line, 160, y);
                y += 12;
            }
        }
    }

    renderFooter(ctx) {
        ctx.fillStyle = '#003300';
        ctx.fillRect(0, this.height - 24, this.width, 24);

        ctx.fillStyle = '#0a0';
        ctx.font = '10px monospace';

        const addr = (this.cursorY * this.hexColumns + this.cursorX).toString(16).toUpperCase().padStart(4, '0');
        ctx.fillText(`ADDR: 0x${addr}  |  L/R: Switch View  |  D-Pad: Navigate`, 8, this.height - 8);

        // Secrets found
        const found = this.discoveredSecrets.size;
        const total = this.hiddenMessages.length;
        ctx.fillStyle = found > 0 ? '#ff0' : '#0a0';
        ctx.textAlign = 'right';
        ctx.fillText(`SECRETS: ${found}/${total}`, this.width - 8, this.height - 8);
        ctx.textAlign = 'left';
    }

    onRestart() {
        this.generateMemory();
        this.cursorX = 0;
        this.cursorY = 0;
        this.scrollOffset = 0;
    }

    onDeath() {}
    onTitleDismiss() {}
}

export default TheCartridge;
