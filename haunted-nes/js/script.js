document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const tvScreen = document.querySelector('.tv-screen');
    const channelContent = document.querySelector('.channel-content');
    const staticOverlay = document.querySelector('.static-overlay');
    const channelDisplay = document.querySelector('.channel-display');
    const channelUpButton = document.querySelector('.channel-up');
    const channelDownButton = document.querySelector('.channel-down');
    const powerButton = document.querySelector('.power-button');
    const volumeKnob = document.querySelector('.volume-knob');
    const brightnessKnob = document.querySelector('.brightness-knob');
    const nesConsole = document.querySelector('.nes-console');
    const powerLed = document.querySelector('.power-led');
    
    // HAUNTED ENHANCEMENT SYSTEM
    let hauntedMode = false;
    let ghostInputsEnabled = false;
    let sessionStartTime = Date.now();
    let timeSpentWatching = 0;
    let totalChannelChanges = 0;
    let lastUserActivity = Date.now();
    let hauntedEvents = [];
    let crossGameCorruption = false;
    let whisperAudio = null;
    let hauntedMessages = [
        "YOU SHOULDN'T HAVE TURNED IT ON",
        "I'VE BEEN WAITING...",
        "WHY DID YOU WAKE ME UP?",
        "THIS CONSOLE BELONGS TO ME NOW",
        "YOU CAN'T TURN IT OFF",
        "I SEE YOU WATCHING",
        "GAME OVER... FOR YOU",
        "HELP ME... I'M TRAPPED",
        "THE GAMES ARE ALIVE",
        "WE KNOW WHERE YOU LIVE"
    ];
    
    // Enhanced creepy sound system
    const createWhisperSound = () => {
        if (!audioCtx) return null;
        
        const noise = audioCtx.createBufferSource();
        const bufferSize = audioCtx.sampleRate * 3;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Create whisper-like filtered noise
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() - 0.5) * 0.1;
        }
        
        noise.buffer = buffer;
        noise.loop = true;
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 300;
        filter.Q.value = 10;
        
        const whisperGain = audioCtx.createGain();
        whisperGain.gain.value = 0.02;
        
        noise.connect(filter);
        filter.connect(whisperGain);
        whisperGain.connect(masterGain || audioCtx.destination);
        
        return { source: noise, gain: whisperGain };
    };
    
    const createJumpScareSound = () => {
        if (!audioCtx) return null;
        
        const osc = audioCtx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(60, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.3);
        
        const scareGain = audioCtx.createGain();
        scareGain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        scareGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        
        osc.connect(scareGain);
        scareGain.connect(masterGain || audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
        
        return osc;
    };
    
    // Haunted behaviors
    const triggerGhostInput = () => {
        if (!ghostInputsEnabled || !isTvOn) return;
        
        const actions = [
            () => changeChannel(Math.random() > 0.5 ? 1 : -1),
            () => {
                const newVolume = Math.random() * 0.8 + 0.1;
                volume = newVolume;
                if (masterGain) masterGain.gain.value = newVolume;
                updateVolumeKnob();
            },
            () => {
                brightness = Math.random() * 0.7 + 0.3;
                updateBrightnessKnob();
                tvScreen.style.filter = `brightness(${brightness})`;
            },
            () => flashScreen(),
            () => showHauntedMessage()
        ];
        
        const action = actions[Math.floor(Math.random() * actions.length)];
        action();
        
        // Schedule next ghost input
        setTimeout(triggerGhostInput, Math.random() * 30000 + 15000); // 15-45 seconds
    };
    
    const flashScreen = () => {
        tvScreen.style.filter = 'brightness(2) contrast(2) saturate(0)';
        setTimeout(() => {
            tvScreen.style.filter = `brightness(${brightness})`;
        }, 150);
        
        if (audioCtx) createJumpScareSound();
    };
    
    const showHauntedMessage = () => {
        const message = hauntedMessages[Math.floor(Math.random() * hauntedMessages.length)];
        const messageEl = document.createElement('div');
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #ff0000;
            font-family: monospace;
            font-size: 24px;
            font-weight: bold;
            text-shadow: 0 0 10px #ff0000;
            z-index: 1000;
            pointer-events: none;
            text-align: center;
            animation: haunted-flicker 2s infinite;
        `;
        
        // Add flicker animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes haunted-flicker {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.3; }
                75% { opacity: 0.8; }
            }
        `;
        document.head.appendChild(style);
        
        channelContent.appendChild(messageEl);
        
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 3000);
    };
    
    const triggerTVSelfOperation = () => {
        if (!isTvOn && Math.random() > 0.7) {
            // TV turns itself on
            setTimeout(() => {
                if (!isTvOn) {
                    togglePower();
                    showHauntedMessage();
                }
            }, Math.random() * 2000 + 1000);
        }
    };
    
    const startHauntedMode = () => {
        hauntedMode = true;
        
        // Enable whisper sounds
        if (audioCtx && !whisperAudio) {
            whisperAudio = createWhisperSound();
            if (whisperAudio) {
                whisperAudio.source.start();
            }
        }
        
        // Start ghost inputs after user has been watching for a while
        setTimeout(() => {
            ghostInputsEnabled = true;
            triggerGhostInput();
        }, 30000); // Start after 30 seconds
        
        // Random TV self-operation
        setInterval(triggerTVSelfOperation, 45000); // Check every 45 seconds
        
        // Cross-game corruption
        setTimeout(() => {
            crossGameCorruption = true;
        }, 60000); // Start after 1 minute
        
        // Power LED random flickers
        setInterval(() => {
            if (isTvOn && Math.random() > 0.8) {
                powerLed.style.backgroundColor = Math.random() > 0.5 ? '#0f0' : '#00f';
                setTimeout(() => {
                    powerLed.style.backgroundColor = '#f00';
                }, 200);
            }
        }, 5000);
        
        // Random console vibration effect
        setInterval(() => {
            if (isTvOn && Math.random() > 0.9) {
                nesConsole.style.transform = 'translateX(2px)';
                setTimeout(() => {
                    nesConsole.style.transform = 'translateX(-2px)';
                    setTimeout(() => {
                        nesConsole.style.transform = 'translateX(0)';
                    }, 100);
                }, 100);
            }
        }, 8000);
    };
    
    const updateVolumeKnob = () => {
        const rotation = (volume * 270) - 135; // -135 to +135 degrees
        volumeKnob.style.transform = `rotate(${rotation}deg)`;
    };
    
    const updateBrightnessKnob = () => {
        const rotation = (brightness * 270) - 135; // -135 to +135 degrees
        brightnessKnob.style.transform = `rotate(${rotation}deg)`;
    };
    
    // Enhanced corruption effects for cross-game contamination
    const corruptCurrentGame = () => {
        if (!crossGameCorruption || !isTvOn) return;
        
        const corruptionEffects = [
            () => {
                // Invert colors temporarily
                channelContent.style.filter = 'invert(1) hue-rotate(180deg)';
                setTimeout(() => {
                    channelContent.style.filter = '';
                }, 1000);
            },
            () => {
                // Glitch pixels
                const canvas = channelContent.querySelector('canvas');
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    for (let i = 0; i < imageData.data.length; i += 40) {
                        imageData.data[i] = Math.random() * 255;
                    }
                    ctx.putImageData(imageData, 0, 0);
                }
            },
            () => {
                // Add scan line corruption
                const glitchDiv = document.createElement('div');
                glitchDiv.style.cssText = `
                    position: absolute;
                    top: ${Math.random() * 100}%;
                    left: 0;
                    width: 100%;
                    height: 3px;
                    background: linear-gradient(90deg, transparent, #ff0000, transparent);
                    z-index: 10;
                    animation: scan-corruption 0.5s linear;
                `;
                
                const style = document.createElement('style');
                style.textContent = `
                    @keyframes scan-corruption {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(100%); }
                    }
                `;
                document.head.appendChild(style);
                
                channelContent.appendChild(glitchDiv);
                setTimeout(() => {
                    if (glitchDiv.parentNode) {
                        glitchDiv.parentNode.removeChild(glitchDiv);
                    }
                }, 500);
            }
        ];
        
        const effect = corruptionEffects[Math.floor(Math.random() * corruptionEffects.length)];
        effect();
    };
    
    // Activity tracking
    const trackUserActivity = () => {
        lastUserActivity = Date.now();
        timeSpentWatching += 1000; // Add 1 second
        
        // Start haunted mode after user has been engaged for a while
        if (timeSpentWatching > 15000 && !hauntedMode) {
            startHauntedMode();
        }
    };
    
    // Enhanced event listeners
    document.addEventListener('click', trackUserActivity);
    document.addEventListener('keydown', trackUserActivity);
    
    // SECRET CODES AND EASTER EGGS
    let konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
    let inputSequence = [];
    let secretCodesEnabled = false;
    let developerMode = false;
    let lastClickTime = 0;
    let clickCount = 0;
    
    // Konami Code handler
    document.addEventListener('keydown', (e) => {
        inputSequence.push(e.code);
        if (inputSequence.length > konamiSequence.length) {
            inputSequence.shift();
        }
        
        if (JSON.stringify(inputSequence) === JSON.stringify(konamiSequence)) {
            activateSecretMode();
            inputSequence = [];
        }
    });
    
    // Secret triple-click on power button
    powerButton.addEventListener('click', (e) => {
        const now = Date.now();
        if (now - lastClickTime < 500) {
            clickCount++;
            if (clickCount >= 3) {
                toggleDeveloperMode();
                clickCount = 0;
            }
        } else {
            clickCount = 1;
        }
        lastClickTime = now;
    });
    
    const activateSecretMode = () => {
        secretCodesEnabled = true;
        
        // Add new haunted messages
        hauntedMessages.push(
            "YOU FOUND THE SECRET...",
            "NOW THE REAL HORROR BEGINS",
            "THE CODE HAS AWAKENED SOMETHING",
            "YOU SHOULD NOT HAVE DONE THAT",
            "THERE IS NO ESCAPE NOW"
        );
        
        // Immediate haunted activation
        if (!hauntedMode) {
            startHauntedMode();
        }
        
        // Extreme mode - more frequent events
        ghostInputsEnabled = true;
        crossGameCorruption = true;
        
        // Screen corruption effect
        channelContent.style.animation = 'corrupt-screen 0.5s infinite';
        
        // Add extreme corruption CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes corrupt-screen {
                0% { filter: hue-rotate(0deg) saturate(1); }
                25% { filter: hue-rotate(90deg) saturate(2); }
                50% { filter: hue-rotate(180deg) saturate(0.5); }
                75% { filter: hue-rotate(270deg) saturate(2); }
                100% { filter: hue-rotate(360deg) saturate(1); }
            }
        `;
        document.head.appendChild(style);
        
        setTimeout(() => {
            channelContent.style.animation = '';
        }, 5000);
        
        showHauntedMessage();
        if (audioCtx) createJumpScareSound();
    };
    
    const toggleDeveloperMode = () => {
        developerMode = !developerMode;
        
        const debugPanel = document.createElement('div');
        debugPanel.id = 'debug-panel';
        debugPanel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.9);
            color: #0f0;
            font-family: monospace;
            font-size: 12px;
            padding: 10px;
            border: 1px solid #0f0;
            z-index: 9999;
            max-width: 200px;
        `;
        
        if (developerMode) {
            debugPanel.innerHTML = `
                <div>🎮 HAUNTED NES DEBUG</div>
                <div>Haunted Mode: ${hauntedMode}</div>
                <div>Ghost Inputs: ${ghostInputsEnabled}</div>
                <div>Watch Time: ${Math.floor(timeSpentWatching/1000)}s</div>
                <div>Channel: ${currentChannel}</div>
                <div>Corruption: ${crossGameCorruption}</div>
                <div>Secret Mode: ${secretCodesEnabled}</div>
                <button onclick="this.parentNode.parentNode.removeChild(this.parentNode)">X</button>
            `;
            document.body.appendChild(debugPanel);
        } else {
            const existing = document.getElementById('debug-panel');
            if (existing) {
                existing.parentNode.removeChild(existing);
            }
        }
    };
    
    // DATE/TIME SENSITIVE HORROR
    const checkTimeBasedEvents = () => {
        const now = new Date();
        const hour = now.getHours();
        const isNight = hour >= 22 || hour <= 6;
        const isHalloween = now.getMonth() === 9 && now.getDate() === 31;
        const isFriday13th = now.getDay() === 5 && now.getDate() === 13;
        
        if (isNight && isTvOn) {
            // Night mode - more aggressive haunting
            const nightMessages = [
                "IT'S DARK OUTSIDE... PERFECT",
                "MIDNIGHT IS MY FAVORITE TIME",
                "SHADOWS ARE WATCHING YOU",
                "THE DARKNESS FEEDS ME"
            ];
            
            if (Math.random() > 0.95) {
                const message = nightMessages[Math.floor(Math.random() * nightMessages.length)];
                showCustomMessage(message, '#000080');
            }
            
            // Darker screen effects
            if (Math.random() > 0.97) {
                tvScreen.style.filter = 'brightness(0.3) contrast(2)';
                setTimeout(() => {
                    tvScreen.style.filter = `brightness(${brightness})`;
                }, 2000);
            }
        }
        
        if (isHalloween && isTvOn) {
            // Halloween special effects
            const halloweenMessages = [
                "HAPPY HALLOWEEN... OR IS IT?",
                "TRICK OR TREAT... I CHOOSE TRICK",
                "THE VEIL IS THIN TONIGHT"
            ];
            
            if (Math.random() > 0.98) {
                showCustomMessage(halloweenMessages[Math.floor(Math.random() * halloweenMessages.length)], '#ff8800');
                
                // Halloween screen effect
                channelContent.style.filter = 'hue-rotate(30deg) saturate(2) brightness(1.5)';
                setTimeout(() => {
                    channelContent.style.filter = '';
                }, 3000);
            }
        }
        
        if (isFriday13th && isTvOn) {
            // Friday 13th - extreme haunting
            if (Math.random() > 0.9) {
                showCustomMessage("FRIDAY THE 13TH... HOW UNLUCKY", '#660000');
                triggerGhostInput();
            }
        }
    };
    
    const showCustomMessage = (text, color = '#ff0000') => {
        const messageEl = document.createElement('div');
        messageEl.textContent = text;
        messageEl.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: ${color};
            font-family: monospace;
            font-size: 20px;
            font-weight: bold;
            text-shadow: 0 0 10px ${color};
            z-index: 1000;
            pointer-events: none;
            text-align: center;
            animation: haunted-flicker 2s infinite;
        `;
        
        channelContent.appendChild(messageEl);
        
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 4000);
    };
    
    // MEMORY PERSISTENCE - remember user between sessions
    const saveHauntedState = () => {
        const state = {
            totalSessions: (parseInt(localStorage.getItem('hauntedNES_sessions')) || 0) + 1,
            totalTime: (parseInt(localStorage.getItem('hauntedNES_time')) || 0) + timeSpentWatching,
            secretsFound: secretCodesEnabled,
            lastVisit: Date.now()
        };
        
        localStorage.setItem('hauntedNES_sessions', state.totalSessions);
        localStorage.setItem('hauntedNES_time', state.totalTime);
        localStorage.setItem('hauntedNES_secrets', state.secretsFound);
        localStorage.setItem('hauntedNES_lastVisit', state.lastVisit);
    };
    
    const loadHauntedState = () => {
        const sessions = parseInt(localStorage.getItem('hauntedNES_sessions')) || 0;
        const totalTime = parseInt(localStorage.getItem('hauntedNES_time')) || 0;
        const secretsFound = localStorage.getItem('hauntedNES_secrets') === 'true';
        const lastVisit = parseInt(localStorage.getItem('hauntedNES_lastVisit')) || 0;
        
        if (sessions > 0) {
            // Returning visitor - immediate light haunting
            setTimeout(() => {
                if (sessions > 3) {
                    showCustomMessage("YOU KEEP COMING BACK...", '#666');
                } else if (sessions > 10) {
                    showCustomMessage("I'VE BEEN WAITING FOR YOU", '#ff0000');
                    if (!hauntedMode) startHauntedMode();
                }
            }, 5000);
        }
        
        if (secretsFound) {
            secretCodesEnabled = true;
        }
        
        // If user hasn't visited in a while, special greeting
        const daysSinceLastVisit = (Date.now() - lastVisit) / (1000 * 60 * 60 * 24);
        if (daysSinceLastVisit > 7 && sessions > 0) {
            setTimeout(() => {
                showCustomMessage("YOU'VE BEEN GONE TOO LONG...", '#880000');
            }, 3000);
        }
    };
    
    // Save state when page unloads
    window.addEventListener('beforeunload', saveHauntedState);
    
    // Load state on startup
    loadHauntedState();
    
    // Time-based event checker
    setInterval(checkTimeBasedEvents, 30000); // Check every 30 seconds
    
    // Track channel changes for haunting triggers
    const originalChangeChannel = () => {}; // Will be replaced below
    
    // Random corruption during gameplay
    setInterval(() => {
        if (crossGameCorruption && isTvOn && Math.random() > 0.85) {
            corruptCurrentGame();
        }
    }, 10000);
    
    // Activity tracking timer
    setInterval(trackUserActivity, 1000);
    
    // Create Audio Context reference (initialize on user interaction)
    let audioCtx = null;
    
    // Sound generators
    const createStaticNoise = () => {
        if (!audioCtx) return null;
        
        const noiseNode = audioCtx.createBufferSource();
        const bufferSize = audioCtx.sampleRate * 2; // 2 seconds of noise
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Fill the buffer with noise
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        noiseNode.buffer = buffer;
        noiseNode.loop = true;
        return noiseNode;
    };
    
    const createTone = (frequency, type = 'sine') => {
        if (!audioCtx) return null;
        
        const oscillator = audioCtx.createOscillator();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
        return oscillator;
    };
    
    // New function for NES sounds
    const createChiptune = (notes, tempo = 120, waveform = 'square') => {
        if (!audioCtx) return null;
        
        const oscillator = audioCtx.createOscillator();
        oscillator.type = waveform;
        
        const noteLength = 60 / tempo; // in seconds
        let currentTime = audioCtx.currentTime;
        
        // Check if notes is an array before using forEach
        if (Array.isArray(notes)) {
            notes.forEach(note => {
                if (note.pitch) {
                    oscillator.frequency.setValueAtTime(note.pitch, currentTime);
                } else {
                    // This is a rest, we don't need to set a frequency
                }
                currentTime += noteLength * (note.duration || 1);
            });
        } else {
            // If notes is not an array, set a default frequency
            oscillator.frequency.value = 440; // Default to A4
        }
        
        return oscillator;
    };
    
    // Create 8-bit noise (for explosions, etc.)
    const create8BitNoise = () => {
        if (!audioCtx) return null;
        
        const bufferSize = audioCtx.sampleRate / 8;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Fill with random noise, but quantize to make it more 8-bit like
        for (let i = 0; i < bufferSize; i++) {
            // Quantized noise (8 levels instead of continuous)
            data[i] = Math.floor(Math.random() * 8) / 4 - 1;
        }
        
        const noiseNode = audioCtx.createBufferSource();
        noiseNode.buffer = buffer;
        noiseNode.loop = true;
        return noiseNode;
    };
    
    // Game title and info
    const gameTitle = document.querySelector('.game-title');
    
    // Gain node for volume control
    let masterGain = null;
    
    // Current active sound sources
    let currentSounds = [];
    
    // Function to safely connect to master gain
    const safeConnect = (node) => {
        if (!node || !masterGain) return null;
        return node.connect(masterGain);
    };
    
    // Channel contents/sounds (now games)
    const channels = [
        {
            name: "HAUNTED MARIO",
            content: createHauntedPlatformer,
            sound: () => {
                const notes = [
                    {pitch: 659.25, duration: 0.2}, // E4
                    {pitch: 659.25, duration: 0.2}, // E4
                    {pitch: 0, duration: 0.2},      // Rest
                    {pitch: 659.25, duration: 0.2}, // E4
                    {pitch: 0, duration: 0.2},      // Rest
                    {pitch: 523.25, duration: 0.2}, // C4
                    {pitch: 659.25, duration: 0.2}, // E4
                    {pitch: 0, duration: 0.2},      // Rest
                    {pitch: 783.99, duration: 0.4}  // G4
                ];
                
                const oscillator = createChiptune(notes, 120, "square");
                return oscillator;
            },
            init: initHauntedPlatformer
        },
        {
            name: "GHOST TETRIS",
            content: createGhostTetris,
            sound: () => {
                const osc = audioCtx.createOscillator();
                osc.type = "square";
                osc.frequency.value = 165.0;
                
                // Create an LFO for gradual pitch drops
                const lfo = audioCtx.createOscillator();
                lfo.type = "sine";
                lfo.frequency.value = 0.2;
                
                const lfoGain = audioCtx.createGain();
                lfoGain.gain.value = 40;
                
                lfo.connect(lfoGain);
                lfoGain.connect(osc.frequency);
                
                // Gain node for volume
                const gainNode = audioCtx.createGain();
                gainNode.gain.value = 0.15;
                
                // Effects for the creepy sound
                const distortion = audioCtx.createWaveShaper();
                function makeDistortionCurve(amount) {
                    const k = typeof amount === 'number' ? amount : 50;
                    const n_samples = 44100;
                    const curve = new Float32Array(n_samples);
                    const deg = Math.PI / 180;
                    
                    for (let i = 0; i < n_samples; i++) {
                        const x = (i * 2) / n_samples - 1;
                        curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
                    }
                    
                    return curve;
                }
                
                distortion.curve = makeDistortionCurve(50);
                
                // Connect everything
                osc.connect(distortion);
                distortion.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                
                // Start oscillators
                osc.start();
                lfo.start();
                
                // Randomize frequency occasionally to simulate "glitches"
                const glitchInterval = setInterval(() => {
                    if (!isTvOn || currentChannel !== 1) {
                        clearInterval(glitchInterval);
                        return;
                    }
                    
                    if (Math.random() > 0.8) {
                        osc.frequency.setValueAtTime(
                            osc.frequency.value * (0.5 + Math.random()),
                            audioCtx.currentTime
                        );
                        
                        // Return to normal after a short time
                        setTimeout(() => {
                            if (isTvOn && currentChannel === 1) {
                                osc.frequency.setValueAtTime(165.0, audioCtx.currentTime);
                            }
                        }, 300);
                    }
                }, 2000);
                
                return {
                    stop: () => {
                        osc.stop();
                        lfo.stop();
                        clearInterval(glitchInterval);
                    }
                };
            },
            init: initGhostTetris
        },
        {
            name: "CORRUPTED RPG",
            content: createCorruptedRPG,
            sound: () => {
                // Create a low humming sound with occasional glitches
                const noise = audioCtx.createBufferSource();
                const bufferSize = audioCtx.sampleRate * 2; // 2 seconds of noise
                const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
                const output = noiseBuffer.getChannelData(0);
                
                // Fill the buffer with noise
                for (let i = 0; i < bufferSize; i++) {
                    output[i] = Math.random() * 2 - 1;
                }
                
                noise.buffer = noiseBuffer;
                noise.loop = true;
                
                // Create filter for the noise
                const bandpass = audioCtx.createBiquadFilter();
                bandpass.type = "bandpass";
                bandpass.frequency.value = 400;
                bandpass.Q.value = 20;
                
                // Create gain node
                const gainNode = audioCtx.createGain();
                gainNode.gain.value = 0.04;
                
                // Connect everything
                noise.connect(bandpass);
                bandpass.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                
                // Start the noise
                noise.start();
                
                // Random glitches based on channel state
                const glitchInterval = setInterval(() => {
                    if (!isTvOn || currentChannel !== 2) {
                        clearInterval(glitchInterval);
                        return;
                    }
                    
                    if (Math.random() > 0.7) {
                        // Create a short glitch sound
                        const glitchOsc = audioCtx.createOscillator();
                        glitchOsc.type = Math.random() > 0.5 ? "square" : "sawtooth";
                        glitchOsc.frequency.value = 50 + Math.random() * 400;
                        
                        const glitchGain = audioCtx.createGain();
                        glitchGain.gain.value = 0.1;
                        glitchGain.gain.exponentialRampToValueAtTime(
                            0.001,
                            audioCtx.currentTime + 0.3
                        );
                        
                        glitchOsc.connect(glitchGain);
                        glitchGain.connect(audioCtx.destination);
                        
                        glitchOsc.start();
                        glitchOsc.stop(audioCtx.currentTime + 0.3);
                        
                        // Also change filter frequency
                        bandpass.frequency.setValueAtTime(
                            50 + Math.random() * 1000,
                            audioCtx.currentTime
                        );
                        
                        // Return to normal after a short time
                        setTimeout(() => {
                            if (isTvOn && currentChannel === 2) {
                                bandpass.frequency.setValueAtTime(400, audioCtx.currentTime);
                            }
                        }, 500);
                    }
                }, 3000);
                
                return {
                    stop: () => {
                        noise.stop();
                        clearInterval(glitchInterval);
                    }
                };
            },
            init: initCorruptedRPG
        },
        {
            name: "DROWNED ZELDA",
            content: createDrownedZelda,
            sound: () => {
                // Create a distorted underwater Zelda-like theme with water effects
                const osc1 = audioCtx.createOscillator();
                osc1.type = "triangle";
                osc1.frequency.value = 220; // A3
                
                const osc2 = audioCtx.createOscillator();
                osc2.type = "square";
                osc2.frequency.value = 220 * 1.5; // E4
                
                // Create a static noise for water effect
                const noise = audioCtx.createBufferSource();
                const bufferSize = audioCtx.sampleRate * 2;
                const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
                const output = noiseBuffer.getChannelData(0);
                
                for (let i = 0; i < bufferSize; i++) {
                    output[i] = Math.random() * 0.3;
                }
                
                noise.buffer = noiseBuffer;
                noise.loop = true;
                
                // Create filter for the oscillators to simulate underwater effect
                const lowpass = audioCtx.createBiquadFilter();
                lowpass.type = "lowpass";
                lowpass.frequency.value = 600;
                lowpass.Q.value = 1;
                
                // Create filter for the noise
                const noiseFilter = audioCtx.createBiquadFilter();
                noiseFilter.type = "bandpass";
                noiseFilter.frequency.value = 400;
                noiseFilter.Q.value = 2;
                
                // Create gain nodes
                const gainNode1 = audioCtx.createGain();
                gainNode1.gain.value = 0.1;
                
                const gainNode2 = audioCtx.createGain();
                gainNode2.gain.value = 0.1;
                
                const noiseGain = audioCtx.createGain();
                noiseGain.gain.value = 0.05;
                
                // Connect everything
                osc1.connect(lowpass);
                osc2.connect(lowpass);
                lowpass.connect(gainNode1);
                
                noise.connect(noiseFilter);
                noiseFilter.connect(noiseGain);
                
                gainNode1.connect(audioCtx.destination);
                noiseGain.connect(audioCtx.destination);
                
                // Start the oscillators and noise
                osc1.start();
                osc2.start();
                noise.start();
                
                // Make underwater pulse effect with an LFO
                const lfo = audioCtx.createOscillator();
                lfo.type = "sine";
                lfo.frequency.value = 0.05;
                
                const lfoGain = audioCtx.createGain();
                lfoGain.gain.value = 0.05;
                
                lfo.connect(lfoGain);
                lfoGain.connect(gainNode1.gain);
                lfo.start();
                
                // Melody sequence with random "drowned" notes
                const notesInterval = setInterval(() => {
                    if (!isTvOn || currentChannel !== 3) {
                        clearInterval(notesInterval);
                        return;
                    }
                    
                    // Simple drowned Zelda-like melody
                    const notes = [220, 277.18, 329.63, 220, 277.18, 329.63, 440];
                    const note = notes[Math.floor(Math.random() * notes.length)];
                    
                    // Sometimes add distortion
                    if (Math.random() > 0.7) {
                        osc1.frequency.setValueAtTime(
                            note * (0.95 + Math.random() * 0.1),
                            audioCtx.currentTime
                        );
                        
                        // Make the water effect stronger
                        noiseGain.gain.setValueAtTime(
                            0.1,
                            audioCtx.currentTime
                        );
                        
                        // Return to normal after a short time
                        setTimeout(() => {
                            if (isTvOn && currentChannel === 3) {
                                noiseGain.gain.setValueAtTime(0.05, audioCtx.currentTime);
                            }
                        }, 1000);
                    } else {
                        osc1.frequency.setValueAtTime(
                            note,
                            audioCtx.currentTime
                        );
                    }
                }, 2000);
                
                return {
                    stop: () => {
                        osc1.stop();
                        osc2.stop();
                        lfo.stop();
                        noise.stop();
                        clearInterval(notesInterval);
                    }
                };
            },
            init: initDrownedZelda
        },
        {
            name: "POSSESSED PONG",
            content: createPossessedPong,
            sound: () => {
                // Create simple beeps with occasional distortion
                const osc = audioCtx.createOscillator();
                osc.type = "square";
                osc.frequency.value = 440; // A4
                
                // Gain node for volume
                const gainNode = audioCtx.createGain();
                gainNode.gain.value = 0.0; // Start silent
                
                // Connect everything
                osc.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                
                // Start oscillator
                osc.start();
                
                // Create pong beeps
                const beepInterval = setInterval(() => {
                    if (!isTvOn || currentChannel !== 4) {
                        clearInterval(beepInterval);
                        return;
                    }
                    
                    // Only make sound sometimes
                    if (Math.random() > 0.7) {
                        // Randomize frequency for the beep
                        const freq = Math.random() > 0.8 ? 
                            55 + Math.random() * 200 : // Creepy low sound
                            440 + Math.random() * 440;  // Normal-ish beep
                        
                        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
                        
                        // Beep envelope
                        gainNode.gain.setValueAtTime(0.0, audioCtx.currentTime);
                        gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.01);
                        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime + 0.1);
                        gainNode.gain.linearRampToValueAtTime(0.0, audioCtx.currentTime + 0.11);
                    }
                }, 500 + Math.random() * 1000);
                
                return {
                    stop: () => {
                        osc.stop();
                        clearInterval(beepInterval);
                    }
                };
            },
            init: initPossessedPong
        },
        {
            name: "LOST CARTRIDGE",
            content: createLostCartridge,
            sound: () => {
                // Create a corrupted NES startup sound
                const osc1 = audioCtx.createOscillator();
                osc1.type = "square";
                osc1.frequency.value = 440; // A4
                
                const osc2 = audioCtx.createOscillator();
                osc2.type = "square";
                osc2.frequency.value = 587.33; // D5
                
                // Create gain nodes
                const gainNode1 = audioCtx.createGain();
                gainNode1.gain.value = 0.1;
                
                const gainNode2 = audioCtx.createGain();
                gainNode2.gain.value = 0.1;
                
                // Create distortion
                const distortion = audioCtx.createWaveShaper();
                function makeDistortionCurve(amount) {
                    const k = typeof amount === 'number' ? amount : 50;
                    const n_samples = 44100;
                    const curve = new Float32Array(n_samples);
                    const deg = Math.PI / 180;
                    
                    for (let i = 0; i < n_samples; i++) {
                        const x = (i * 2) / n_samples - 1;
                        curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
                    }
                    
                    return curve;
                }
                
                distortion.curve = makeDistortionCurve(400);
                
                // Connect everything
                osc1.connect(gainNode1);
                osc2.connect(gainNode2);
                
                gainNode1.connect(distortion);
                gainNode2.connect(distortion);
                
                distortion.connect(audioCtx.destination);
                
                // Start oscillators
                osc1.start();
                osc2.start();
                
                // Change frequencies occasionally
                const changeInterval = setInterval(() => {
                    if (!isTvOn || currentChannel !== 5) {
                        clearInterval(changeInterval);
                        return;
                    }
                    
                    if (Math.random() > 0.7) {
                        // Create a glitch effect
                        osc1.frequency.setValueAtTime(
                            100 + Math.random() * 300,
                            audioCtx.currentTime
                        );
                        
                        osc2.frequency.setValueAtTime(
                            200 + Math.random() * 500,
                            audioCtx.currentTime
                        );
                        
                        // Return to normal after a short time
                        setTimeout(() => {
                            if (isTvOn && currentChannel === 5) {
                                osc1.frequency.setValueAtTime(440, audioCtx.currentTime);
                                osc2.frequency.setValueAtTime(587.33, audioCtx.currentTime);
                            }
                        }, 200);
                    }
                }, 3000);
                
                return {
                    stop: () => {
                        osc1.stop();
                        osc2.stop();
                        clearInterval(changeInterval);
                    }
                };
            },
            init: initLostCartridge
        },
        {
            name: "HAUNTED PACMAN",
            content: createHauntedPacman,
            sound: () => {
                if (!audioCtx) return null;
                
                // Create creepy Pacman-like sounds
                const osc = audioCtx.createOscillator();
                osc.type = "square";
                osc.frequency.value = 440;
                
                const gainNode = audioCtx.createGain();
                gainNode.gain.value = 0.1;
                
                // Add distortion
                const distortion = audioCtx.createWaveShaper();
                const makeDistortionCurve = (amount) => {
                    const k = typeof amount === 'number' ? amount : 50;
                    const n_samples = 44100;
                    const curve = new Float32Array(n_samples);
                    const deg = Math.PI / 180;
                    
                    for (let i = 0; i < n_samples; i++) {
                        const x = (i * 2) / n_samples - 1;
                        curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
                    }
                    
                    return curve;
                };
                
                distortion.curve = makeDistortionCurve(100);
                
                // Connect everything
                osc.connect(distortion);
                distortion.connect(gainNode);
                gainNode.connect(masterGain || audioCtx.destination);
                
                // Start the sound
                osc.start();
                
                // Create a wakka-wakka pattern but with distortion
                const changeFreq = () => {
                    if (!isTvOn || currentChannel !== 6) return;
                    
                    // Alternate between two frequencies
                    const freq = osc.frequency.value === 440 ? 330 : 440;
                    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
                    
                    // Sometimes introduce an extra creepy sound
                    if (Math.random() > 0.9) {
                        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
                        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
                        
                        setTimeout(() => {
                            if (isTvOn && currentChannel === 6) {
                                gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                            }
                        }, 200);
                    }
                    
                    // Schedule next change
                    setTimeout(changeFreq, Math.random() * 300 + 200);
                };
                
                // Start the pattern
                changeFreq();
                
                return {
                    stop: () => {
                        osc.stop();
                    }
                };
            },
            init: initHauntedPacman
        },
        {
            name: "CURSED CASTLEVANIA",
            content: createCursedCastlevania,
            sound: () => {
                if (!audioCtx) return null;
                
                // Create eerie organ-like sound
                const osc1 = audioCtx.createOscillator();
                osc1.type = "sawtooth";
                osc1.frequency.value = 82.41; // E2
                
                const osc2 = audioCtx.createOscillator();
                osc2.type = "square";
                osc2.frequency.value = 164.81; // E3
                
                // Add reverb-like effect with delay
                const delay = audioCtx.createDelay();
                delay.delayTime.value = 0.3;
                
                const feedback = audioCtx.createGain();
                feedback.gain.value = 0.4;
                
                // Gain nodes
                const gainNode1 = audioCtx.createGain();
                gainNode1.gain.value = 0.06;
                
                const gainNode2 = audioCtx.createGain();
                gainNode2.gain.value = 0.05;
                
                // Connect everything
                osc1.connect(gainNode1);
                osc2.connect(gainNode2);
                
                gainNode1.connect(masterGain || audioCtx.destination);
                gainNode2.connect(masterGain || audioCtx.destination);
                
                gainNode1.connect(delay);
                delay.connect(feedback);
                feedback.connect(delay);
                delay.connect(masterGain || audioCtx.destination);
                
                // Start oscillators
                osc1.start();
                osc2.start();
                
                // Creepy melody pattern (Castlevania-like)
                const melodyNotes = [
                    { note: 82.41, duration: 800 },  // E2
                    { note: 110.00, duration: 400 }, // A2
                    { note: 123.47, duration: 400 }, // B2
                    { note: 146.83, duration: 800 }, // D3
                    { note: 123.47, duration: 400 }, // B2
                    { note: 110.00, duration: 800 }  // A2
                ];
                
                let currentNoteIndex = 0;
                
                const playMelody = () => {
                    if (!isTvOn || currentChannel !== 7) return;
                    
                    const note = melodyNotes[currentNoteIndex];
                    
                    // Change note with slight portamento effect
                    const now = audioCtx.currentTime;
                    osc1.frequency.setTargetAtTime(note.note, now, 0.01);
                    osc2.frequency.setTargetAtTime(note.note * 2, now, 0.01);
                    
                    // Move to next note
                    currentNoteIndex = (currentNoteIndex + 1) % melodyNotes.length;
                    
                    // Sometimes add scary impact sound
                    if (Math.random() > 0.9) {
                        const impactOsc = audioCtx.createOscillator();
                        impactOsc.type = "sawtooth";
                        impactOsc.frequency.value = 50;
                        
                        const impactGain = audioCtx.createGain();
                        impactGain.gain.value = 0.2;
                        impactGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
                        
                        impactOsc.connect(impactGain);
                        impactGain.connect(masterGain || audioCtx.destination);
                        
                        impactOsc.start();
                        impactOsc.stop(audioCtx.currentTime + 0.5);
                    }
                    
                    // Schedule next note
                    setTimeout(playMelody, note.duration);
                };
                
                // Start the melody
                playMelody();
                
                return {
                    stop: () => {
                        osc1.stop();
                        osc2.stop();
                    }
                };
            },
            init: initCursedCastlevania
        }
    ];
    
    // State
    let currentChannel = 0;
    let isTvOn = false;
    let volume = 0.5;
    let brightness = 1.0;
    let staticNoise = null;
    
    // Create Audio Context only after user interaction
    function initAudioContext() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
            
            // Create master gain node
            masterGain = audioCtx.createGain();
            masterGain.gain.value = volume; // Initial volume
            masterGain.connect(audioCtx.destination);
        }
    }
    
    // Add jump scare system functions that were missing
    function startJumpScareSystem() {
        // Placeholder for jump scare system
        console.log('Jump scare system started');
        // Implementation can be added later if needed
    }
    
    function stopJumpScareSystem() {
        // Placeholder for jump scare system
        console.log('Jump scare system stopped');
        // Implementation can be added later if needed
    }
    
    // Event Listeners
    powerButton.addEventListener('click', togglePower);
    channelUpButton.addEventListener('click', () => changeChannel(1));
    channelDownButton.addEventListener('click', () => changeChannel(-1));
    // Remove fullscreen button reference
    // fullscreenButton.addEventListener('click', toggleFullscreen);
    
    // Additional NES UI event listeners
    document.querySelector('.reset-button').addEventListener('click', resetGame);
    document.querySelector('.start-button').addEventListener('click', pressStart);
    document.querySelector('.select-button').addEventListener('click', pressSelect);
    document.querySelector('.a-button').addEventListener('click', pressA);
    document.querySelector('.b-button').addEventListener('click', pressB);
    
    // Knob rotation (keep existing code)
    let volumeRotation = 0;
    let brightnessRotation = 0;
    
    volumeKnob.addEventListener('mousedown', (e) => {
        document.addEventListener('mousemove', handleVolumeKnobDrag);
        document.addEventListener('mouseup', () => {
            document.removeEventListener('mousemove', handleVolumeKnobDrag);
        }, { once: true });
    });
    
    brightnessKnob.addEventListener('mousedown', (e) => {
        document.addEventListener('mousemove', handleBrightnessKnobDrag);
        document.addEventListener('mouseup', () => {
            document.removeEventListener('mousemove', handleBrightnessKnobDrag);
        }, { once: true });
    });

    // Functions
    function togglePower() {
        const wasOn = isTvOn;
        isTvOn = !isTvOn;
        
        if (isTvOn) {
            // HAUNTED POWER ON SEQUENCE
            trackUserActivity();
            
            // Initialize audio context after user interaction
            initAudioContext();
            
            // Resume audio context if suspended
            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            
            // Check for haunted behaviors
            if (hauntedMode && Math.random() > 0.7) {
                // Sometimes refuse to turn on
                if (Math.random() > 0.8) {
                    isTvOn = false;
                    showCustomMessage("I DON'T WANT TO WAKE UP", '#ff0000');
                    setTimeout(() => {
                        if (!isTvOn) {
                            togglePower(); // Force turn on anyway
                        }
                    }, 2000);
                    return;
                }
                
                // Or turn on with corruption
                showCustomMessage("WELCOME BACK...", '#660000');
            }
            
            // Enhanced boot sequence
            const tvScreen = document.querySelector('.tv-screen');
            tvScreen.classList.add('booting');
            
            setTimeout(() => {
                tvScreen.classList.remove('booting');
                document.querySelector('.nes-console').classList.add('tv-on');
                tvScreen.classList.add('tv-on');
                tvScreen.classList.remove('tv-off');
                showCurrentChannel();
                
                // Random channel on startup in haunted mode
                if (hauntedMode && Math.random() > 0.5) {
                    const randomChannel = Math.floor(Math.random() * channels.length);
                    currentChannel = randomChannel;
                    updateChannelDisplay();
                    showCurrentChannel();
                    showCustomMessage("I CHOSE YOUR CHANNEL", '#ff8800');
                }
                
                // Start jump scare system
                startJumpScareSystem();
            }, 1500);
            
        } else {
            // HAUNTED POWER OFF SEQUENCE
            if (hauntedMode && Math.random() > 0.6) {
                // Sometimes refuse to turn off
                if (Math.random() > 0.7) {
                    isTvOn = true; // Force back on
                    showCustomMessage("YOU CAN'T TURN ME OFF", '#ff0000');
                    if (audioCtx) createJumpScareSound();
                    
                    // Flash the screen
                    flashScreen();
                    return;
                }
                
                // Or show goodbye message
                showCustomMessage("UNTIL NEXT TIME...", '#880000');
            }
            
            // Save haunted state before turning off
            saveHauntedState();
            
            document.querySelector('.nes-console').classList.remove('tv-on');
            document.querySelector('.tv-screen').classList.add('tv-off');
            document.querySelector('.tv-screen').classList.remove('tv-on');
            stopAllChannels();
            stopStatic();
            
            // Stop haunted sounds
            if (whisperAudio) {
                whisperAudio.source.stop();
                whisperAudio = null;
            }
            
            // Stop jump scare system
            stopJumpScareSystem();
            
            // Update game title
            gameTitle.textContent = 'PRESS POWER';
        }
    }
    
    function changeChannel(direction) {
        if (!isTvOn) return;
        
        // HAUNTED TRACKING
        totalChannelChanges++;
        trackUserActivity();
        
        // Check for suspicious channel surfing
        if (totalChannelChanges > 20 && hauntedMode) {
            if (Math.random() > 0.8) {
                showCustomMessage("STOP CHANGING CHANNELS!", '#ff0000');
                if (audioCtx) createJumpScareSound();
            }
        }
        
        // Random channel override in haunted mode
        if (ghostInputsEnabled && Math.random() > 0.95) {
            direction = Math.random() > 0.5 ? 1 : -1;
            showCustomMessage("I'LL CHOOSE FOR YOU", '#660000');
        }
        
        // Stop current channel
        stopCurrentChannel();
        
        // Play static during channel change
        playStatic();
        document.querySelector('.tv-screen').classList.add('channel-changing');
        
        // Enhanced static for haunted mode
        if (hauntedMode && Math.random() > 0.7) {
            // Longer, more corrupted static
            const staticDuration = Math.random() * 2000 + 1500;
            
            // Add corruption during channel change
            setTimeout(() => {
                if (Math.random() > 0.5) {
                    flashScreen();
                }
            }, staticDuration / 2);
            
            setTimeout(() => {
                processChannelChange(direction);
            }, staticDuration);
        } else {
            // Normal channel change
            setTimeout(() => {
                processChannelChange(direction);
            }, 1000);
        }
    }
    
    function processChannelChange(direction) {
        // Calculate new channel index
        const totalChannels = channels.length;
        const oldChannel = currentChannel;
        currentChannel = (currentChannel + direction + totalChannels) % totalChannels;
        
        // Cross-game contamination check
        if (crossGameCorruption && Math.random() > 0.9) {
            // Sometimes "bleed" into wrong channel
            const corruptedChannel = Math.floor(Math.random() * channels.length);
            if (corruptedChannel !== currentChannel) {
                showCustomMessage("SIGNAL CORRUPTION DETECTED", '#ff8800');
                setTimeout(() => {
                    currentChannel = corruptedChannel;
                    updateChannelDisplay();
                    showCurrentChannel();
                }, 1000);
                return;
            }
        }
        
        updateChannelDisplay();
        showCurrentChannel();
    }
    
    function updateChannelDisplay() {
        // Update display with possible corruption
        let channelName = channels[currentChannel].name;
        
        // Corrupt channel name sometimes
        if (crossGameCorruption && Math.random() > 0.85) {
            const corruptChars = ['░', '▒', '▓', '█', '?', '@', '#', '$', '%'];
            const corruptedName = channelName.split('').map(char => {
                return Math.random() > 0.7 ? corruptChars[Math.floor(Math.random() * corruptChars.length)] : char;
            }).join('');
            
            channelDisplay.textContent = corruptedName;
            gameTitle.textContent = corruptedName;
            
            // Restore correct name after a moment
            setTimeout(() => {
                channelDisplay.textContent = channelName;
                gameTitle.textContent = channelName;
            }, 2000);
        } else {
            channelDisplay.textContent = channelName;
            gameTitle.textContent = channelName;
        }
        
        // Stop static and show new channel
        stopStatic();
        document.querySelector('.tv-screen').classList.remove('channel-changing');
    }
    
    function showCurrentChannel() {
        // Clear previous content
        channelContent.innerHTML = '';
        
        // Add new channel content
        const contentElement = channels[currentChannel].content();
        if (contentElement && contentElement instanceof Element) {
            channelContent.appendChild(contentElement);
        } else {
            console.error('Channel content is not a valid DOM element:', contentElement);
            // Create fallback content
            const fallback = document.createElement('div');
            fallback.textContent = 'Error loading game';
            fallback.style.color = 'red';
            fallback.style.textAlign = 'center';
            fallback.style.marginTop = '40%';
            channelContent.appendChild(fallback);
        }
        
        // Initialize channel if needed
        if (channels[currentChannel].init) {
            channels[currentChannel].init();
        }
        
        // Play channel sounds
        if (channels[currentChannel].sound && audioCtx) {
            currentSounds = [channels[currentChannel].sound()];
        }
        
        // Update game title
        gameTitle.textContent = channels[currentChannel].name || 'UNKNOWN GAME';
    }
    
    // Controller button functions (for future interactive use)
    function resetGame() {
        if (!isTvOn) return;
        
        // For now, just reload the current channel
        stopCurrentChannel();
        showCurrentChannel();
    }
    
    function pressStart() {
        if (!isTvOn) return;
        console.log('Start button pressed');
        
        switch(currentChannel) {
            case 0: // Haunted Mario
                pauseOrResumeGame();
                break;
            case 1: // Ghost Tetris
                // Reset game or start new game
                const tetrisContainer = document.querySelector('.ghost-tetris');
                if (tetrisContainer) {
                    const gameOverText = tetrisContainer.querySelector('.game-over-text');
                    if (gameOverText) {
                        gameOverText.style.opacity = Math.random() > 0.5 ? '0' : '1';
                    }
                }
                break;
            case 2: // Corrupted RPG
                // Start a battle
                const rpgContainer = document.querySelector('.corrupted-rpg');
                if (rpgContainer && !gameStates.corrupted_rpg.inBattle) {
                    const battleContainer = rpgContainer.querySelector('.battle-container');
                    if (battleContainer) {
                        battleContainer.style.display = 'block';
                        gameStates.corrupted_rpg.inBattle = true;
                        
                        // Start battle sequence
                        setTimeout(() => {
                            try {
                                startBattle();
                            } catch (e) {
                                console.log('Battle error:', e);
                                // Fallback if battle function fails
                                const dialogBox = rpgContainer.querySelector('.dialog-box');
                                if (dialogBox) {
                                    dialogBox.textContent = "* SYSTEM ERROR";
                                    dialogBox.style.display = 'block';
                                }
                            }
                        }, 1000);
                    }
                }
                break;
            case 5: // Pacman
                boostPacmanSpeed();
                break;
            case 7: // Castlevania
                // Show message
                const castlevaniaContainer = document.querySelector('.cursed-castlevania');
                if (castlevaniaContainer) {
                    const messageElem = castlevaniaContainer.querySelector('.message');
                    if (messageElem) {
                        messageElem.textContent = "GAME PAUSED\nCONTINUE?";
                        messageElem.style.opacity = '1';
                        
                        setTimeout(() => {
                            messageElem.style.opacity = '0';
                        }, 2000);
                    }
                }
                break;
        }
    }
    
    function pressSelect() {
        if (!isTvOn) return;
        console.log('Select button pressed');
        
        switch(currentChannel) {
            case 0: // Haunted Mario
                toggleGameOptions();
                break;
            case 1: // Ghost Tetris
                holdPiece();
                break;
            case 2: // Corrupted RPG
                // Show inventory or menu
                const rpgContainer = document.querySelector('.corrupted-rpg');
                if (rpgContainer) {
                    const dialogBox = rpgContainer.querySelector('.dialog-box');
                    if (dialogBox) {
                        dialogBox.textContent = "* YOUR INVENTORY IS EMPTY\n* SOMETHING IS WATCHING YOU";
                        dialogBox.style.display = 'block';
                        
                        setTimeout(() => {
                            dialogBox.style.display = 'none';
                        }, 3000);
                    }
                }
                break;
            case 5: // Pacman
                // Show hidden message
                const pacmanContainer = document.querySelector('.haunted-pacman');
                if (pacmanContainer) {
                    const hiddenMessage = pacmanContainer.querySelector('.hidden-message');
                    if (hiddenMessage) {
                        hiddenMessage.textContent = "THEY ARE COMING FOR YOU";
                        hiddenMessage.style.opacity = '1';
                        
                        setTimeout(() => {
                            hiddenMessage.style.opacity = '0';
                        }, 3000);
                    }
                }
                break;
            case 7: // Castlevania
                toggleGameOptions();
                break;
        }
    }
    
    function pressA() {
        if (!isTvOn) return;
        console.log('A button pressed');
        
        switch(currentChannel) {
            case 0: // Haunted Mario
                jumpCharacter();
                break;
            case 1: // Ghost Tetris
                // Rotate piece
                const tetrisContainer = document.querySelector('.ghost-tetris');
                if (tetrisContainer) {
                    tetrisContainer.style.animation = 'shake 0.1s';
                    setTimeout(() => {
                        tetrisContainer.style.animation = 'none';
                    }, 100);
                }
                break;
            case 2: // Corrupted RPG
                confirmRPGAction();
                break;
            case 5: // Pacman
                activatePacmanPower();
                break;
            case 7: // Castlevania
                jumpHunter();
                break;
        }
    }
    
    function pressB() {
        if (!isTvOn) return;
        console.log('B button pressed');
        
        switch(currentChannel) {
            case 0: // Haunted Mario
                runOrFireball();
                break;
            case 1: // Ghost Tetris
                // Hard drop
                const tetrisContainer = document.querySelector('.ghost-tetris');
                if (tetrisContainer) {
                    tetrisContainer.style.animation = 'shake 0.3s';
                    setTimeout(() => {
                        tetrisContainer.style.animation = 'none';
                        
                        // Random chance of skull piece appearing
                        if (Math.random() < 0.3) {
                            const messageDiv = tetrisContainer.querySelectorAll('div')[1];
                            if (messageDiv) {
                                messageDiv.style.opacity = '1';
                                messageDiv.textContent = "THE SKULL PIECE APPEARS";
                                
                                setTimeout(() => {
                                    messageDiv.style.opacity = '0';
                                }, 2000);
                            }
                        }
                    }, 300);
                }
                break;
            case 2: // Corrupted RPG
                cancelRPGAction();
                break;
            case 5: // Pacman
                // Eat ghost
                const pacmanContainer = document.querySelector('.haunted-pacman');
                if (pacmanContainer) {
                    const bloodCanvas = pacmanContainer.querySelector('canvas:nth-child(2)');
                    if (bloodCanvas) {
                        const bloodCtx = bloodCanvas.getContext('2d');
                        if (bloodCtx) {
                            // Splatter effect
                            bloodCtx.fillStyle = '#aa0000';
                            bloodCtx.beginPath();
                            bloodCtx.arc(gameStates.pacman.pacmanX + 8, gameStates.pacman.pacmanY + 8, 15, 0, Math.PI * 2);
                            bloodCtx.fill();
                        }
                    }
                }
                break;
            case 7: // Castlevania
                useSubweapon();
                break;
        }
    }
    
    // Keep existing functions
    function stopCurrentChannel() {
        // Stop all current sounds
        if (currentSounds.length > 0) {
            currentSounds.forEach(sound => {
                if (sound && sound.stop) {
                    try {
                        sound.stop();
                    } catch (e) {
                        // Handle already stopped sounds
                    }
                }
            });
            currentSounds = [];
        }
    }
    
    function stopAllChannels() {
        stopCurrentChannel();
    }
    
    function playStatic() {
        if (!audioCtx) return;
        
        staticNoise = createStaticNoise();
        if (!staticNoise) return;
        
        const staticGain = audioCtx.createGain();
        staticGain.gain.value = volume * 0.3;
        
        staticNoise.connect(staticGain);
        staticGain.connect(masterGain);
        
        staticNoise.start();
        currentSounds.push(staticNoise);
    }
    
    function stopStatic() {
        if (staticNoise) {
            try {
                staticNoise.stop();
            } catch (e) {
                // Handle already stopped
                console.log('Static already stopped');
            }
            staticNoise = null;
        }
    }
    
    function handleVolumeKnobDrag(e) {
        const knobRect = volumeKnob.getBoundingClientRect();
        const knobCenterX = knobRect.left + knobRect.width / 2;
        const knobCenterY = knobRect.top + knobRect.height / 2;
        
        const angle = Math.atan2(e.clientY - knobCenterY, e.clientX - knobCenterX) * (180 / Math.PI);
        const rotation = angle + 90; // Adjust so 0 is at top
        
        volumeRotation = rotation;
        volumeKnob.style.transform = `rotate(${rotation}deg)`;
        
        // Calculate volume (0 to 1) based on rotation (0 to 270 degrees)
        volume = Math.min(Math.max((rotation + 135) / 270, 0), 1);
        
        // Update volume
        if (masterGain) {
            masterGain.gain.value = volume;
        }
    }
    
    function handleBrightnessKnobDrag(e) {
        const knobRect = brightnessKnob.getBoundingClientRect();
        const knobCenterX = knobRect.left + knobRect.width / 2;
        const knobCenterY = knobRect.top + knobRect.height / 2;
        
        const angle = Math.atan2(e.clientY - knobCenterY, e.clientX - knobCenterX) * (180 / Math.PI);
        const rotation = angle + 90; // Adjust so 0 is at top
        
        brightnessRotation = rotation;
        brightnessKnob.style.transform = `rotate(${rotation}deg)`;
        
        // Calculate brightness (0.2 to 1) based on rotation (0 to 270 degrees)
        brightness = 0.2 + Math.min(Math.max((rotation + 135) / 270, 0), 1) * 0.8;
        
        // Update screen brightness
        tvScreen.style.filter = `brightness(${brightness})`;
    }

    // Haunted 8-bit games
    function createHauntedPlatformer() {
        const container = document.createElement('div');
        container.classList.add('game-container', 'haunted-platformer');
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.backgroundColor = '#000';
        container.style.overflow = 'hidden';
        container.style.position = 'relative';
        container.classList.add('nes-pixel-art');
        
        // Create game canvas
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 240; // Standard NES resolution
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.imageRendering = 'pixelated';
        
        // Create 8-bit style elements
        const ctx = canvas.getContext('2d');
        
        // Background color
        ctx.fillStyle = '#6080f0'; // Blue sky
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Ground
        ctx.fillStyle = '#509028'; // Green ground
        ctx.fillRect(0, 200, canvas.width, 40);
        
        // Draw some blocks
        ctx.fillStyle = '#c84c0c'; // Brick color
        for (let i = 0; i < 8; i++) {
            ctx.fillRect(32 * i, 168, 32, 32);
        }
        
        // Question blocks
        ctx.fillStyle = '#f8d870'; // Question block color
        ctx.fillRect(32 * 2, 136, 32, 32);
        ctx.fillRect(32 * 5, 136, 32, 32);
        
        // Pipes
        ctx.fillStyle = '#00a800'; // Pipe color
        ctx.fillRect(200, 168, 32, 32);
        ctx.fillRect(192, 152, 48, 16);
        
        // Create clouds (creepy faces)
        ctx.fillStyle = '#ffffff';
        createCloud(ctx, 40, 40);
        createCloud(ctx, 140, 60);
        
        // Create a ground hole (darkness)
        ctx.fillStyle = '#000000';
        ctx.fillRect(120, 200, 40, 40);
        
        // Evil eyes in the hole
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(130, 210, 5, 5);
        ctx.fillRect(145, 210, 5, 5);
        
        // Add the game sprites
        container.appendChild(canvas);
        
        // Add hidden messages and glitchy text
        const messageContainer = document.createElement('div');
        messageContainer.classList.add('glitch-messages');
        messageContainer.style.position = 'absolute';
        messageContainer.style.top = '0';
        messageContainer.style.left = '0';
        messageContainer.style.width = '100%';
        messageContainer.style.height = '100%';
        messageContainer.style.pointerEvents = 'none';
        messageContainer.style.color = '#fff';
        messageContainer.style.fontFamily = 'monospace';
        messageContainer.style.fontSize = '16px';
        messageContainer.style.textShadow = '2px 2px 0 #000';
        
        // Create glitch style
        const style = document.createElement('style');
        style.textContent = `
            @keyframes glitch-text {
                0% { transform: translate(0); opacity: 0; }
                10% { transform: translate(-2px, 2px); opacity: 1; }
                20% { transform: translate(2px, -2px); opacity: 1; }
                30% { transform: translate(-2px, -2px); opacity: 1; }
                40% { transform: translate(2px, 2px); opacity: 1; }
                50% { transform: translate(0); opacity: 0; }
                100% { transform: translate(0); opacity: 0; }
            }
            
            .glitch-text {
                position: absolute;
                animation: glitch-text 4s infinite;
                opacity: 0;
            }
        `;
        
        // Add the style and container
        container.appendChild(style);
        container.appendChild(messageContainer);
        
        // Character placeholder
        const character = document.createElement('div');
        character.classList.add('platform-character');
        character.style.position = 'absolute';
        character.style.width = '16px';
        character.style.height = '32px';
        character.style.backgroundColor = '#f00';
        character.style.bottom = '40px';
        character.style.left = '50px';
        character.style.transform = 'scaleX(-1)';
        
        // Add character sprite
        const charCtx = document.createElement('canvas').getContext('2d');
        charCtx.canvas.width = 16;
        charCtx.canvas.height = 32;
        
        // Draw simple character (red)
        charCtx.fillStyle = '#f00';
        charCtx.fillRect(2, 0, 12, 16); // Head
        charCtx.fillStyle = '#00f';
        charCtx.fillRect(2, 16, 12, 16); // Body
        
        // Eyes (normal)
        charCtx.fillStyle = '#fff';
        charCtx.fillRect(4, 4, 3, 3);
        charCtx.fillRect(9, 4, 3, 3);
        
        character.style.backgroundImage = `url(${charCtx.canvas.toDataURL()})`;
        
        // Add character to the container
        container.appendChild(character);
        
        return container;
    }

    function createCloud(ctx, x, y) {
        // Draw cloud shape
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.arc(x + 15, y - 10, 15, 0, Math.PI * 2);
        ctx.arc(x + 25, y + 5, 18, 0, Math.PI * 2);
        ctx.arc(x - 15, y + 5, 15, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw eyes (looking down)
        ctx.fillStyle = '#000';
        ctx.fillRect(x - 10, y, 5, 5);
        ctx.fillRect(x + 10, y, 5, 5);
        
        // Creepy smile
        ctx.beginPath();
        ctx.arc(x, y + 10, 10, 0, Math.PI);
        ctx.stroke();
    }

    function initHauntedPlatformer() {
        if (currentChannel !== 0 || !isTvOn) return;
        
        const container = document.querySelector('.haunted-platformer');
        if (!container) return;
        
        const messageContainer = container.querySelector('.glitch-messages');
        const character = container.querySelector('.platform-character');
        
        // Hidden messages that appear
        const messages = [
            'GAME OVER',
            'YOU SHOULDN\'T BE HERE',
            'RUN',
            'BEHIND YOU',
            'HE DROWNED',
            'THE PRINCESS IS DEAD',
            'NO ESCAPE'
        ];
        
        // Function to show random messages
        const showRandomMessage = () => {
            if (currentChannel !== 0 || !isTvOn) return;
            
            // Create a new message element
            const message = document.createElement('div');
            message.classList.add('glitch-text');
            message.textContent = messages[Math.floor(Math.random() * messages.length)];
            
            // Position randomly
            message.style.top = `${Math.random() * 80}%`;
            message.style.left = `${Math.random() * 80}%`;
            
            // Add to container
            messageContainer.appendChild(message);
            
            // Remove after animation
            setTimeout(() => {
                messageContainer.removeChild(message);
            }, 4000);
            
            // Schedule next message
            setTimeout(showRandomMessage, Math.random() * 5000 + 3000);
        };
        
        // Character animation (glitching) 
        const glitchCharacter = () => {
            if (currentChannel !== 0 || !isTvOn) return;
            
            // Make character glitch
            if (Math.random() > 0.7) {
                // Randomly change sprite to creepy version
                const charCtx = document.createElement('canvas').getContext('2d');
                charCtx.canvas.width = 16;
                charCtx.canvas.height = 32;
                
                // Draw glitched character
                charCtx.fillStyle = '#f00';
                charCtx.fillRect(2, 0, 12, 16); // Head
                charCtx.fillStyle = '#00f';
                charCtx.fillRect(2, 16, 12, 16); // Body
                
                // Creepy eyes
                charCtx.fillStyle = '#000';
                charCtx.fillRect(4, 4, 3, 3);
                charCtx.fillRect(9, 4, 3, 3);
                
                // Sometimes add a creepy smile
                if (Math.random() > 0.5) {
                    charCtx.fillStyle = '#000';
                    charCtx.fillRect(4, 12, 8, 2);
                }
                
                character.style.backgroundImage = `url(${charCtx.canvas.toDataURL()})`;
                
                // Move creepily
                character.style.left = `${Math.floor(Math.random() * 200)}px`;
                
                // Return to normal after a short time
                setTimeout(() => {
                    if (currentChannel !== 0 || !isTvOn) return;
                    
                    const normalCtx = document.createElement('canvas').getContext('2d');
                    normalCtx.canvas.width = 16;
                    normalCtx.canvas.height = 32;
                    
                    // Draw normal character
                    normalCtx.fillStyle = '#f00';
                    normalCtx.fillRect(2, 0, 12, 16); // Head
                    normalCtx.fillStyle = '#00f';
                    normalCtx.fillRect(2, 16, 12, 16); // Body
                    
                    // Eyes
                    normalCtx.fillStyle = '#fff';
                    normalCtx.fillRect(4, 4, 3, 3);
                    normalCtx.fillRect(9, 4, 3, 3);
                    
                    character.style.backgroundImage = `url(${normalCtx.canvas.toDataURL()})`;
                }, 200);
            }
            
            // Schedule next glitch
            setTimeout(glitchCharacter, Math.random() * 4000 + 1000);
        };
        
        // Start the message and character glitching
        setTimeout(showRandomMessage, 2000);
        setTimeout(glitchCharacter, 3000);
    }

    function createGhostTetris() {
        const container = document.createElement('div');
        container.classList.add('game-container', 'ghost-tetris');
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.backgroundColor = '#000';
        container.style.overflow = 'hidden';
        container.style.position = 'relative';
        container.classList.add('nes-pixel-art');
        
        // Create game canvas
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 240;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.imageRendering = 'pixelated';
        
        const ctx = canvas.getContext('2d');
        
        // Draw the playing field
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw the game border
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.strokeRect(80, 20, 100, 200);
        
        // Score area
        ctx.fillStyle = '#333';
        ctx.fillRect(190, 20, 60, 60);
        ctx.fillStyle = '#aaa';
        ctx.font = '8px monospace';
        ctx.fillText('SCORE', 195, 30);
        ctx.fillText('0000000', 195, 45);
        
        // Next piece
        ctx.fillStyle = '#333';
        ctx.fillRect(190, 90, 60, 60);
        ctx.fillStyle = '#aaa';
        ctx.fillText('NEXT', 200, 100);
        
        // Level
        ctx.fillStyle = '#333';
        ctx.fillRect(190, 160, 60, 40);
        ctx.fillStyle = '#aaa';
        ctx.fillText('LEVEL', 200, 170);
        ctx.fillText('01', 210, 185);
        
        // Draw a game grid (10x20)
        const gridWidth = 10;
        const gridHeight = 20;
        const cellSize = 10;
        
        // Create an invisible grid
        const grid = Array(gridHeight).fill().map(() => Array(gridWidth).fill(0));
        
        // Add some creepy completed areas
        for (let i = 19; i >= 17; i--) {
            for (let j = 0; j < gridWidth; j++) {
                if (i === 19 && (j === 4 || j === 5)) {
                    grid[i][j] = 0; // Hole in the line
                } else {
                    grid[i][j] = Math.floor(Math.random() * 6) + 1;
                }
            }
        }
        
        // Add a floating skull shape
        const skullPiece = [
            [0, 1, 1, 0],
            [1, 0, 0, 1],
            [1, 1, 1, 1],
            [0, 1, 1, 0]
        ];
        
        // Place the skull in the grid
        for (let i = 0; i < skullPiece.length; i++) {
            for (let j = 0; j < skullPiece[i].length; j++) {
                if (skullPiece[i][j]) {
                    grid[i + 5][j + 3] = 7; // Special skull value
                }
            }
        }
        
        // Create some ghost blocks that look faded
        for (let i = 10; i < 15; i++) {
            for (let j = 0; j < gridWidth; j++) {
                if (Math.random() < 0.2) {
                    grid[i][j] = -1; // Ghost block
                }
            }
        }
        
        // Draw the grid
        for (let i = 0; i < gridHeight; i++) {
            for (let j = 0; j < gridWidth; j++) {
                const cellValue = grid[i][j];
                if (cellValue !== 0) {
                    if (cellValue === -1) {
                        // Ghost block
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                    } else if (cellValue === 7) {
                        // Skull piece
                        ctx.fillStyle = '#fff';
                    } else {
                        // Regular block
                        const colors = ['#00f', '#0f0', '#f00', '#ff0', '#f0f', '#0ff', '#888'];
                        ctx.fillStyle = colors[cellValue - 1];
                    }
                    
                    // Draw with a creepy block style
                    ctx.fillRect(80 + j * cellSize, 20 + i * cellSize, cellSize, cellSize);
                    
                    // Add inner shadow for 3D effect
                    if (cellValue !== -1) {
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                        ctx.fillRect(80 + j * cellSize, 20 + i * cellSize, 2, 2);
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                        ctx.fillRect(80 + j * cellSize + cellSize - 2, 20 + i * cellSize + cellSize - 2, 2, 2);
                    }
                }
            }
        }
        
        // Add a "GAME OVER" text that flickers
        const gameOverDiv = document.createElement('div');
        gameOverDiv.style.position = 'absolute';
        gameOverDiv.style.top = '50%';
        gameOverDiv.style.left = '50%';
        gameOverDiv.style.transform = 'translate(-50%, -50%)';
        gameOverDiv.style.color = '#f00';
        gameOverDiv.style.fontFamily = 'monospace';
        gameOverDiv.style.fontSize = '16px';
        gameOverDiv.style.fontWeight = 'bold';
        gameOverDiv.style.textShadow = '2px 2px 0 #000';
        gameOverDiv.style.opacity = '0';
        gameOverDiv.textContent = 'GAME OVER';
        
        // Add message about piece that appears and disappears
        const messageDiv = document.createElement('div');
        messageDiv.style.position = 'absolute';
        messageDiv.style.bottom = '40px';
        messageDiv.style.left = '50%';
        messageDiv.style.transform = 'translateX(-50%)';
        messageDiv.style.color = '#fff';
        messageDiv.style.fontFamily = 'monospace';
        messageDiv.style.fontSize = '12px';
        messageDiv.style.textAlign = 'center';
        messageDiv.style.opacity = '0';
        messageDiv.style.transition = 'opacity 0.5s';
        messageDiv.textContent = 'THE SKULL PIECE HUNGERS';
        
        // Add current tetromino - a creepy skull-like shape
        const fallingSkulls = document.createElement('div');
        fallingSkulls.style.position = 'absolute';
        fallingSkulls.style.top = '0';
        fallingSkulls.style.left = '0';
        fallingSkulls.style.width = '100%';
        fallingSkulls.style.height = '100%';
        fallingSkulls.style.pointerEvents = 'none';
        
        // Add styles for animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes flicker {
                0% { opacity: 0; }
                10% { opacity: 1; }
                15% { opacity: 0.4; }
                20% { opacity: 1; }
                70% { opacity: 1; }
                80% { opacity: 0; }
                100% { opacity: 0; }
            }
            
            @keyframes fall {
                0% { transform: translateY(-20px); }
                100% { transform: translateY(240px); }
            }
            
            .falling-skull {
                position: absolute;
                width: 40px;
                height: 40px;
                animation: fall linear forwards;
            }
        `;
        
        // Add elements to container
        container.appendChild(canvas);
        container.appendChild(gameOverDiv);
        container.appendChild(messageDiv);
        container.appendChild(fallingSkulls);
        container.appendChild(style);
        
        return container;
    }

    function initGhostTetris() {
        if (currentChannel !== 1 || !isTvOn) return;
        
        const container = document.querySelector('.ghost-tetris');
        if (!container) return;
        
        const gameOverDiv = container.querySelector('div');
        const messageDiv = container.querySelectorAll('div')[1];
        const fallingSkulls = container.querySelectorAll('div')[2];
        
        // Make GAME OVER flicker
        const flickerGameOver = () => {
            if (currentChannel !== 1 || !isTvOn) return;
            
            if (Math.random() > 0.7) {
                gameOverDiv.style.animation = 'flicker 2s forwards';
                
                setTimeout(() => {
                    gameOverDiv.style.animation = 'none';
                    gameOverDiv.style.opacity = '0';
                }, 2000);
            }
            
            setTimeout(flickerGameOver, Math.random() * 5000 + 3000);
        };
        
        // Show message occasionally
        const showMessage = () => {
            if (currentChannel !== 1 || !isTvOn) return;
            
            if (Math.random() > 0.5) {
                messageDiv.style.opacity = '1';
                
                setTimeout(() => {
                    messageDiv.style.opacity = '0';
                }, 3000);
            }
            
            setTimeout(showMessage, Math.random() * 10000 + 5000);
        };
        
        // Create falling skulls
        const createFallingSkull = () => {
            if (currentChannel !== 1 || !isTvOn) return;
            
            const skull = document.createElement('div');
            skull.classList.add('falling-skull');
            
            // Random position
            skull.style.left = `${Math.random() * 200 + 30}px`;
            
            // Random speed
            const duration = Math.random() * 3 + 2;
            skull.style.animationDuration = `${duration}s`;
            
            // Create skull using canvas
            const skullCanvas = document.createElement('canvas');
            skullCanvas.width = 40;
            skullCanvas.height = 40;
            const skullCtx = skullCanvas.getContext('2d');
            
            // Draw skull
            skullCtx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            skullCtx.beginPath();
            skullCtx.arc(20, 20, 15, 0, Math.PI * 2);
            skullCtx.fill();
            
            // Eyes
            skullCtx.fillStyle = '#000';
            skullCtx.fillRect(12, 15, 5, 5);
            skullCtx.fillRect(23, 15, 5, 5);
            
            // Mouth
            skullCtx.beginPath();
            skullCtx.arc(20, 25, 8, 0, Math.PI);
            skullCtx.stroke();
            
            skull.style.backgroundImage = `url(${skullCanvas.toDataURL()})`;
            skull.style.backgroundSize = 'contain';
            
            fallingSkulls.appendChild(skull);
            
            // Remove after animation completes
            setTimeout(() => {
                if (fallingSkulls.contains(skull)) {
                    fallingSkulls.removeChild(skull);
                }
            }, duration * 1000);
            
            // Create next skull
            setTimeout(createFallingSkull, Math.random() * 5000 + 2000);
        };
        
        // Start the animations
        setTimeout(flickerGameOver, 4000);
        setTimeout(showMessage, 6000);
        setTimeout(createFallingSkull, 8000);
    }

    function createCorruptedRPG() {
        const container = document.createElement('div');
        container.classList.add('game-container', 'corrupted-rpg');
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.backgroundColor = '#000';
        container.style.overflow = 'hidden';
        container.style.position = 'relative';
        container.classList.add('nes-pixel-art');
        
        // Create game canvas
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 240;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.imageRendering = 'pixelated';
        
        const ctx = canvas.getContext('2d');
        
        // Create a dark dungeon scene
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw walls
        ctx.fillStyle = '#333';
        for (let x = 0; x < canvas.width; x += 16) {
            ctx.fillRect(x, 0, 2, canvas.height);
        }
        for (let y = 0; y < canvas.height; y += 16) {
            ctx.fillRect(0, y, canvas.width, 2);
        }
        
        // Draw a door
        ctx.fillStyle = '#654321';
        ctx.fillRect(120, 0, 32, 4);
        
        // Draw blood stains
        ctx.fillStyle = '#8b0000';
        for (let i = 0; i < 10; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random() * 10 + 5;
            
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Create character sprites
        const heroSprite = createCharacterSprite('#00f', '#fff', '#ff0');
        const monsterSprite = createMonsterSprite('#800', '#f00', '#000');
        
        // Create a dialog box
        const dialogBox = document.createElement('div');
        dialogBox.classList.add('dialog-box');
        dialogBox.style.position = 'absolute';
        dialogBox.style.bottom = '10px';
        dialogBox.style.left = '10px';
        dialogBox.style.width = 'calc(100% - 20px)';
        dialogBox.style.height = '70px';
        dialogBox.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        dialogBox.style.border = '2px solid #fff';
        dialogBox.style.padding = '10px';
        dialogBox.style.boxSizing = 'border-box';
        dialogBox.style.color = '#fff';
        dialogBox.style.fontFamily = 'monospace';
        dialogBox.style.fontSize = '12px';
        dialogBox.style.lineHeight = '1.5';
        dialogBox.style.display = 'none';
        
        // Create battle scene elements
        const battleContainer = document.createElement('div');
        battleContainer.classList.add('battle-container');
        battleContainer.style.position = 'absolute';
        battleContainer.style.top = '0';
        battleContainer.style.left = '0';
        battleContainer.style.width = '100%';
        battleContainer.style.height = '100%';
        battleContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        battleContainer.style.display = 'none';
        
        // Hero stats display
        const heroStats = document.createElement('div');
        heroStats.classList.add('hero-stats');
        heroStats.style.position = 'absolute';
        heroStats.style.bottom = '90px';
        heroStats.style.right = '10px';
        heroStats.style.width = '100px';
        heroStats.style.padding = '5px';
        heroStats.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        heroStats.style.border = '1px solid #fff';
        heroStats.style.color = '#fff';
        heroStats.style.fontFamily = 'monospace';
        heroStats.style.fontSize = '10px';
        heroStats.innerHTML = 'HERO<br>HP: 15/15<br>MP: 8/8';
        
        // Battle menu
        const battleMenu = document.createElement('div');
        battleMenu.classList.add('battle-menu');
        battleMenu.style.position = 'absolute';
        battleMenu.style.bottom = '10px';
        battleMenu.style.right = '10px';
        battleMenu.style.width = '100px';
        battleMenu.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        battleMenu.style.border = '1px solid #fff';
        battleMenu.style.color = '#fff';
        battleMenu.style.fontFamily = 'monospace';
        battleMenu.style.fontSize = '10px';
        battleMenu.style.padding = '5px';
        battleMenu.innerHTML = '> FIGHT<br>&nbsp;&nbsp;MAGIC<br>&nbsp;&nbsp;ITEM<br>&nbsp;&nbsp;RUN';
        
        // Add hero to battle scene
        const battleHero = document.createElement('div');
        battleHero.classList.add('battle-hero');
        battleHero.style.position = 'absolute';
        battleHero.style.bottom = '100px';
        battleHero.style.left = '50px';
        battleHero.style.width = '32px';
        battleHero.style.height = '32px';
        battleHero.style.backgroundImage = `url(${heroSprite})`;
        battleHero.style.backgroundSize = 'contain';
        
        // Add monster to battle scene
        const battleMonster = document.createElement('div');
        battleMonster.classList.add('battle-monster');
        battleMonster.style.position = 'absolute';
        battleMonster.style.top = '60px';
        battleMonster.style.right = '80px';
        battleMonster.style.width = '64px';
        battleMonster.style.height = '64px';
        battleMonster.style.backgroundImage = `url(${monsterSprite})`;
        battleMonster.style.backgroundSize = 'contain';
        
        // Add glitch overlay for battle
        const glitchOverlay = document.createElement('div');
        glitchOverlay.classList.add('glitch-overlay');
        glitchOverlay.style.position = 'absolute';
        glitchOverlay.style.top = '0';
        glitchOverlay.style.left = '0';
        glitchOverlay.style.width = '100%';
        glitchOverlay.style.height = '100%';
        glitchOverlay.style.backgroundImage = 'linear-gradient(0deg, rgba(255,0,0,0.1) 50%, transparent 50%)';
        glitchOverlay.style.backgroundSize = '100% 4px';
        glitchOverlay.style.pointerEvents = 'none';
        glitchOverlay.style.opacity = '0.3';
        
        // Assemble battle scene
        battleContainer.appendChild(battleHero);
        battleContainer.appendChild(battleMonster);
        battleContainer.appendChild(battleMenu);
        battleContainer.appendChild(heroStats);
        battleContainer.appendChild(glitchOverlay);
        
        // Add main character to map
        const hero = document.createElement('div');
        hero.classList.add('rpg-hero');
        hero.style.position = 'absolute';
        hero.style.top = '120px';
        hero.style.left = '120px';
        hero.style.width = '16px';
        hero.style.height = '16px';
        hero.style.backgroundImage = `url(${heroSprite})`;
        hero.style.backgroundSize = 'contain';
        
        // Add monster to map
        const monster = document.createElement('div');
        monster.classList.add('rpg-monster');
        monster.style.position = 'absolute';
        monster.style.top = '60px';
        monster.style.left = '180px';
        monster.style.width = '16px';
        monster.style.height = '16px';
        monster.style.backgroundImage = `url(${monsterSprite})`;
        monster.style.backgroundSize = 'contain';
        
        // Style for glitch animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes textGlitch {
                0% { transform: translate(0); color: #fff; }
                10% { transform: translate(-2px, 0); color: #f00; }
                20% { transform: translate(2px, 0); color: #0f0; }
                30% { transform: translate(0, 0); color: #fff; }
                40% { transform: translate(0, -1px); color: #00f; }
                50% { transform: translate(0, 1px); color: #fff; }
                100% { transform: translate(0); color: #fff; }
            }
            
            .glitch-text {
                animation: textGlitch 0.3s infinite;
            }
            
            @keyframes shake {
                0%, 100% { transform: translate(0); }
                10%, 30%, 50%, 70%, 90% { transform: translate(-2px, 0); }
                20%, 40%, 60%, 80% { transform: translate(2px, 0); }
            }
            
            .battle-container.active .glitch-overlay {
                opacity: 0.5;
            }
        `;
        
        // Assemble final container
        container.appendChild(canvas);
        container.appendChild(hero);
        container.appendChild(monster);
        container.appendChild(dialogBox);
        container.appendChild(battleContainer);
        container.appendChild(style);
        
        return container;
    }

    function createCharacterSprite(bodyColor, faceColor, armorColor) {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        
        // Draw character sprite
        ctx.fillStyle = bodyColor;
        ctx.fillRect(4, 2, 8, 8); // Head
        
        ctx.fillStyle = faceColor;
        ctx.fillRect(6, 4, 1, 1); // Left eye
        ctx.fillRect(9, 4, 1, 1); // Right eye
        ctx.fillRect(7, 6, 2, 1); // Mouth
        
        ctx.fillStyle = armorColor;
        ctx.fillRect(4, 10, 8, 6); // Body
        
        return canvas.toDataURL();
    }

    function createMonsterSprite(bodyColor, eyeColor, detailColor) {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        
        // Draw monster sprite
        ctx.fillStyle = bodyColor;
        ctx.fillRect(2, 2, 12, 12); // Body
        
        ctx.fillStyle = eyeColor;
        ctx.fillRect(4, 4, 2, 2); // Left eye
        ctx.fillRect(10, 4, 2, 2); // Right eye
        
        ctx.fillStyle = detailColor;
        ctx.fillRect(6, 8, 4, 1); // Mouth
        ctx.fillRect(2, 14, 3, 2); // Left claw
        ctx.fillRect(11, 14, 3, 2); // Right claw
        
        return canvas.toDataURL();
    }

    function initCorruptedRPG() {
        if (currentChannel !== 2 || !isTvOn) return;
        
        const container = document.querySelector('.corrupted-rpg');
        if (!container) return;
        
        const hero = container.querySelector('.rpg-hero');
        const monster = container.querySelector('.rpg-monster');
        const dialogBox = container.querySelector('.dialog-box');
        const battleContainer = container.querySelector('.battle-container');
        
        // Disturbing dialog messages
        const dialogMessages = [
            "* The game is glitching\nfatal error at memory\naddress 0xF0A2...",
            "* You shouldn't\nbe here. This game\nis CORRUPTED.",
            "* Why do you continue\nto play? Don't you know\nwhat happens?",
            "* Your save data has been\nDELETED. Your progress\nis GONE.",
            "ERROR: C̵̡̠̩̹͗̅̂̚h̵̗͍̍͋̀̄ả̸̤̣͎̆̈́r̵͙̥̦̪͑̌̿̑à̶̠̮͗̆̃ċ̶̛̯̟t̵̛̙̭̳̟͒̐e̶̖͉̙̿̓r̴̩̻̈́͋̈́ ̵̡͚͌̔f̶̡͓͇͖͋̽̊î̶̧̿̆̎l̶̪̟̥̆ͅḗ̶̙͈̀̒",
            "* THE HEROES ARE DEAD.\nTHE PRINCESS IS DEAD.\nEVERYONE IS DEAD."
        ];
        
        // Battle messages
        const battleMessages = [
            "* The corrupted monster\n attacks!",
            "* You feel your sins\n crawling on your back.",
            "* You can't escape.",
            "* It knows your name.",
            "* The game is breaking\n apart.",
            "FATAL ERROR 0xDEAD"
        ];
        
        // Move hero randomly
        const moveHero = () => {
            if (currentChannel !== 2 || !isTvOn) return;
            
            const directions = ['up', 'down', 'left', 'right'];
            const direction = directions[Math.floor(Math.random() * directions.length)];
            
            let top = parseInt(hero.style.top);
            let left = parseInt(hero.style.left);
            
            switch(direction) {
                case 'up':
                    top = Math.max(0, top - 16);
                    break;
                case 'down':
                    top = Math.min(230, top + 16);
                    break;
                case 'left':
                    left = Math.max(0, left - 16);
                    break;
                case 'right':
                    left = Math.min(240, left + 16);
                    break;
            }
            
            hero.style.top = `${top}px`;
            hero.style.left = `${left}px`;
            
            // Check for collision with monster
            const heroRect = hero.getBoundingClientRect();
            const monsterRect = monster.getBoundingClientRect();
            
            if (
                heroRect.right > monsterRect.left &&
                heroRect.left < monsterRect.right &&
                heroRect.bottom > monsterRect.top &&
                heroRect.top < monsterRect.bottom
            ) {
                // Start battle
                startBattle();
            } else {
                // Show random dialog occasionally
                if (Math.random() < 0.2) {
                    showDialog();
                }
                
                // Move again after delay
                setTimeout(moveHero, Math.random() * 1000 + 500);
            }
        };
        
        // Show dialog
        const showDialog = () => {
            if (currentChannel !== 2 || !isTvOn) return;
            
            // Show random dialog
            dialogBox.textContent = dialogMessages[Math.floor(Math.random() * dialogMessages.length)];
            dialogBox.style.display = 'block';
            
            // Add glitch effect
            if (Math.random() > 0.5) {
                dialogBox.classList.add('glitch-text');
            }
            
            // Hide after delay
            setTimeout(() => {
                dialogBox.style.display = 'none';
                dialogBox.classList.remove('glitch-text');
            }, 3000);
        };
        
        // Start battle sequence
        const startBattle = () => {
            if (currentChannel !== 2 || !isTvOn) return;
            
            // Show battle screen
            battleContainer.style.display = 'block';
            
            // Animate entrance
            battleContainer.classList.add('active');
            battleContainer.style.animation = 'shake 0.5s';
            
            // Update battle dialog
            const battleMessage = battleMessages[Math.floor(Math.random() * battleMessages.length)];
            
            // Continue battle sequence
            continueBattle(0, battleMessage);
        };
        
        // Continue battle sequence
        const continueBattle = (step, message) => {
            if (currentChannel !== 2 || !isTvOn) return;
            
            // Check if battle container and its elements exist
            if (!battleContainer) return;
            
            switch (step) {
                case 0:
                    // Show message
                    dialogBox.textContent = message;
                    dialogBox.style.display = 'block';
                    setTimeout(() => continueBattle(1, message), 2000);
                    break;
                    
                case 1:
                    // Hide message, wait for "input"
                    dialogBox.style.display = 'none';
                    setTimeout(() => continueBattle(2, message), 1000);
                    break;
                    
                case 2:
                    // Show player attack
                    const battleHero = battleContainer.querySelector('.battle-hero');
                    if (!battleHero) return;
                    battleHero.style.animation = 'shake 0.3s';
                    setTimeout(() => continueBattle(3, message), 800);
                    break;
                    
                case 3:
                    // Monster takes damage
                    const battleMonster = battleContainer.querySelector('.battle-monster');
                    if (!battleMonster) return;
                    battleMonster.style.animation = 'shake 0.3s';
                    
                    // Glitch effect
                    if (Math.random() > 0.5) {
                        battleContainer.style.animation = 'shake 0.5s';
                    }
                    
                    setTimeout(() => continueBattle(4, message), 1000);
                    break;
                    
                case 4:
                    // Player takes damage or glitch happens
                    const heroStats = battleContainer.querySelector('.hero-stats');
                    if (!heroStats) return;
                    
                    if (Math.random() > 0.7) {
                        // Corrupt HP display
                        heroStats.innerHTML = 'HERO<br>HP: E̷̟͌R̶̨̓R̵̥̎/15<br>MP: 8/8';
                    } else {
                        // Normal damage
                        heroStats.innerHTML = 'HERO<br>HP: 10/15<br>MP: 8/8';
                    }
                    
                    heroStats.style.animation = 'textGlitch 0.3s';
                    setTimeout(() => {
                        if (!heroStats) return;
                        heroStats.style.animation = 'none';
                        continueBattle(5, message);
                    }, 1000);
                    break;
                    
                case 5:
                    // End battle with glitch
                    battleContainer.style.animation = 'shake 1s';
                    
                    // Show corrupted text
                    dialogBox.textContent = "* FATAL ERROR\nGAME DATA CORRUPTED\nSAVE FILE DELETED";
                    dialogBox.classList.add('glitch-text');
                    dialogBox.style.display = 'block';
                    
                    setTimeout(() => {
                        if (!battleContainer || !dialogBox || !hero) return;
                        
                        // Hide battle
                        battleContainer.style.display = 'none';
                        dialogBox.style.display = 'none';
                        dialogBox.classList.remove('glitch-text');
                        
                        // Reset and move hero again
                        hero.style.top = '120px';
                        hero.style.left = '120px';
                        
                        setTimeout(moveHero, 1000);
                    }, 3000);
                    break;
            }
        };
        
        // Start the sequence
        setTimeout(moveHero, 1000);
    }

    function createDrownedZelda() {
        const container = document.createElement('div');
        container.classList.add('game-container', 'drowned-zelda');
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.backgroundColor = '#000';
        container.style.overflow = 'hidden';
        container.style.position = 'relative';
        container.classList.add('nes-pixel-art');
        
        // Create game canvas
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 240;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.imageRendering = 'pixelated';
        
        const ctx = canvas.getContext('2d');
        
        // Draw dark water background (with some visibility)
        ctx.fillStyle = '#0a1a30';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw a dungeon/underwater temple scene
        // Floor tiles
        ctx.fillStyle = '#0f2a40';
        for (let x = 0; x < canvas.width; x += 16) {
            for (let y = 100; y < canvas.height; y += 16) {
                ctx.fillRect(x, y, 16, 16);
                ctx.strokeStyle = '#0a1a30';
                ctx.strokeRect(x, y, 16, 16);
            }
        }
        
        // Columns
        ctx.fillStyle = '#204060';
        ctx.fillRect(40, 40, 16, 60);
        ctx.fillRect(200, 40, 16, 60);
        
        // Draw some bubbles
        for (let i = 0; i < 20; i++) {
            ctx.beginPath();
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radius = Math.random() * 5 + 2;
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fill();
        }
        
        // Create the zombie-like Link character (facing screen)
        const characterCanvas = document.createElement('canvas');
        characterCanvas.width = 16;
        characterCanvas.height = 24;
        const charCtx = characterCanvas.getContext('2d');
        
        // Green tunic
        charCtx.fillStyle = '#006130'; // Darker green due to water
        charCtx.fillRect(4, 10, 8, 10);
        
        // Head/face
        charCtx.fillStyle = '#d0a080'; // Skin tone
        charCtx.fillRect(4, 2, 8, 8);
        
        // Hat
        charCtx.fillStyle = '#006130';
        charCtx.fillRect(2, 2, 12, 3);
        
        // Eyes (white with black pupils, but eerie)
        charCtx.fillStyle = '#000';
        charCtx.fillRect(5, 5, 2, 2);
        charCtx.fillRect(9, 5, 2, 2);
        
        // Legs
        charCtx.fillStyle = '#804000';
        charCtx.fillRect(5, 20, 2, 4);
        charCtx.fillRect(9, 20, 2, 4);
        
        // Create a water overlay that moves
        const waterOverlay = document.createElement('div');
        waterOverlay.classList.add('water-overlay');
        waterOverlay.style.position = 'absolute';
        waterOverlay.style.top = '0';
        waterOverlay.style.left = '0';
        waterOverlay.style.width = '100%';
        waterOverlay.style.height = '100%';
        waterOverlay.style.background = 'repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(10, 50, 120, 0.1) 10px, rgba(10, 50, 120, 0.1) 20px)';
        waterOverlay.style.animation = 'water-movement 20s linear infinite';
        waterOverlay.style.pointerEvents = 'none';
        waterOverlay.style.zIndex = '1';
        
        // Text overlay for the famous "You shouldn't have done that..." message
        const textOverlay = document.createElement('div');
        textOverlay.classList.add('drowned-text');
        textOverlay.style.position = 'absolute';
        textOverlay.style.top = '20%';
        textOverlay.style.left = '0';
        textOverlay.style.width = '100%';
        textOverlay.style.textAlign = 'center';
        textOverlay.style.color = '#fff';
        textOverlay.style.fontFamily = 'monospace';
        textOverlay.style.fontSize = '16px';
        textOverlay.style.opacity = '0';
        textOverlay.style.zIndex = '2';
        textOverlay.style.textShadow = '2px 2px #000';
        textOverlay.style.letterSpacing = '2px';
        textOverlay.textContent = 'You shouldn\'t have done that...';
        
        // Create static character in the center of the scene facing the "camera"
        const character = document.createElement('div');
        character.classList.add('drowned-character');
        character.style.position = 'absolute';
        character.style.top = '50%';
        character.style.left = '50%';
        character.style.transform = 'translate(-50%, -50%)';
        character.style.width = '32px';
        character.style.height = '48px';
        character.style.backgroundImage = `url(${characterCanvas.toDataURL()})`;
        character.style.backgroundSize = 'contain';
        character.style.backgroundRepeat = 'no-repeat';
        character.style.imageRendering = 'pixelated';
        character.style.filter = 'brightness(0.8)';
        character.style.zIndex = '2';
        
        // Dialog box
        const dialogBox = document.createElement('div');
        dialogBox.classList.add('dialog-box');
        dialogBox.style.position = 'absolute';
        dialogBox.style.bottom = '10px';
        dialogBox.style.left = '10%';
        dialogBox.style.width = '80%';
        dialogBox.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        dialogBox.style.border = '2px solid #fff';
        dialogBox.style.color = '#fff';
        dialogBox.style.fontFamily = 'monospace';
        dialogBox.style.fontSize = '12px';
        dialogBox.style.padding = '10px';
        dialogBox.style.zIndex = '2';
        dialogBox.style.display = 'none';
        
        // Add animation styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes water-movement {
                0% { background-position: 0 0; }
                100% { background-position: 0 100%; }
            }
            
            @keyframes float {
                0%, 100% { transform: translate(-50%, -50%); }
                50% { transform: translate(-50%, -55%); }
            }
            
            @keyframes text-flicker {
                0% { opacity: 0; }
                10% { opacity: 1; }
                12% { opacity: 0; }
                20% { opacity: 0; }
                22% { opacity: 1; }
                24% { opacity: 0; }
                34% { opacity: 1; }
                40% { opacity: 0; }
                100% { opacity: 0; }
            }
            
            @keyframes face-change {
                0%, 100% { filter: brightness(0.8); }
                50% { filter: brightness(0.2) saturate(2) hue-rotate(90deg); }
            }
        `;
        
        // Assemble the scene
        container.appendChild(canvas);
        container.appendChild(waterOverlay);
        container.appendChild(character);
        container.appendChild(textOverlay);
        container.appendChild(dialogBox);
        container.appendChild(style);
        
        return container;
    }

    function initDrownedZelda() {
        if (currentChannel !== 3 || !isTvOn) return;
        
        const container = document.querySelector('.drowned-zelda');
        if (!container) return;
        
        const character = container.querySelector('.drowned-character');
        const textOverlay = container.querySelector('.drowned-text');
        const dialogBox = container.querySelector('.dialog-box');
        
        // Creepy dialog messages
        const messages = [
            "BEN: You've met with a terrible fate, haven't you?",
            "BEN: I've been waiting for you...",
            "BEN: You shouldn't have done that...",
            "BEN: The cartridge is cursed now.",
            "BEN: I will always be watching you.",
            "BEN: You can't escape me.",
            "ERROR: Save file corrupted. Data lost.",
            "PLAYER 2 WANTS TO PLAY"
        ];
        
        // Make character float gently
        character.style.animation = 'float 4s infinite ease-in-out';
        
        // Sequence of events
        const startSequence = () => {
            // First show the character just floating
            setTimeout(() => {
                // Then show the "You shouldn't have done that" message briefly
                textOverlay.style.animation = 'text-flicker 4s';
                
                setTimeout(() => {
                    // After the text disappears, start showing dialog
                    showDialog();
                }, 4000);
            }, 3000);
        };
        
        // Show dialog messages
        const showDialog = () => {
            if (currentChannel !== 3 || !isTvOn) return;
            
            // Pick a random message
            const message = messages[Math.floor(Math.random() * messages.length)];
            dialogBox.textContent = message;
            dialogBox.style.display = 'block';
            
            // Change character appearance sometimes when dialog shows
            if (Math.random() > 0.7) {
                character.style.animation = 'face-change 0.5s, float 4s infinite ease-in-out';
                
                // Reset after a short time
                setTimeout(() => {
                    character.style.animation = 'float 4s infinite ease-in-out';
                }, 500);
            }
            
            // Hide dialog after a few seconds
            setTimeout(() => {
                dialogBox.style.display = 'none';
                
                // Continue the sequence after a random delay
                if (currentChannel === 3 && isTvOn) {
                    setTimeout(showDialog, Math.random() * 5000 + 3000);
                }
            }, 3000);
        };
        
        // Start the sequence
        startSequence();
    }

    function createPossessedPong() {
        const container = document.createElement('div');
        container.classList.add('game-container', 'possessed-pong');
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.backgroundColor = '#000';
        container.style.overflow = 'hidden';
        container.style.position = 'relative';
        container.classList.add('nes-pixel-art');
        
        // Create game canvas
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 240;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.imageRendering = 'pixelated';
        
        const ctx = canvas.getContext('2d');
        
        // Draw the pong elements
        const paddleHeight = 40;
        const paddleWidth = 8;
        const ballSize = 8;
        
        // Draw center line
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.stroke();
        
        // Draw scores
        ctx.font = '24px monospace';
        ctx.fillStyle = '#fff';
        ctx.fillText('00', canvas.width / 4, 30);
        ctx.fillText('99', (canvas.width / 4) * 3, 30);
        
        // Draw paddles
        ctx.fillStyle = '#fff';
        // Left paddle (player)
        ctx.fillRect(20, canvas.height / 2 - paddleHeight / 2, paddleWidth, paddleHeight);
        // Right paddle (AI)
        ctx.fillRect(canvas.width - 20 - paddleWidth, canvas.height / 2 - paddleHeight / 2, paddleWidth, paddleHeight);
        
        // Draw ball
        ctx.fillRect(canvas.width / 2 - ballSize / 2, canvas.height / 2 - ballSize / 2, ballSize, ballSize);
        
        // Blood effects overlay
        const bloodEffects = document.createElement('div');
        bloodEffects.classList.add('blood-effects');
        bloodEffects.style.position = 'absolute';
        bloodEffects.style.top = '0';
        bloodEffects.style.left = '0';
        bloodEffects.style.width = '100%';
        bloodEffects.style.height = '100%';
        bloodEffects.style.pointerEvents = 'none';
        bloodEffects.style.zIndex = '1';
        
        // Warning message
        const warningText = document.createElement('div');
        warningText.classList.add('warning-text');
        warningText.style.position = 'absolute';
        warningText.style.top = '50%';
        warningText.style.left = '50%';
        warningText.style.transform = 'translate(-50%, -50%)';
        warningText.style.color = '#f00';
        warningText.style.fontFamily = 'monospace';
        warningText.style.fontSize = '16px';
        warningText.style.textAlign = 'center';
        warningText.style.whiteSpace = 'pre-line';
        warningText.style.opacity = '0';
        warningText.style.zIndex = '2';
        warningText.style.textShadow = '2px 2px #000';
        warningText.textContent = 'DO NOT LOSE';
        
        // Game over message (hidden initially)
        const gameOverText = document.createElement('div');
        gameOverText.classList.add('game-over-text');
        gameOverText.style.position = 'absolute';
        gameOverText.style.top = '40%';
        gameOverText.style.left = '50%';
        gameOverText.style.transform = 'translate(-50%, -50%)';
        gameOverText.style.color = '#f00';
        gameOverText.style.fontFamily = 'monospace';
        gameOverText.style.fontSize = '24px';
        gameOverText.style.textAlign = 'center';
        gameOverText.style.whiteSpace = 'pre-line';
        gameOverText.style.opacity = '0';
        gameOverText.style.zIndex = '2';
        gameOverText.style.textShadow = '2px 2px #000';
        gameOverText.textContent = 'GAME OVER\nYOU LOSE';
        
        // Ball animation
        const ball = document.createElement('div');
        ball.classList.add('pong-ball');
        ball.style.position = 'absolute';
        ball.style.width = '8px';
        ball.style.height = '8px';
        ball.style.backgroundColor = '#f00';
        ball.style.top = '50%';
        ball.style.left = '50%';
        ball.style.transform = 'translate(-50%, -50%)';
        ball.style.zIndex = '1';
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes ballMovement {
                0% {
                    transform: translate(-50%, -50%);
                    background-color: #fff;
                }
                25% {
                    transform: translate(calc(-50% - 70px), calc(-50% + 40px));
                    background-color: #fff;
                }
                26% {
                    transform: translate(calc(-50% - 70px), calc(-50% + 40px));
                    background-color: #f00;
                }
                50% {
                    transform: translate(calc(-50% + 70px), calc(-50% - 30px));
                    background-color: #f00;
                }
                75% {
                    transform: translate(calc(-50% - 40px), calc(-50% - 60px));
                    background-color: #f00;
                }
                100% {
                    transform: translate(-50%, -50%);
                    background-color: #f00;
                }
            }
            
            @keyframes warningFlash {
                0%, 100% { opacity: 0; }
                10%, 20%, 30% { opacity: 1; }
                15%, 25% { opacity: 0; }
            }
            
            @keyframes bloodAppear {
                0% { opacity: 0; }
                100% { opacity: 0.5; }
            }
            
            @keyframes gameOverAppear {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
                50% { opacity: 1; transform: translate(-50%, -50%) scale(2); }
                100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
            
            .blood-splash {
                position: absolute;
                background-color: #8b0000;
                border-radius: 50%;
                filter: blur(1px);
                opacity: 0;
                animation: bloodAppear 1s forwards;
            }
        `;
        
        // AI paddle that follows the player eerily
        const aiPaddle = document.createElement('div');
        aiPaddle.classList.add('ai-paddle');
        aiPaddle.style.position = 'absolute';
        aiPaddle.style.width = `${paddleWidth}px`;
        aiPaddle.style.height = `${paddleHeight}px`;
        aiPaddle.style.backgroundColor = '#fff';
        aiPaddle.style.right = '20px';
        aiPaddle.style.top = '50%';
        aiPaddle.style.transform = 'translateY(-50%)';
        aiPaddle.style.zIndex = '1';
        
        // Player paddle for interactivity
        const playerPaddle = document.createElement('div');
        playerPaddle.classList.add('player-paddle');
        playerPaddle.style.position = 'absolute';
        playerPaddle.style.width = `${paddleWidth}px`;
        playerPaddle.style.height = `${paddleHeight}px`;
        playerPaddle.style.backgroundColor = '#fff';
        playerPaddle.style.left = '20px';
        playerPaddle.style.top = '50%';
        playerPaddle.style.transform = 'translateY(-50%)';
        playerPaddle.style.zIndex = '1';
        
        // Assemble all elements
        container.appendChild(canvas);
        container.appendChild(ball);
        container.appendChild(playerPaddle);
        container.appendChild(aiPaddle);
        container.appendChild(bloodEffects);
        container.appendChild(warningText);
        container.appendChild(gameOverText);
        container.appendChild(style);
        
        return container;
    }

    function initPossessedPong() {
        if (currentChannel !== 4 || !isTvOn) return;
        
        const container = document.querySelector('.possessed-pong');
        if (!container) return;
        
        const ball = container.querySelector('.pong-ball');
        const warningText = container.querySelector('.warning-text');
        const gameOverText = container.querySelector('.game-over-text');
        const bloodEffects = container.querySelector('.blood-effects');
        const playerPaddle = container.querySelector('.player-paddle');
        const aiPaddle = container.querySelector('.ai-paddle');
        
        // Start ball animation
        ball.style.animation = 'ballMovement 4s infinite linear';
        
        // Function to create blood splashes
        const createBloodSplash = () => {
            if (currentChannel !== 4 || !isTvOn) return;
            
            if (Math.random() > 0.6) {
                const splash = document.createElement('div');
                splash.classList.add('blood-splash');
                
                // Random position
                splash.style.top = `${Math.random() * 100}%`;
                splash.style.left = `${Math.random() * 100}%`;
                
                // Random size
                const size = Math.random() * 30 + 10;
                splash.style.width = `${size}px`;
                splash.style.height = `${size}px`;
                
                bloodEffects.appendChild(splash);
                
                // Change ball color and speed sometimes
                if (Math.random() > 0.7) {
                    ball.style.backgroundColor = '#f00';
                    ball.style.animationDuration = '2s';
                    
                    // Reset after a while
                    setTimeout(() => {
                        if (currentChannel === 4 && isTvOn) {
                            ball.style.backgroundColor = '#fff';
                            ball.style.animationDuration = '4s';
                        }
                    }, 2000);
                }
            }
            
            // Create next splash after a random delay
            setTimeout(createBloodSplash, Math.random() * 3000 + 1000);
        };
        
        // Function to show warning text
        const showWarning = () => {
            if (currentChannel !== 4 || !isTvOn) return;
            
            warningText.style.animation = 'warningFlash 2s';
            
            // Change warning text content randomly
            const warnings = [
                'DO NOT LOSE',
                'IT KNOWS',
                'KEEP PLAYING',
                'DON\'T MISS',
                'KEEP SCORE'
            ];
            
            warningText.textContent = warnings[Math.floor(Math.random() * warnings.length)];
            
            // Reset animation
            setTimeout(() => {
                warningText.style.animation = 'none';
                
                // Schedule next warning
                if (currentChannel === 4 && isTvOn) {
                    setTimeout(showWarning, Math.random() * 8000 + 5000);
                }
            }, 2000);
        };
        
        // Function to show game over
        const showGameOver = () => {
            if (currentChannel !== 4 || !isTvOn) return;
            
            if (Math.random() > 0.7) {
                // Stop ball animation
                ball.style.animation = 'none';
                
                // Show game over text
                gameOverText.style.animation = 'gameOverAppear 3s forwards';
                
                // Fill screen with blood
                for (let i = 0; i < 20; i++) {
                    const splash = document.createElement('div');
                    splash.classList.add('blood-splash');
                    
                    // Random position
                    splash.style.top = `${Math.random() * 100}%`;
                    splash.style.left = `${Math.random() * 100}%`;
                    
                    // Random size
                    const size = Math.random() * 50 + 20;
                    splash.style.width = `${size}px`;
                    splash.style.height = `${size}px`;
                    
                    bloodEffects.appendChild(splash);
                }
                
                // Reset after a few seconds
                setTimeout(() => {
                    if (currentChannel === 4 && isTvOn) {
                        // Hide game over
                        gameOverText.style.animation = 'none';
                        gameOverText.style.opacity = '0';
                        
                        // Remove blood
                        bloodEffects.innerHTML = '';
                        
                        // Reset ball
                        ball.style.animation = 'ballMovement 4s infinite linear';
                        ball.style.backgroundColor = '#fff';
                    }
                }, 5000);
            }
            
            // Schedule next game over check
            setTimeout(showGameOver, Math.random() * 15000 + 10000);
        };
        
        // Move the AI paddle to follow the ball in a creepy way
        const moveAIPaddle = () => {
            if (currentChannel !== 4 || !isTvOn) return;
            
            const ballRect = ball.getBoundingClientRect();
            const aiRect = aiPaddle.getBoundingClientRect();
            
            // Calculate target position but add randomness
            let targetY = ballRect.top + (ballRect.height / 2) - (aiPaddle.offsetHeight / 2);
            
            // Sometimes the AI makes errors (for a brief moment)
            if (Math.random() > 0.9) {
                targetY = Math.random() * (container.offsetHeight - aiPaddle.offsetHeight);
            }
            
            // Set the new position
            const currentY = parseFloat(aiPaddle.style.top) || 50;
            const newY = currentY + (targetY - currentY) * 0.1;
            
            aiPaddle.style.top = `${newY}px`;
            
            // Continue moving
            requestAnimationFrame(moveAIPaddle);
        };
        
        // Allow the player to control their paddle
        let mouseY = container.offsetHeight / 2;
        
        container.addEventListener('mousemove', (e) => {
            if (currentChannel !== 4 || !isTvOn) return;
            
            const containerRect = container.getBoundingClientRect();
            mouseY = e.clientY - containerRect.top;
            
            // Update player paddle position
            playerPaddle.style.top = `${mouseY - playerPaddle.offsetHeight / 2}px`;
        });
        
        // Start the animations
        createBloodSplash();
        showWarning();
        showGameOver();
        moveAIPaddle();
    }

    function createLostCartridge() {
        const container = document.createElement('div');
        container.classList.add('game-container', 'lost-cartridge');
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.backgroundColor = '#000';
        container.style.overflow = 'hidden';
        container.style.position = 'relative';
        container.classList.add('nes-pixel-art');
        
        // Create a glitched title screen
        const titleScreen = document.createElement('div');
        titleScreen.classList.add('title-screen');
        titleScreen.style.width = '100%';
        titleScreen.style.height = '100%';
        titleScreen.style.display = 'flex';
        titleScreen.style.flexDirection = 'column';
        titleScreen.style.alignItems = 'center';
        titleScreen.style.justifyContent = 'space-between';
        titleScreen.style.padding = '20px';
        titleScreen.style.boxSizing = 'border-box';
        
        // Game title - distorted and unreadable
        const gameTitle = document.createElement('div');
        gameTitle.classList.add('game-title');
        gameTitle.style.color = '#fff';
        gameTitle.style.fontFamily = 'monospace';
        gameTitle.style.fontSize = '24px';
        gameTitle.style.textAlign = 'center';
        gameTitle.style.marginTop = '40px';
        gameTitle.style.textShadow = '2px 2px #800';
        gameTitle.style.letterSpacing = '2px';
        gameTitle.innerHTML = '口□◻◼◘<span style="color:#f00;">▌</span>⌂<span style="color:#0f0;">▀</span>┌┐';
        gameTitle.style.filter = 'blur(1px)';
        
        // Create "game company" logo that's corrupted
        const logo = document.createElement('div');
        logo.classList.add('company-logo');
        logo.style.width = '80px';
        logo.style.height = '80px';
        logo.style.backgroundColor = '#600';
        logo.style.borderRadius = '5px';
        logo.style.position = 'relative';
        logo.style.margin = '20px auto';
        logo.style.overflow = 'hidden';
        
        // Add text inside logo
        const logoText = document.createElement('div');
        logoText.style.position = 'absolute';
        logoText.style.top = '50%';
        logoText.style.left = '50%';
        logoText.style.transform = 'translate(-50%, -50%)';
        logoText.style.color = '#fff';
        logoText.style.fontFamily = 'monospace';
        logoText.style.fontSize = '10px';
        logoText.style.whiteSpace = 'nowrap';
        logoText.textContent = 'ERR_FAIL';
        
        // Menu options
        const menuOptions = document.createElement('div');
        menuOptions.classList.add('menu-options');
        menuOptions.style.display = 'flex';
        menuOptions.style.flexDirection = 'column';
        menuOptions.style.alignItems = 'center';
        menuOptions.style.marginTop = '40px';
        
        // Menu options text
        const optionsArray = [
            "START",
            "CONTINUE",
            "DATA CORRUPTED",
            "ERASE SELF"
        ];
        
        optionsArray.forEach((option, index) => {
            const optionElem = document.createElement('div');
            optionElem.classList.add('menu-option');
            optionElem.style.color = index === 2 ? '#f00' : '#fff';
            optionElem.style.fontFamily = 'monospace';
            optionElem.style.fontSize = '16px';
            optionElem.style.margin = '10px 0';
            optionElem.style.textAlign = 'center';
            optionElem.style.width = '200px';
            
            // Add glitch effect to "DATA CORRUPTED" option
            if (index === 2) {
                optionElem.style.textDecoration = 'line-through';
                optionElem.classList.add('corrupted-option');
            }
            
            // Add selected indicator to "ERASE SELF" option
            if (index === 3) {
                optionElem.style.color = '#ff0';
                optionElem.innerHTML = '&gt; ' + option + ' &lt;';
            } else {
                optionElem.textContent = option;
            }
            
            menuOptions.appendChild(optionElem);
        });
        
        // Copyright text
        const copyright = document.createElement('div');
        copyright.classList.add('copyright');
        copyright.style.color = '#888';
        copyright.style.fontFamily = 'monospace';
        copyright.style.fontSize = '12px';
        copyright.style.textAlign = 'center';
        copyright.style.marginTop = 'auto';
        copyright.style.marginBottom = '20px';
        copyright.textContent = "© 198ERR_DATE_NOT_FOUND";
        
        // Secret message hidden in the title screen
        const secretMessage = document.createElement('div');
        secretMessage.classList.add('secret-message');
        secretMessage.style.position = 'absolute';
        secretMessage.style.bottom = '5px';
        secretMessage.style.right = '5px';
        secretMessage.style.color = '#000';
        secretMessage.style.fontFamily = 'monospace';
        secretMessage.style.fontSize = '8px';
        secretMessage.style.opacity = '0.1';
        secretMessage.textContent = "help i'm trapped";
        
        // Create a memory dump/debug screen that appears occasionally
        const debugScreen = document.createElement('div');
        debugScreen.classList.add('debug-screen');
        debugScreen.style.position = 'absolute';
        debugScreen.style.top = '0';
        debugScreen.style.left = '0';
        debugScreen.style.width = '100%';
        debugScreen.style.height = '100%';
        debugScreen.style.backgroundColor = '#00f';
        debugScreen.style.color = '#fff';
        debugScreen.style.fontFamily = 'monospace';
        debugScreen.style.fontSize = '12px';
        debugScreen.style.padding = '10px';
        debugScreen.style.boxSizing = 'border-box';
        debugScreen.style.whiteSpace = 'pre';
        debugScreen.style.overflow = 'hidden';
        debugScreen.style.display = 'none';
        debugScreen.style.zIndex = '3';
        
        // Debug text content - memory addresses and corrupted data
        let debugText = "MEMORY DUMP AT 0xF000:\n\n";
        for (let i = 0; i < 10; i++) {
            let line = `0xF${(i * 16).toString(16).padStart(3, '0')}: `;
            for (let j = 0; j < 16; j++) {
                line += Math.floor(Math.random() * 256).toString(16).padStart(2, '0') + ' ';
            }
            debugText += line + '\n';
        }
        
        debugText += "\nERROR CODE: 0x45_CARTRIDGE_CORRUPTION\n";
        debugText += "PLAYER DATA: CORRUPTED\n";
        debugText += "SAVE STATE: NOT FOUND\n\n";
        debugText += "MEMORY INTEGRITY: FAILED\n";
        debugText += "ATTEMPTING RECOVERY... FAILED\n\n";
        debugText += "WARNING: UNUSUAL BEHAVIOR DETECTED\n";
        debugText += "DO NOT CONTINUE GAMEPLAY\n";
        debugText += "RECOMMENDED ACTION: POWER OFF SYSTEM";
        
        debugScreen.textContent = debugText;
        
        // Create glitch overlay
        const glitchOverlay = document.createElement('div');
        glitchOverlay.classList.add('glitch-overlay');
        glitchOverlay.style.position = 'absolute';
        glitchOverlay.style.top = '0';
        glitchOverlay.style.left = '0';
        glitchOverlay.style.width = '100%';
        glitchOverlay.style.height = '100%';
        glitchOverlay.style.backgroundImage = 'linear-gradient(transparent 50%, rgba(255,0,0,0.1) 50%)';
        glitchOverlay.style.backgroundSize = '100% 4px';
        glitchOverlay.style.pointerEvents = 'none';
        glitchOverlay.style.zIndex = '2';
        glitchOverlay.style.opacity = '0.3';
        
        // Subliminal face that appears briefly
        const face = document.createElement('div');
        face.classList.add('subliminal-face');
        face.style.position = 'absolute';
        face.style.top = '0';
        face.style.left = '0';
        face.style.width = '100%';
        face.style.height = '100%';
        face.style.backgroundSize = 'cover';
        face.style.backgroundPosition = 'center';
        face.style.opacity = '0';
        face.style.zIndex = '4';
        
        // Create face with canvas
        const faceCanvas = document.createElement('canvas');
        faceCanvas.width = 32;
        faceCanvas.height = 32;
        const faceCtx = faceCanvas.getContext('2d');
        
        // Draw a simple creepy face
        faceCtx.fillStyle = '#000';
        faceCtx.fillRect(0, 0, 32, 32);
        
        // Eyes
        faceCtx.fillStyle = '#f00';
        faceCtx.fillRect(8, 10, 4, 4);
        faceCtx.fillRect(20, 10, 4, 4);
        
        // Smile
        faceCtx.beginPath();
        faceCtx.arc(16, 20, 8, 0, Math.PI);
        faceCtx.strokeStyle = '#f00';
        faceCtx.lineWidth = 2;
        faceCtx.stroke();
        
        face.style.backgroundImage = `url(${faceCanvas.toDataURL()})`;
        
        // Add animation styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes textGlitch {
                0%, 100% { transform: translate(0, 0) skew(0deg, 0deg); }
                20% { transform: translate(-2px, 0) skew(10deg, 0deg); }
                40% { transform: translate(2px, 0) skew(-8deg, 0deg); }
                60% { transform: translate(-2px, 0) skew(0deg, 0deg); }
                80% { transform: translate(2px, 0) skew(0deg, 0deg); }
            }
            
            @keyframes colorGlitch {
                0%, 100% { text-shadow: 2px 2px #800; }
                25% { text-shadow: -2px 2px #080; }
                50% { text-shadow: 2px -2px #008; }
                75% { text-shadow: -2px -2px #880; }
            }
            
            @keyframes scanlines {
                0% { transform: translateY(0); }
                100% { transform: translateY(4px); }
            }
            
            @keyframes faceFlash {
                0%, 85%, 100% { opacity: 0; }
                90%, 91% { opacity: 0.8; }
            }
            
            @keyframes debugFlicker {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.95; }
            }
            
            @keyframes optionFlicker {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            
            .corrupted-option {
                animation: textGlitch 0.5s infinite, colorGlitch 2s infinite;
            }
            
            .menu-option:last-child {
                animation: optionFlicker 1s infinite;
            }
        `;
        
        // Assemble the elements
        logo.appendChild(logoText);
        titleScreen.appendChild(gameTitle);
        titleScreen.appendChild(logo);
        titleScreen.appendChild(menuOptions);
        titleScreen.appendChild(copyright);
        titleScreen.appendChild(secretMessage);
        
        container.appendChild(titleScreen);
        container.appendChild(debugScreen);
        container.appendChild(glitchOverlay);
        container.appendChild(face);
        container.appendChild(style);
        
        return container;
    }

    function initLostCartridge() {
        if (currentChannel !== 5 || !isTvOn) return;
        
        const container = document.querySelector('.lost-cartridge');
        if (!container) return;
        
        const gameTitle = container.querySelector('.game-title');
        const debugScreen = container.querySelector('.debug-screen');
        const face = container.querySelector('.subliminal-face');
        const selectedOption = container.querySelector('.menu-option:last-child');
        const glitchOverlay = container.querySelector('.glitch-overlay');
        
        // Start animations
        glitchOverlay.style.animation = 'scanlines 0.5s linear infinite';
        
        // Glitch the title randomly
        const glitchTitle = () => {
            if (currentChannel !== 5 || !isTvOn) return;
            
            // Randomize the title text with symbols
            if (Math.random() > 0.7) {
                const symbols = '口□◻◼◘▌⌂▀┌┐█▓▒░▄▀▐▌';
                let newTitle = '';
                for (let i = 0; i < 10; i++) {
                    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
                    const color = Math.random() > 0.8 ? `#${Math.floor(Math.random() * 16777215).toString(16)}` : '#fff';
                    newTitle += `<span style="color:${color};">${symbol}</span>`;
                }
                gameTitle.innerHTML = newTitle;
                
                // Apply glitch effect
                gameTitle.style.animation = 'textGlitch 0.2s infinite';
                
                // Reset after a short time
                setTimeout(() => {
                    gameTitle.style.animation = 'none';
                    gameTitle.innerHTML = '口□◻◼◘<span style="color:#f00;">▌</span>⌂<span style="color:#0f0;">▀</span>┌┐';
                }, 1000);
            }
            
            // Schedule next glitch
            setTimeout(glitchTitle, Math.random() * 5000 + 3000);
        };
        
        // Show debug screen occasionally
        const showDebugScreen = () => {
            if (currentChannel !== 5 || !isTvOn) return;
            
            if (Math.random() > 0.7) {
                debugScreen.style.display = 'block';
                debugScreen.style.animation = 'debugFlicker 0.1s infinite';
                
                // Hide after a few seconds
                setTimeout(() => {
                    debugScreen.style.display = 'none';
                    debugScreen.style.animation = 'none';
                }, Math.random() * 2000 + 1000);
            }
            
            // Schedule next debug screen appearance
            setTimeout(showDebugScreen, Math.random() * 10000 + 10000);
        };
        
        // Show subliminal face occasionally
        const showFace = () => {
            if (currentChannel !== 5 || !isTvOn) return;
            
            if (Math.random() > 0.6) {
                face.style.animation = 'faceFlash 2s forwards';
                
                // Reset animation
                setTimeout(() => {
                    face.style.animation = 'none';
                    
                    // Schedule next face appearance
                    if (currentChannel === 5 && isTvOn) {
                        setTimeout(showFace, Math.random() * 15000 + 10000);
                    }
                }, 2000);
            } else {
                // Schedule next face appearance
                setTimeout(showFace, Math.random() * 15000 + 10000);
            }
        };
        
        // Create audio distortion
        const createDistortedSound = () => {
            if (currentChannel !== 5 || !isTvOn) return;
            
            if (Math.random() > 0.7) {
                // Trigger distorted sound here if you have audio implemented
                
                // Make the screen glitch harder during sound
                glitchOverlay.style.opacity = '0.7';
                
                // Reset after the sound
                setTimeout(() => {
                    glitchOverlay.style.opacity = '0.3';
                }, 500);
            }
            
            // Schedule next sound
            setTimeout(createDistortedSound, Math.random() * 8000 + 5000);
        };
        
        // Start all effects
        glitchTitle();
        showDebugScreen();
        showFace();
        createDistortedSound();
        
        // Handle "ERASE SELF" option being selected
        selectedOption.addEventListener('click', () => {
            if (currentChannel !== 5 || !isTvOn) return;
            
            // Flash the screen
            const flash = document.createElement('div');
            flash.style.position = 'absolute';
            flash.style.top = '0';
            flash.style.left = '0';
            flash.style.width = '100%';
            flash.style.height = '100%';
            flash.style.backgroundColor = '#fff';
            flash.style.zIndex = '5';
            container.appendChild(flash);
            
            // Show message
            setTimeout(() => {
                flash.style.backgroundColor = '#000';
                flash.style.color = '#f00';
                flash.style.display = 'flex';
                flash.style.alignItems = 'center';
                flash.style.justifyContent = 'center';
                flash.style.fontFamily = 'monospace';
                flash.style.fontSize = '16px';
                flash.textContent = "THANK YOU FOR RELEASING ME";
                
                // Remove after a few seconds
                setTimeout(() => {
                    if (container.contains(flash)) {
                        container.removeChild(flash);
                    }
                }, 3000);
            }, 1000);
        });
    }

    function createHauntedPacman() {
        const container = document.createElement('div');
        container.classList.add('game-container', 'haunted-pacman');
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.backgroundColor = '#000';
        container.style.overflow = 'hidden';
        container.style.position = 'relative';
        container.classList.add('nes-pixel-art');
        
        // Create game canvas
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 240;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.imageRendering = 'pixelated';
        
        const ctx = canvas.getContext('2d');
        
        // Draw maze background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw score area
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, 32);
        
        // Draw maze walls
        ctx.fillStyle = '#0000aa';
        
        // Outer walls
        ctx.fillRect(16, 32, canvas.width - 32, 8);  // Top
        ctx.fillRect(16, canvas.height - 16, canvas.width - 32, 8);  // Bottom
        ctx.fillRect(16, 32, 8, canvas.height - 48);  // Left
        ctx.fillRect(canvas.width - 24, 32, 8, canvas.height - 48);  // Right
        
        // Inner maze patterns
        // Horizontal barriers
        for (let i = 0; i < 3; i++) {
            const y = 64 + i * 48;
            ctx.fillRect(40, y, 40, 8);
            ctx.fillRect(96, y, 64, 8);
            ctx.fillRect(176, y, 40, 8);
        }
        
        // Vertical barriers
        for (let i = 0; i < 2; i++) {
            const x = 64 + i * 128;
            ctx.fillRect(x, 56, 8, 32);
            ctx.fillRect(x, 104, 8, 32);
            ctx.fillRect(x, 152, 8, 32);
        }
        
        // Draw T-shaped barriers
        ctx.fillRect(128 - 16, 88, 32, 8);
        ctx.fillRect(128 - 4, 88, 8, 32);
        
        // Draw random barriers (some that don't quite fit the pattern)
        const randomBarriers = [
            { x: 40, y: 190, width: 32, height: 8 },
            { x: 88, y: 170, width: 8, height: 24 },
            { x: 160, y: 190, width: 8, height: 24 },
            { x: 184, y: 170, width: 32, height: 8 }
        ];
        
        randomBarriers.forEach(barrier => {
            ctx.fillRect(barrier.x, barrier.y, barrier.width, barrier.height);
        });
        
        // Place dots throughout the maze
        ctx.fillStyle = '#ffff00';
        
        const dots = [];
        for (let x = 32; x < canvas.width - 32; x += 16) {
            for (let y = 48; y < canvas.height - 24; y += 16) {
                // Check if not colliding with walls (simplistic check)
                let collidesWithWall = false;
                
                // Check outer walls
                if (x < 32 || x > canvas.width - 32 || y < 48 || y > canvas.height - 24) {
                    collidesWithWall = true;
                }
                
                // Check horizontal barriers
                for (let i = 0; i < 3; i++) {
                    const barrierY = 64 + i * 48;
                    if (y >= barrierY - 8 && y <= barrierY + 8) {
                        if ((x >= 40 && x <= 80) || (x >= 96 && x <= 160) || (x >= 176 && x <= 216)) {
                            collidesWithWall = true;
                        }
                    }
                }
                
                // Check vertical barriers
                for (let i = 0; i < 2; i++) {
                    const barrierX = 64 + i * 128;
                    if (x >= barrierX - 8 && x <= barrierX + 8) {
                        if ((y >= 56 && y <= 88) || (y >= 104 && y <= 136) || (y >= 152 && y <= 184)) {
                            collidesWithWall = true;
                        }
                    }
                }
                
                // Check T-shaped barrier
                if (y >= 88 - 8 && y <= 88 + 8 && x >= 112 && x <= 144) {
                    collidesWithWall = true;
                }
                if (x >= 124 - 4 && x <= 132 && y >= 88 && y <= 120) {
                    collidesWithWall = true;
                }
                
                // Check random barriers
                for (const barrier of randomBarriers) {
                    if (x >= barrier.x - 8 && x <= barrier.x + barrier.width + 8 &&
                        y >= barrier.y - 8 && y <= barrier.y + barrier.height + 8) {
                        collidesWithWall = true;
                    }
                }
                
                if (!collidesWithWall) {
                    dots.push({ x, y });
                    ctx.beginPath();
                    ctx.arc(x, y, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        
        // Draw scoreboard text
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px monospace';
        ctx.fillText('SCORE: 0', 16, 16);
        ctx.fillText('LIVES: 0', 180, 16);
        
        // Add text that says HIGH SCORE
        ctx.fillStyle = '#ff0000';
        ctx.fillText('HIGH SCORE', 96, 16);
        ctx.fillText('666', 120, 24);
        
        // Create blood splatters overlay
        const bloodCanvas = document.createElement('canvas');
        bloodCanvas.width = 256;
        bloodCanvas.height = 240;
        bloodCanvas.style.position = 'absolute';
        bloodCanvas.style.top = '0';
        bloodCanvas.style.left = '0';
        bloodCanvas.style.width = '100%';
        bloodCanvas.style.height = '100%';
        bloodCanvas.style.opacity = '0.4';
        bloodCanvas.style.pointerEvents = 'none';
        bloodCanvas.style.zIndex = '2';
        bloodCanvas.style.imageRendering = 'pixelated';
        
        const bloodCtx = bloodCanvas.getContext('2d');
        
        // Create a few splatters
        bloodCtx.fillStyle = '#bb0000';
        
        // Create random blood splatters
        for (let i = 0; i < 10; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random() * 20 + 10;
            
            bloodCtx.beginPath();
            bloodCtx.arc(x, y, size, 0, Math.PI * 2);
            bloodCtx.fill();
            
            // Add drips
            const numDrips = Math.floor(Math.random() * 3) + 2;
            for (let j = 0; j < numDrips; j++) {
                const dripX = x + Math.random() * 20 - 10;
                const dripLength = Math.random() * 30 + 10;
                
                bloodCtx.beginPath();
                bloodCtx.moveTo(dripX, y);
                bloodCtx.lineTo(dripX, y + dripLength);
                bloodCtx.lineTo(dripX + 2, y + dripLength);
                bloodCtx.lineTo(dripX + 2, y);
                bloodCtx.fill();
            }
        }
        
        // Create Pacman character (normal and skull version)
        const pacmanCanvas = document.createElement('canvas');
        pacmanCanvas.width = 16;
        pacmanCanvas.height = 16;
        const pacmanCtx = pacmanCanvas.getContext('2d');
        
        // Regular Pacman
        pacmanCtx.fillStyle = '#ffff00';
        pacmanCtx.beginPath();
        pacmanCtx.arc(8, 8, 8, 0.2 * Math.PI, 1.8 * Math.PI);
        pacmanCtx.lineTo(8, 8);
        pacmanCtx.fill();
        
        // Create Pacman element
        const pacmanElement = document.createElement('div');
        pacmanElement.classList.add('pacman');
        pacmanElement.style.position = 'absolute';
        pacmanElement.style.top = '120px';
        pacmanElement.style.left = '120px';
        pacmanElement.style.width = '16px';
        pacmanElement.style.height = '16px';
        
        // Optimize image quality by specifying format and compression
        pacmanElement.style.backgroundImage = `url(${pacmanCanvas.toDataURL('image/png', 0.8)})`;
        pacmanElement.style.zIndex = '1';
        
        // Create skull version of Pacman
        const skullCanvas = document.createElement('canvas');
        skullCanvas.width = 16;
        skullCanvas.height = 16;
        const skullCtx = skullCanvas.getContext('2d');
        
        // Skull shape
        skullCtx.fillStyle = '#ffffff';
        skullCtx.beginPath();
        skullCtx.arc(8, 8, 7, 0, Math.PI * 2);
        skullCtx.fill();
        
        // Skull details
        skullCtx.fillStyle = '#000';
        
        // Eyes
        skullCtx.fillRect(4, 5, 3, 3);
        skullCtx.fillRect(9, 5, 3, 3);
        
        // Nose
        skullCtx.fillRect(7, 9, 2, 2);
        
        // Teeth
        skullCtx.fillRect(5, 11, 6, 2);
        skullCtx.fillStyle = '#fff';
        skullCtx.fillRect(6, 11, 1, 2);
        skullCtx.fillRect(8, 11, 1, 2);
        
        // Create ghost characters
        const ghosts = [];
        const ghostColors = ['#ff0000', '#00ffff', '#ffb8ff', '#ffb852'];
        
        for (let i = 0; i < 4; i++) {
            const ghostCanvas = document.createElement('canvas');
            ghostCanvas.width = 16;
            ghostCanvas.height = 16;
            const ghostCtx = ghostCanvas.getContext('2d');
            
            // Draw ghost body
            ghostCtx.fillStyle = ghostColors[i];
            ghostCtx.beginPath();
            ghostCtx.arc(8, 8, 7, Math.PI, 0, false);
            ghostCtx.fillRect(1, 8, 14, 7);
            
            // Draw wavy bottom
            ghostCtx.beginPath();
            ghostCtx.moveTo(1, 15);
            ghostCtx.lineTo(1, 13);
            ghostCtx.lineTo(3, 15);
            ghostCtx.lineTo(5, 13);
            ghostCtx.lineTo(7, 15);
            ghostCtx.lineTo(9, 13);
            ghostCtx.lineTo(11, 15);
            ghostCtx.lineTo(13, 13);
            ghostCtx.lineTo(15, 15);
            ghostCtx.fill();
            
            // Draw eyes
            ghostCtx.fillStyle = '#ffffff';
            ghostCtx.beginPath();
            ghostCtx.arc(5, 7, 2, 0, Math.PI * 2);
            ghostCtx.arc(11, 7, 2, 0, Math.PI * 2);
            ghostCtx.fill();
            
            // Draw pupils
            ghostCtx.fillStyle = '#0000ff';
            ghostCtx.beginPath();
            ghostCtx.arc(5, 7, 1, 0, Math.PI * 2);
            ghostCtx.arc(11, 7, 1, 0, Math.PI * 2);
            ghostCtx.fill();
            
            // Create ghost element
            const ghostElement = document.createElement('div');
            ghostElement.classList.add('ghost');
            ghostElement.style.position = 'absolute';
            ghostElement.style.top = `${70 + i * 30}px`;
            ghostElement.style.left = `${40 + i * 40}px`;
            ghostElement.style.width = '16px';
            ghostElement.style.height = '16px';
            
            // Optimize image quality by specifying format and compression
            ghostElement.style.backgroundImage = `url(${ghostCanvas.toDataURL('image/png', 0.8)})`;
            ghostElement.style.zIndex = '1';
            
            // Create demonic version of ghost (for transformation)
            const demonicGhostCanvas = document.createElement('canvas');
            demonicGhostCanvas.width = 16;
            demonicGhostCanvas.height = 16;
            const demonicGhostCtx = demonicGhostCanvas.getContext('2d');
            
            // Draw ghost body (dark red)
            demonicGhostCtx.fillStyle = '#880000';
            demonicGhostCtx.beginPath();
            demonicGhostCtx.arc(8, 8, 7, Math.PI, 0, false);
            demonicGhostCtx.fillRect(1, 8, 14, 7);
            
            // Draw wavy bottom with pointy edges
            demonicGhostCtx.beginPath();
            demonicGhostCtx.moveTo(1, 15);
            demonicGhostCtx.lineTo(1, 13);
            demonicGhostCtx.lineTo(4, 16);
            demonicGhostCtx.lineTo(8, 13);
            demonicGhostCtx.lineTo(12, 16);
            demonicGhostCtx.lineTo(15, 13);
            demonicGhostCtx.lineTo(15, 15);
            demonicGhostCtx.fill();
            
            // Draw demonic eyes
            demonicGhostCtx.fillStyle = '#ff0000';
            demonicGhostCtx.beginPath();
            demonicGhostCtx.arc(5, 7, 2, 0, Math.PI * 2);
            demonicGhostCtx.arc(11, 7, 2, 0, Math.PI * 2);
            demonicGhostCtx.fill();
            
            // Draw narrow pupils
            demonicGhostCtx.fillStyle = '#000';
            demonicGhostCtx.fillRect(4, 6, 2, 1);
            demonicGhostCtx.fillRect(10, 6, 2, 1);
            
            // Add sharp teeth
            demonicGhostCtx.fillStyle = '#ffffff';
            demonicGhostCtx.beginPath();
            demonicGhostCtx.moveTo(4, 10);
            demonicGhostCtx.lineTo(6, 12);
            demonicGhostCtx.lineTo(8, 10);
            demonicGhostCtx.lineTo(10, 12);
            demonicGhostCtx.lineTo(12, 10);
            demonicGhostCtx.fill();
            
            // Store the ghost data
            ghosts.push({
                element: ghostElement,
                normalImage: ghostCanvas.toDataURL('image/png', 0.8),
                demonicImage: demonicGhostCanvas.toDataURL('image/png', 0.8),
                x: 40 + i * 40,
                y: 70 + i * 30
            });
            
            container.appendChild(ghostElement);
        }
        
        // Create GAME OVER text
        const gameOverElement = document.createElement('div');
        gameOverElement.classList.add('game-over');
        gameOverElement.style.position = 'absolute';
        gameOverElement.style.top = '50%';
        gameOverElement.style.left = '50%';
        gameOverElement.style.transform = 'translate(-50%, -50%)';
        gameOverElement.style.color = '#ff0000';
        gameOverElement.style.fontFamily = 'monospace';
        gameOverElement.style.fontSize = '24px';
        gameOverElement.style.textAlign = 'center';
        gameOverElement.style.opacity = '0';
        gameOverElement.style.zIndex = '3';
        gameOverElement.style.textShadow = '2px 2px #000';
        gameOverElement.textContent = 'GAME OVER';
        
        // Create hidden message
        const hiddenMessage = document.createElement('div');
        hiddenMessage.classList.add('hidden-message');
        hiddenMessage.style.position = 'absolute';
        hiddenMessage.style.top = '70%';
        hiddenMessage.style.left = '50%';
        hiddenMessage.style.transform = 'translate(-50%, -50%)';
        hiddenMessage.style.color = '#ffffff';
        hiddenMessage.style.fontFamily = 'monospace';
        hiddenMessage.style.fontSize = '8px';
        hiddenMessage.style.textAlign = 'center';
        hiddenMessage.style.opacity = '0';
        hiddenMessage.style.zIndex = '3';
        hiddenMessage.style.textShadow = '1px 1px #000';
        hiddenMessage.textContent = 'THEY ATE WHAT THEY BECAME...';
        
        // Create CSS animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pacmanMouth {
                0%, 100% { clip-path: polygon(50% 50%, 100% 25%, 100% 75%); }
                50% { clip-path: polygon(50% 50%, 100% 0%, 100% 100%); }
            }
            
            .pacman {
                animation: pacmanMouth 0.3s infinite linear;
            }
            
            @keyframes ghostFloat {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-2px); }
            }
            
            .ghost {
                animation: ghostFloat 2s infinite ease-in-out;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes bloodDrip {
                0% { transform: translateY(0); }
                100% { transform: translateY(5px); }
            }
        `;
        
        // Assemble everything
        container.appendChild(canvas);
        container.appendChild(bloodCanvas);
        container.appendChild(pacmanElement);
        container.appendChild(gameOverElement);
        container.appendChild(hiddenMessage);
        container.appendChild(style);
        
        return container;
    }

    function initHauntedPacman() {
        if (currentChannel !== 6 || !isTvOn) return;
        
        // Wait a bit to ensure the DOM is updated with the new game elements
        setTimeout(() => {
            const container = document.querySelector('.haunted-pacman');
            if (!container) return;
            
            const pacman = container.querySelector('.pacman');
            const ghosts = container.querySelectorAll('.ghost');
            const gameOver = container.querySelector('.game-over');
            const hiddenMessage = container.querySelector('.hidden-message');
            const bloodCanvas = container.querySelector('canvas:nth-child(2)');
            
            // Make sure all required elements exist
            if (!pacman || !bloodCanvas || !gameOver || !hiddenMessage) return;
            
            // Pacman movement variables
            let pacmanX = 120;
            let pacmanY = 120;
            let pacmanDirection = { x: 1, y: 0 };
            
            // Move Pacman randomly
            const movePacman = () => {
                if (currentChannel !== 6 || !isTvOn) return;
                
                // Randomly change direction occasionally
                if (Math.random() > 0.7) {
                    const directions = [
                        { x: 1, y: 0 },
                        { x: -1, y: 0 },
                        { x: 0, y: 1 },
                        { x: 0, y: -1 }
                    ];
                    
                    pacmanDirection = directions[Math.floor(Math.random() * directions.length)];
                }
                
                // Move in current direction
                pacmanX += pacmanDirection.x * 2;
                pacmanY += pacmanDirection.y * 2;
                
                // Boundary check
                if (pacmanX < 24) pacmanX = 24;
                if (pacmanX > 216) pacmanX = 216;
                if (pacmanY < 40) pacmanY = 40;
                if (pacmanY > 216) pacmanY = 216;
                
                // Update position
                pacman.style.left = `${pacmanX}px`;
                pacman.style.top = `${pacmanY}px`;
                
                // Update rotation based on direction
                if (pacmanDirection.x === 1) {
                    pacman.style.transform = 'rotate(0deg)';
                } else if (pacmanDirection.x === -1) {
                    pacman.style.transform = 'rotate(180deg)';
                } else if (pacmanDirection.y === -1) {
                    pacman.style.transform = 'rotate(270deg)';
                } else if (pacmanDirection.y === 1) {
                    pacman.style.transform = 'rotate(90deg)';
                }
                
                // Randomly transform Pacman into skull (if not already)
                if (Math.random() > 0.98 && !pacman.dataset.transformed) {
                    // Create and store the skull canvas
                    if (!pacman.dataset.skullImage) {
                        const skullCanvas = document.createElement('canvas');
                        skullCanvas.width = 16;
                        skullCanvas.height = 16;
                        const skullCtx = skullCanvas.getContext('2d');
                        
                        // Skull shape
                        skullCtx.fillStyle = '#ffffff';
                        skullCtx.beginPath();
                        skullCtx.arc(8, 8, 7, 0, Math.PI * 2);
                        skullCtx.fill();
                        
                        // Skull details
                        skullCtx.fillStyle = '#000';
                        
                        // Eyes
                        skullCtx.fillRect(4, 5, 3, 3);
                        skullCtx.fillRect(9, 5, 3, 3);
                        
                        // Nose
                        skullCtx.fillRect(7, 9, 2, 2);
                        
                        // Teeth
                        skullCtx.fillRect(5, 11, 6, 2);
                        skullCtx.fillStyle = '#fff';
                        skullCtx.fillRect(6, 11, 1, 2);
                        skullCtx.fillRect(8, 11, 1, 2);
                        
                        pacman.dataset.skullImage = skullCanvas.toDataURL('image/png', 0.8);
                        
                        // Store original image
                        pacman.dataset.originalImage = pacman.style.backgroundImage;
                    }
                    
                    // Transform to skull
                    pacman.style.backgroundImage = `url(${pacman.dataset.skullImage})`;
                    pacman.style.animation = 'none';
                    pacman.dataset.transformed = 'true';
                    
                    // Transform back after a delay
                    setTimeout(() => {
                        if (currentChannel === 6 && isTvOn) {
                            pacman.style.backgroundImage = pacman.dataset.originalImage;
                            pacman.style.animation = 'pacmanMouth 0.3s infinite linear';
                            delete pacman.dataset.transformed;
                        }
                    }, 2000);
                }
                
                // Schedule next movement
                setTimeout(movePacman, 200);
            };
            
            // Move ghosts randomly and sometimes transform them
            const moveGhosts = () => {
                if (currentChannel !== 6 || !isTvOn) return;
                
                Array.from(ghosts).forEach((ghost, index) => {
                    // Get current position
                    const left = parseInt(ghost.style.left);
                    const top = parseInt(ghost.style.top);
                    
                    // Random movement
                    let newLeft = left + (Math.random() * 6 - 3);
                    let newTop = top + (Math.random() * 6 - 3);
                    
                    // Boundary check
                    newLeft = Math.max(24, Math.min(216, newLeft));
                    newTop = Math.max(40, Math.min(216, newTop));
                    
                    // Update position
                    ghost.style.left = `${newLeft}px`;
                    ghost.style.top = `${newTop}px`;
                    
                    // Sometimes transform ghost into demonic version
                    if (Math.random() > 0.95 && !ghost.dataset.transformed) {
                        if (!ghost.dataset.normalImage) {
                            ghost.dataset.normalImage = ghost.style.backgroundImage;
                            
                            // Create demonic version on first transformation
                            const demonicGhostCanvas = document.createElement('canvas');
                            demonicGhostCanvas.width = 16;
                            demonicGhostCanvas.height = 16;
                            const demonicGhostCtx = demonicGhostCanvas.getContext('2d');
                            
                            // Draw ghost body (dark red)
                            demonicGhostCtx.fillStyle = '#880000';
                            demonicGhostCtx.beginPath();
                            demonicGhostCtx.arc(8, 8, 7, Math.PI, 0, false);
                            demonicGhostCtx.fillRect(1, 8, 14, 7);
                            
                            // Draw wavy bottom with pointy edges
                            demonicGhostCtx.beginPath();
                            demonicGhostCtx.moveTo(1, 15);
                            demonicGhostCtx.lineTo(1, 13);
                            demonicGhostCtx.lineTo(4, 16);
                            demonicGhostCtx.lineTo(8, 13);
                            demonicGhostCtx.lineTo(12, 16);
                            demonicGhostCtx.lineTo(15, 13);
                            demonicGhostCtx.lineTo(15, 15);
                            demonicGhostCtx.fill();
                            
                            // Draw demonic eyes
                            demonicGhostCtx.fillStyle = '#ff0000';
                            demonicGhostCtx.beginPath();
                            demonicGhostCtx.arc(5, 7, 2, 0, Math.PI * 2);
                            demonicGhostCtx.arc(11, 7, 2, 0, Math.PI * 2);
                            demonicGhostCtx.fill();
                            
                            // Draw narrow pupils
                            demonicGhostCtx.fillStyle = '#000';
                            demonicGhostCtx.fillRect(4, 6, 2, 1);
                            demonicGhostCtx.fillRect(10, 6, 2, 1);
                            
                            // Add sharp teeth
                            demonicGhostCtx.fillStyle = '#ffffff';
                            demonicGhostCtx.beginPath();
                            demonicGhostCtx.moveTo(4, 10);
                            demonicGhostCtx.lineTo(6, 12);
                            demonicGhostCtx.lineTo(8, 10);
                            demonicGhostCtx.lineTo(10, 12);
                            demonicGhostCtx.lineTo(12, 10);
                            demonicGhostCtx.fill();
                            
                            ghost.dataset.demonicImage = demonicGhostCanvas.toDataURL('image/png', 0.8);
                        }
                        
                        // Transform to demonic
                        ghost.style.backgroundImage = `url(${ghost.dataset.demonicImage})`;
                        ghost.dataset.transformed = 'true';
                        
                        // Transform back after a delay
                        setTimeout(() => {
                            if (currentChannel === 6 && isTvOn) {
                                ghost.style.backgroundImage = ghost.dataset.normalImage;
                                delete ghost.dataset.transformed;
                            }
                        }, 2000);
                    }
                });
                
                // Schedule next movement
                setTimeout(moveGhosts, 500);
            };
            
            // Create blood drip effects occasionally
            const addBloodDrip = () => {
                if (currentChannel !== 6 || !isTvOn) return;
                
                // Make sure bloodCanvas exists
                if (!bloodCanvas) return;
                
                const bloodCtx = bloodCanvas.getContext('2d');
                
                // Create a new drip at random position
                const x = Math.random() * bloodCanvas.width;
                const y = Math.random() * 50 + 40;
                const width = Math.random() * 3 + 2;
                const height = Math.random() * 10 + 5;
                
                bloodCtx.fillStyle = '#aa0000';
                bloodCtx.fillRect(x, y, width, height);
                
                // Schedule next drip
                setTimeout(addBloodDrip, Math.random() * 5000 + 3000);
            };
            
            // Show hidden message occasionally
            const showHiddenMessage = () => {
                if (currentChannel !== 6 || !isTvOn) return;
                
                if (Math.random() > 0.7) {
                    hiddenMessage.style.opacity = '1';
                    
                    // Random messages
                    const messages = [
                        'THEY ATE WHAT THEY BECAME...',
                        'YOU ARE BEING WATCHED',
                        'THE MAZE HAS NO EXIT',
                        'NO ONE ESCAPES',
                        'JOIN US IN THE MAZE'
                    ];
                    
                    hiddenMessage.textContent = messages[Math.floor(Math.random() * messages.length)];
                    
                    // Hide after a delay
                    setTimeout(() => {
                        if (currentChannel === 6 && isTvOn) {
                            hiddenMessage.style.opacity = '0';
                        }
                    }, 2000);
                }
                
                // Schedule next message
                setTimeout(showHiddenMessage, Math.random() * 10000 + 10000);
            };
            
            // Show game over occasionally
            const showGameOver = () => {
                if (currentChannel !== 6 || !isTvOn) return;
                
                gameOver.style.opacity = '1';
                
                // Hide after a delay
                setTimeout(() => {
                    if (currentChannel === 6 && isTvOn) {
                        gameOver.style.opacity = '0';
                    }
                }, 3000);
                
                // Schedule next game over
                setTimeout(showGameOver, Math.random() * 20000 + 20000);
            };
            
            // Start all effects
            setTimeout(movePacman, 1000);
            setTimeout(moveGhosts, 1500);
            setTimeout(addBloodDrip, 3000);
            setTimeout(showHiddenMessage, 8000);
            setTimeout(showGameOver, 15000);
        }, 500); // Wait 500ms for DOM to update
    }

    function createCursedCastlevania() {
        const container = document.createElement('div');
        container.classList.add('game-container', 'cursed-castlevania');
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.backgroundColor = '#000';
        container.style.overflow = 'hidden';
        container.style.position = 'relative';
        container.classList.add('nes-pixel-art');
        
        // Create game canvas
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 240;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.imageRendering = 'pixelated';
        
        const ctx = canvas.getContext('2d');
        
        // Draw castle background with moonlight
        ctx.fillStyle = '#000033'; // Dark blue night sky
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Moon
        ctx.fillStyle = '#aaaaff';
        ctx.beginPath();
        ctx.arc(200, 50, 30, 0, Math.PI * 2);
        ctx.fill();
        
        // Moon shadow/detail
        ctx.fillStyle = '#000033';
        ctx.beginPath();
        ctx.arc(185, 40, 25, 0, Math.PI * 2);
        ctx.fill();
        
        // Stars
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * 100;
            const size = Math.random() * 2 + 1;
            
            ctx.fillRect(x, y, size, size);
        }
        
        // Draw castle silhouette
        ctx.fillStyle = '#111';
        
        // Main tower
        ctx.fillRect(100, 80, 56, 160);
        
        // Tower top
        ctx.beginPath();
        ctx.moveTo(100, 80);
        ctx.lineTo(128, 40);
        ctx.lineTo(156, 80);
        ctx.fill();
        
        // Tower battlements
        for (let i = 0; i < 5; i++) {
            ctx.fillRect(102 + i * 12, 70, 8, 12);
        }
        
        // Side towers
        ctx.fillRect(60, 120, 40, 120);
        ctx.fillRect(156, 120, 40, 120);
        
        // Tower tops
        ctx.beginPath();
        ctx.moveTo(60, 120);
        ctx.lineTo(80, 100);
        ctx.lineTo(100, 120);
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(156, 120);
        ctx.lineTo(176, 100);
        ctx.lineTo(196, 120);
        ctx.fill();
        
        // Ground
        ctx.fillStyle = '#331800';
        ctx.fillRect(0, 220, canvas.width, 20);
        
        // Door (creepy face shape)
        ctx.fillStyle = '#000';
        ctx.fillRect(120, 180, 16, 40);
        
        // Draw windows (that randomly light up with red)
        const windows = [];
        
        // Tower windows
        for (let i = 0; i < 3; i++) {
            const window = {
                x: 120,
                y: 100 + i * 20,
                width: 16,
                height: 10
            };
            windows.push(window);
            
            ctx.fillStyle = '#000';
            ctx.fillRect(window.x, window.y, window.width, window.height);
        }
        
        // Side tower windows
        for (let i = 0; i < 2; i++) {
            const leftWindow = {
                x: 70,
                y: 140 + i * 20,
                width: 10,
                height: 10
            };
            windows.push(leftWindow);
            
            const rightWindow = {
                x: 176,
                y: 140 + i * 20,
                width: 10,
                height: 10
            };
            windows.push(rightWindow);
            
            ctx.fillStyle = '#000';
            ctx.fillRect(leftWindow.x, leftWindow.y, leftWindow.width, leftWindow.height);
            ctx.fillRect(rightWindow.x, rightWindow.y, rightWindow.width, rightWindow.height);
        }
        
        // Draw player character (vampire hunter)
        const hunterCanvas = document.createElement('canvas');
        hunterCanvas.width = 16;
        hunterCanvas.height = 32;
        const hunterCtx = hunterCanvas.getContext('2d');
        
        // Hunter base
        hunterCtx.fillStyle = '#000';
        hunterCtx.fillRect(0, 0, 16, 32);
        
        // Hunter body
        hunterCtx.fillStyle = '#802';
        hunterCtx.fillRect(4, 8, 8, 16);
        
        // Hunter head
        hunterCtx.fillStyle = '#fca';
        hunterCtx.fillRect(4, 2, 8, 6);
        
        // Hunter legs
        hunterCtx.fillStyle = '#642';
        hunterCtx.fillRect(4, 24, 3, 8);
        hunterCtx.fillRect(9, 24, 3, 8);
        
        // Hunter whip
        hunterCtx.strokeStyle = '#ca6';
        hunterCtx.beginPath();
        hunterCtx.moveTo(12, 15);
        hunterCtx.lineTo(16, 15);
        hunterCtx.stroke();
        
        // Create hunter element
        const hunterElement = document.createElement('div');
        hunterElement.classList.add('hunter');
        hunterElement.style.position = 'absolute';
        hunterElement.style.bottom = '20px';
        hunterElement.style.left = '20px';
        hunterElement.style.width = '16px';
        hunterElement.style.height = '32px';
        hunterElement.style.backgroundImage = `url(${hunterCanvas.toDataURL()})`;
        hunterElement.style.zIndex = '1';
        
        // Create bat elements
        const bats = [];
        for (let i = 0; i < 3; i++) {
            const batCanvas = document.createElement('canvas');
            batCanvas.width = 16;
            batCanvas.height = 8;
            const batCtx = batCanvas.getContext('2d');
            
            // Bat body
            batCtx.fillStyle = '#000';
            batCtx.fillRect(6, 2, 4, 4);
            
            // Bat wings
            batCtx.beginPath();
            batCtx.moveTo(8, 4);
            batCtx.lineTo(2, 0);
            batCtx.lineTo(0, 4);
            batCtx.lineTo(6, 4);
            batCtx.fill();
            
            batCtx.beginPath();
            batCtx.moveTo(8, 4);
            batCtx.lineTo(14, 0);
            batCtx.lineTo(16, 4);
            batCtx.lineTo(10, 4);
            batCtx.fill();
            
            // Bat eyes (red)
            batCtx.fillStyle = '#f00';
            batCtx.fillRect(7, 3, 1, 1);
            batCtx.fillRect(9, 3, 1, 1);
            
            const batElement = document.createElement('div');
            batElement.classList.add('bat');
            batElement.style.position = 'absolute';
            batElement.style.top = `${Math.random() * 100 + 50}px`;
            batElement.style.left = `${Math.random() * 200 + 30}px`;
            batElement.style.width = '16px';
            batElement.style.height = '8px';
            batElement.style.backgroundImage = `url(${batCanvas.toDataURL()})`;
            batElement.style.zIndex = '1';
            
            bats.push(batElement);
            container.appendChild(batElement);
        }
        
        // Create skull element that appears
        const skullCanvas = document.createElement('canvas');
        skullCanvas.width = 32;
        skullCanvas.height = 32;
        const skullCtx = skullCanvas.getContext('2d');
        
        // Skull shape
        skullCtx.fillStyle = '#fff';
        skullCtx.beginPath();
        skullCtx.arc(16, 16, 12, 0, Math.PI * 2);
        skullCtx.fill();
        
        // Skull details
        skullCtx.fillStyle = '#000';
        
        // Eyes
        skullCtx.fillRect(10, 12, 4, 4);
        skullCtx.fillRect(18, 12, 4, 4);
        
        // Nose
        skullCtx.fillRect(15, 18, 2, 2);
        
        // Mouth (teeth)
        skullCtx.fillRect(10, 22, 12, 2);
        skullCtx.fillStyle = '#fff';
        skullCtx.fillRect(12, 22, 2, 2);
        skullCtx.fillRect(16, 22, 2, 2);
        skullCtx.fillRect(20, 22, 2, 2);
        
        const skullElement = document.createElement('div');
        skullElement.classList.add('skull');
        skullElement.style.position = 'absolute';
        skullElement.style.top = '50%';
        skullElement.style.left = '50%';
        skullElement.style.transform = 'translate(-50%, -50%) scale(0)';
        skullElement.style.width = '32px';
        skullElement.style.height = '32px';
        skullElement.style.backgroundImage = `url(${skullCanvas.toDataURL()})`;
        skullElement.style.zIndex = '3';
        skullElement.style.opacity = '0';
        
        // Create blood overlay
        const bloodOverlay = document.createElement('div');
        bloodOverlay.classList.add('blood-overlay');
        bloodOverlay.style.position = 'absolute';
        bloodOverlay.style.top = '0';
        bloodOverlay.style.left = '0';
        bloodOverlay.style.width = '100%';
        bloodOverlay.style.height = '100%';
        bloodOverlay.style.backgroundColor = 'rgba(128, 0, 0, 0)';
        bloodOverlay.style.pointerEvents = 'none';
        bloodOverlay.style.zIndex = '2';
        bloodOverlay.style.transition = 'background-color 1s';
        
        // Add warning message
        const warningMessage = document.createElement('div');
        warningMessage.classList.add('warning-message');
        warningMessage.style.position = 'absolute';
        warningMessage.style.top = '70%';
        warningMessage.style.left = '50%';
        warningMessage.style.transform = 'translate(-50%, -50%)';
        warningMessage.style.color = '#fff';
        warningMessage.style.fontFamily = 'monospace';
        warningMessage.style.fontSize = '16px';
        warningMessage.style.textAlign = 'center';
        warningMessage.style.opacity = '0';
        warningMessage.style.zIndex = '3';
        warningMessage.style.textShadow = '2px 2px #000';
        warningMessage.textContent = 'DIE MONSTER';
        
        // Add animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes batFly {
                0% { transform: translateY(0) scaleX(1); }
                25% { transform: translateY(-5px) scaleX(1.2); }
                50% { transform: translateY(0) scaleX(1); }
                75% { transform: translateY(5px) scaleX(0.8); }
                100% { transform: translateY(0) scaleX(1); }
            }
            
            .bat {
                animation: batFly 0.5s infinite ease-in-out;
            }
            
            @keyframes hunterIdle {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-2px); }
            }
            
            .hunter {
                animation: hunterIdle 1s infinite ease-in-out;
            }
            
            @keyframes skullAppear {
                0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
                50% { transform: translate(-50%, -50%) scale(3); opacity: 1; }
                100% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
            }
            
            @keyframes messageFlash {
                0%, 100% { opacity: 0; }
                10%, 40% { opacity: 1; }
                50% { opacity: 0; }
            }
            
            @keyframes redWindow {
                0% { background-color: #000; }
                50% { background-color: #600; }
                100% { background-color: #000; }
            }
        `;
        
        // Assemble the game
        container.appendChild(canvas);
        container.appendChild(hunterElement);
        container.appendChild(skullElement);
        container.appendChild(bloodOverlay);
        container.appendChild(warningMessage);
        container.appendChild(style);
        
        return container;
    }

    function initCursedCastlevania() {
        if (currentChannel !== 7 || !isTvOn) return;
        
        const container = document.querySelector('.cursed-castlevania');
        if (!container) return;
        
        const hunter = container.querySelector('.hunter');
        const bats = container.querySelectorAll('.bat');
        const skull = container.querySelector('.skull');
        const bloodOverlay = container.querySelector('.blood-overlay');
        const warningMessage = container.querySelector('.warning-message');
        
        // Move hunter (patrol slowly)
        let hunterDirection = 1;
        let hunterPosition = 20;
        
        const moveHunter = () => {
            if (currentChannel !== 7 || !isTvOn) return;
            
            // Move in current direction
            hunterPosition += hunterDirection * 2;
            
            // Boundary check
            if (hunterPosition < 20) {
                hunterPosition = 20;
                hunterDirection = 1;
                hunter.style.transform = 'scaleX(1)';
            } else if (hunterPosition > 220) {
                hunterPosition = 220;
                hunterDirection = -1;
                hunter.style.transform = 'scaleX(-1)';
            }
            
            hunter.style.left = `${hunterPosition}px`;
            
            // Schedule next movement
            setTimeout(moveHunter, 100);
        };
        
        // Move bats (random movement)
        const moveBats = () => {
            if (currentChannel !== 7 || !isTvOn) return;
            
            bats.forEach(bat => {
                // Get current position
                const left = parseInt(bat.style.left);
                const top = parseInt(bat.style.top);
                
                // Random movement
                const newLeft = left + (Math.random() * 10 - 5);
                const newTop = top + (Math.random() * 10 - 5);
                
                // Boundary check
                bat.style.left = `${Math.max(10, Math.min(230, newLeft))}px`;
                bat.style.top = `${Math.max(10, Math.min(180, newTop))}px`;
            });
            
            // Schedule next movement
            setTimeout(moveBats, 500);
        };
        
        // Randomly light up windows with red glow
        const lightWindows = () => {
            if (currentChannel !== 7 || !isTvOn) return;
            
            // Get canvas and context
            const canvas = container.querySelector('canvas');
            const ctx = canvas.getContext('2d');
            
            // Randomly choose a window to light up
            const windowIndex = Math.floor(Math.random() * 7);
            
            // Windows positions (hardcoded from creation)
            const windows = [
                { x: 120, y: 100, width: 16, height: 10 },
                { x: 120, y: 120, width: 16, height: 10 },
                { x: 120, y: 140, width: 16, height: 10 },
                { x: 70, y: 140, width: 10, height: 10 },
                { x: 70, y: 160, width: 10, height: 10 },
                { x: 176, y: 140, width: 10, height: 10 },
                { x: 176, y: 160, width: 10, height: 10 }
            ];
            
            const window = windows[windowIndex];
            
            // Light up with red
            ctx.fillStyle = '#600';
            ctx.fillRect(window.x, window.y, window.width, window.height);
            
            // Return to normal after a delay
            setTimeout(() => {
                if (currentChannel === 7 && isTvOn) {
                    ctx.fillStyle = '#000';
                    ctx.fillRect(window.x, window.y, window.width, window.height);
                }
            }, 300);
            
            // Schedule next window lighting
            setTimeout(lightWindows, Math.random() * 2000 + 1000);
        };
        
        // Show skull jumpscare
        const showSkull = () => {
            if (currentChannel !== 7 || !isTvOn) return;
            
            if (Math.random() > 0.7) {
                // Animate skull
                skull.style.animation = 'skullAppear 1s forwards';
                
                // Show warning message
                warningMessage.style.animation = 'messageFlash 1s';
                
                // Random warning messages
                const warnings = [
                    'DIE MONSTER',
                    'YOU DON\'T BELONG',
                    'WHAT IS A MAN',
                    'MISERABLE PILE',
                    'JOIN US'
                ];
                
                warningMessage.textContent = warnings[Math.floor(Math.random() * warnings.length)];
                
                // Flash blood overlay
                bloodOverlay.style.backgroundColor = 'rgba(128, 0, 0, 0.3)';
                
                // Reset after animation
                setTimeout(() => {
                    if (currentChannel === 7 && isTvOn) {
                        skull.style.animation = 'none';
                        warningMessage.style.animation = 'none';
                        bloodOverlay.style.backgroundColor = 'rgba(128, 0, 0, 0)';
                    }
                }, 1000);
            }
            
            // Schedule next skull appearance
            setTimeout(showSkull, Math.random() * 10000 + 5000);
        };
        
        // Start all effects
        setTimeout(moveHunter, 500);
        setTimeout(moveBats, 1000);
        setTimeout(lightWindows, 2000);
        setTimeout(showSkull, 5000);
    }

    // Add D-pad event listeners
    document.querySelector('.dpad-up').addEventListener('click', pressDpadUp);
    document.querySelector('.dpad-right').addEventListener('click', pressDpadRight);
    document.querySelector('.dpad-down').addEventListener('click', pressDpadDown);
    document.querySelector('.dpad-left').addEventListener('click', pressDpadLeft);

    // Create game state variables
    let gameStates = {
        haunted_mario: {
            playerX: 50,
            playerY: 180,
            score: 0,
            lives: 3,
            gameOver: false
        },
        ghost_tetris: {
            score: 0,
            level: 1,
            gameOver: true
        },
        corrupted_rpg: {
            heroX: 120,
            heroY: 120,
            inBattle: false,
            hp: 20,
            maxHp: 20,
            gameOver: false
        },
        drowned_zelda: {
            linkX: 120,
            linkY: 140,
            drowned: false
        },
        pacman: {
            pacmanX: 120,
            pacmanY: 120,
            score: 0,
            lives: 2,
            gameOver: false
        },
        castlevania: {
            hunterX: 50,
            hunterY: 180,
            facingRight: true,
            jumpingOrFalling: false,
            lives: 3,
            gameOver: false
        }
    };

    // Controller button functions
    function pressDpadUp() {
        if (!isTvOn) return;
        console.log('D-pad Up pressed');
        
        switch(currentChannel) {
            case 0: // Haunted Mario
                // Move character up (if in a climbing state)
                const marioContainer = document.querySelector('.haunted-platformer');
                if (marioContainer) {
                    const character = marioContainer.querySelector('.platform-character');
                    if (character) {
                        gameStates.haunted_mario.playerY -= 5;
                        character.style.top = `${gameStates.haunted_mario.playerY}px`;
                        
                        // Check if on pipe, possibly enter it
                        if (gameStates.haunted_mario.playerY < 50) {
                            // Show creepy message
                            const messageContainer = marioContainer.querySelector('.message-container');
                            if (messageContainer) {
                                messageContainer.textContent = "WHERE ARE YOU GOING?";
                                messageContainer.style.opacity = '1';
                                
                                setTimeout(() => {
                                    messageContainer.style.opacity = '0';
                                }, 2000);
                            }
                        }
                    }
                }
                break;
                
            case 1: // Ghost Tetris
                // Rotate piece
                const tetrisContainer = document.querySelector('.ghost-tetris');
                if (tetrisContainer) {
                    tetrisContainer.style.animation = 'shake 0.1s';
                    setTimeout(() => {
                        tetrisContainer.style.animation = 'none';
                    }, 100);
                }
                break;
                
            case 2: // Corrupted RPG
                // Move hero up
                const rpgContainer = document.querySelector('.corrupted-rpg');
                if (rpgContainer && !gameStates.corrupted_rpg.inBattle) {
                    const hero = rpgContainer.querySelector('.rpg-hero');
                    if (hero) {
                        gameStates.corrupted_rpg.heroY -= 10;
                        if (gameStates.corrupted_rpg.heroY < 60) gameStates.corrupted_rpg.heroY = 60;
                        hero.style.top = `${gameStates.corrupted_rpg.heroY}px`;
                        
                        // Check if near door
                        if (gameStates.corrupted_rpg.heroY < 80 && 
                            gameStates.corrupted_rpg.heroX > 110 && 
                            gameStates.corrupted_rpg.heroX < 140) {
                            // Show message
                            const dialogBox = rpgContainer.querySelector('.dialog-box');
                            if (dialogBox) {
                                dialogBox.textContent = "* The door is locked.\n* You hear something behind it.";
                                dialogBox.style.display = 'block';
                                
                                setTimeout(() => {
                                    dialogBox.style.display = 'none';
                                }, 3000);
                            }
                        }
                    }
                }
                break;
                
            case 5: // Pacman
                // Move pacman up
                const pacmanContainer = document.querySelector('.haunted-pacman');
                if (pacmanContainer) {
                    const pacman = pacmanContainer.querySelector('.pacman');
                    if (pacman) {
                        gameStates.pacman.pacmanY -= 10;
                        if (gameStates.pacman.pacmanY < 20) gameStates.pacman.pacmanY = 20;
                        pacman.style.top = `${gameStates.pacman.pacmanY}px`;
                    }
                }
                break;
                
            case 7: // Castlevania
                crouchHunter();
                break;
        }
    }

    function pressDpadDown() {
        if (!isTvOn) return;
        console.log('D-pad Down pressed');
        
        switch(currentChannel) {
            case 0: // Haunted Mario
                crouchCharacter();
                break;
                
            case 1: // Ghost Tetris
                // Move piece down
                const tetrisContainer = document.querySelector('.ghost-tetris');
                if (tetrisContainer) {
                    tetrisContainer.style.animation = 'shake 0.1s';
                    setTimeout(() => {
                        tetrisContainer.style.animation = 'none';
                    }, 100);
                }
                break;
                
            case 2: // Corrupted RPG
                // Move hero down
                const rpgContainer = document.querySelector('.corrupted-rpg');
                if (rpgContainer && !gameStates.corrupted_rpg.inBattle) {
                    const hero = rpgContainer.querySelector('.rpg-hero');
                    if (hero) {
                        gameStates.corrupted_rpg.heroY += 10;
                        if (gameStates.corrupted_rpg.heroY > 180) gameStates.corrupted_rpg.heroY = 180;
                        hero.style.top = `${gameStates.corrupted_rpg.heroY}px`;
                        
                        // Random chance to trigger battle
                        if (Math.random() < 0.1) {
                            const battleContainer = rpgContainer.querySelector('.battle-container');
                            if (battleContainer) {
                                battleContainer.style.display = 'block';
                                gameStates.corrupted_rpg.inBattle = true;
                                
                                // Start battle
                                try {
                                    startBattle();
                                } catch (e) {
                                    console.log('Battle error:', e);
                                }
                            }
                        }
                    }
                }
                break;
                
            case 5: // Pacman
                // Move pacman down
                const pacmanContainer = document.querySelector('.haunted-pacman');
                if (pacmanContainer) {
                    const pacman = pacmanContainer.querySelector('.pacman');
                    if (pacman) {
                        gameStates.pacman.pacmanY += 10;
                        if (gameStates.pacman.pacmanY > 200) gameStates.pacman.pacmanY = 200;
                        pacman.style.top = `${gameStates.pacman.pacmanY}px`;
                    }
                }
                break;
                
            case 7: // Castlevania
                crouchHunter();
                break;
        }
    }

    function pressDpadLeft() {
        if (!isTvOn) return;
        console.log('D-pad Left pressed');
        
        switch(currentChannel) {
            case 0: // Haunted Mario
                // Move character left
                const marioContainer = document.querySelector('.haunted-platformer');
                if (marioContainer) {
                    const character = marioContainer.querySelector('.platform-character');
                    if (character) {
                        gameStates.haunted_mario.playerX -= 10;
                        if (gameStates.haunted_mario.playerX < 10) gameStates.haunted_mario.playerX = 10;
                        character.style.left = `${gameStates.haunted_mario.playerX}px`;
                        character.style.transform = 'scaleX(-1)';
                        
                        // Check if over the hole
                        if (gameStates.haunted_mario.playerX > 150 && 
                            gameStates.haunted_mario.playerX < 200 && 
                            gameStates.haunted_mario.playerY > 170) {
                            // Fall into the hole
                            let fallY = gameStates.haunted_mario.playerY;
                            const fallAnimation = setInterval(() => {
                                fallY += 5;
                                character.style.top = `${fallY}px`;
                                
                                if (fallY > 250) {
                                    clearInterval(fallAnimation);
                                    character.style.display = 'none';
                                    
                                    // Show message
                                    const messageContainer = marioContainer.querySelector('.message-container');
                                    if (messageContainer) {
                                        messageContainer.textContent = "YOU FELL INTO THE ABYSS";
                                        messageContainer.style.opacity = '1';
                                        messageContainer.classList.add('glitch-text');
                                    }
                                }
                            }, 50);
                        }
                    }
                }
                break;
                
            case 1: // Ghost Tetris
                movePieceLeft();
                break;
                
            case 2: // Corrupted RPG
                // Move hero left
                const rpgContainer = document.querySelector('.corrupted-rpg');
                if (rpgContainer && !gameStates.corrupted_rpg.inBattle) {
                    const hero = rpgContainer.querySelector('.rpg-hero');
                    if (hero) {
                        gameStates.corrupted_rpg.heroX -= 10;
                        if (gameStates.corrupted_rpg.heroX < 40) gameStates.corrupted_rpg.heroX = 40;
                        hero.style.left = `${gameStates.corrupted_rpg.heroX}px`;
                    }
                } else if (rpgContainer && gameStates.corrupted_rpg.inBattle) {
                    // Navigate battle menu
                    const battleMenu = rpgContainer.querySelector('.battle-menu');
                    if (battleMenu) {
                        battleMenu.style.animation = 'shake 0.2s';
                        setTimeout(() => {
                            battleMenu.style.animation = 'none';
                        }, 200);
                    }
                }
                break;
                
            case 5: // Pacman
                // Move pacman left
                const pacmanContainer = document.querySelector('.haunted-pacman');
                if (pacmanContainer) {
                    const pacman = pacmanContainer.querySelector('.pacman');
                    if (pacman) {
                        gameStates.pacman.pacmanX -= 10;
                        if (gameStates.pacman.pacmanX < 20) gameStates.pacman.pacmanX = 20;
                        pacman.style.left = `${gameStates.pacman.pacmanX}px`;
                        
                        // Face left
                        pacman.style.transform = 'rotate(180deg)';
                    }
                }
                break;
                
            case 7: // Castlevania
                // Move hunter left
                const castlevaniaContainer = document.querySelector('.cursed-castlevania');
                if (castlevaniaContainer) {
                    const hunter = castlevaniaContainer.querySelector('.castlevania-hunter');
                    if (hunter) {
                        gameStates.castlevania.hunterX -= 10;
                        if (gameStates.castlevania.hunterX < 10) gameStates.castlevania.hunterX = 10;
                        hunter.style.left = `${gameStates.castlevania.hunterX}px`;
                        hunter.style.transform = 'scaleX(-1)';
                        gameStates.castlevania.facingRight = false;
                    }
                }
                break;
        }
    }

    function pressDpadRight() {
        if (!isTvOn) return;
        console.log('D-pad Right pressed');
        
        switch(currentChannel) {
            case 0: // Haunted Mario
                // Move character right
                const marioContainer = document.querySelector('.haunted-platformer');
                if (marioContainer) {
                    const character = marioContainer.querySelector('.platform-character');
                    if (character) {
                        gameStates.haunted_mario.playerX += 10;
                        if (gameStates.haunted_mario.playerX > 240) gameStates.haunted_mario.playerX = 240;
                        character.style.left = `${gameStates.haunted_mario.playerX}px`;
                        character.style.transform = 'scaleX(1)';
                        
                        // Check if over the hole
                        if (gameStates.haunted_mario.playerX > 150 && 
                            gameStates.haunted_mario.playerX < 200 && 
                            gameStates.haunted_mario.playerY > 170) {
                            // Fall into the hole
                            let fallY = gameStates.haunted_mario.playerY;
                            const fallAnimation = setInterval(() => {
                                fallY += 5;
                                character.style.top = `${fallY}px`;
                                
                                if (fallY > 250) {
                                    clearInterval(fallAnimation);
                                    character.style.display = 'none';
                                    
                                    // Show message
                                    const messageContainer = marioContainer.querySelector('.message-container');
                                    if (messageContainer) {
                                        messageContainer.textContent = "YOU FELL INTO THE ABYSS";
                                        messageContainer.style.opacity = '1';
                                        messageContainer.classList.add('glitch-text');
                                    }
                                }
                            }, 50);
                        }
                    }
                }
                break;
                
            case 1: // Ghost Tetris
                movePieceRight();
                break;
                
            case 2: // Corrupted RPG
                // Move hero right
                const rpgContainer = document.querySelector('.corrupted-rpg');
                if (rpgContainer && !gameStates.corrupted_rpg.inBattle) {
                    const hero = rpgContainer.querySelector('.rpg-hero');
                    if (hero) {
                        gameStates.corrupted_rpg.heroX += 10;
                        if (gameStates.corrupted_rpg.heroX > 210) gameStates.corrupted_rpg.heroX = 210;
                        hero.style.left = `${gameStates.corrupted_rpg.heroX}px`;
                    }
                } else if (rpgContainer && gameStates.corrupted_rpg.inBattle) {
                    // Navigate battle menu
                    const battleMenu = rpgContainer.querySelector('.battle-menu');
                    if (battleMenu) {
                        battleMenu.style.animation = 'shake 0.2s';
                        setTimeout(() => {
                            battleMenu.style.animation = 'none';
                        }, 200);
                    }
                }
                break;
                
            case 5: // Pacman
                // Move pacman right
                const pacmanContainer = document.querySelector('.haunted-pacman');
                if (pacmanContainer) {
                    const pacman = pacmanContainer.querySelector('.pacman');
                    if (pacman) {
                        gameStates.pacman.pacmanX += 10;
                        if (gameStates.pacman.pacmanX > 220) gameStates.pacman.pacmanX = 220;
                        pacman.style.left = `${gameStates.pacman.pacmanX}px`;
                        
                        // Face right
                        pacman.style.transform = 'rotate(0deg)';
                    }
                }
                break;
                
            case 7: // Castlevania
                // Move hunter right
                const castlevaniaContainer = document.querySelector('.cursed-castlevania');
                if (castlevaniaContainer) {
                    const hunter = castlevaniaContainer.querySelector('.castlevania-hunter');
                    if (hunter) {
                        gameStates.castlevania.hunterX += 10;
                        if (gameStates.castlevania.hunterX > 230) gameStates.castlevania.hunterX = 230;
                        hunter.style.left = `${gameStates.castlevania.hunterX}px`;
                        hunter.style.transform = 'scaleX(1)';
                        gameStates.castlevania.facingRight = true;
                    }
                }
                break;
        }
    }

    // Add event listeners for D-pad buttons
    document.querySelector('.dpad-up').addEventListener('click', pressDpadUp);
    document.querySelector('.dpad-right').addEventListener('click', pressDpadRight);
    document.querySelector('.dpad-down').addEventListener('click', pressDpadDown);
    document.querySelector('.dpad-left').addEventListener('click', pressDpadLeft);

    // Game-specific functions

    // Haunted Mario functions
    function moveCharacter(deltaX) {
        if (currentChannel !== 0 || !isTvOn) return;
        
        const container = document.querySelector('.haunted-platformer');
        if (!container) return;
        
        const character = container.querySelector('.platform-character');
        if (!character) return;
        
        gameStates.haunted_mario.playerX += deltaX;
        
        // Keep within bounds
        gameStates.haunted_mario.playerX = Math.max(0, Math.min(256 - 16, gameStates.haunted_mario.playerX));
        
        // Update position
        character.style.left = `${gameStates.haunted_mario.playerX}px`;
        
        // Update character direction
        if (deltaX < 0) {
            character.style.transform = 'scaleX(-1)';
        } else if (deltaX > 0) {
            character.style.transform = 'scaleX(1)';
        }
        
        // Chance of glitch when moving
        if (Math.random() < 0.05) {
            glitchCharacter();
        }
    }

    function jumpCharacter() {
        if (currentChannel !== 0 || !isTvOn) return;
        
        const container = document.querySelector('.haunted-platformer');
        if (!container) return;
        
        const character = container.querySelector('.platform-character');
        if (!character) return;
        
        // Simple jump animation
        const jumpHeight = 60;
        const jumpDuration = 600; // ms
        const startY = gameStates.haunted_mario.playerY;
        const startTime = Date.now();
        
        function jumpAnimation() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / jumpDuration, 1);
            
            // Parabolic jump
            const jumpProgress = 1 - Math.pow(2 * progress - 1, 2);
            const newY = startY - jumpHeight * jumpProgress;
            
            gameStates.haunted_mario.playerY = newY;
            character.style.top = `${newY}px`;
            
            if (progress < 1) {
                requestAnimationFrame(jumpAnimation);
            } else {
                character.style.top = `${startY}px`;
                gameStates.haunted_mario.playerY = startY;
                
                // Check if over the hole
                if (gameStates.haunted_mario.playerX > 150 && 
                    gameStates.haunted_mario.playerX < 200 && 
                    gameStates.haunted_mario.playerY > 170) {
                    // Fall into the hole
                    let fallY = gameStates.haunted_mario.playerY;
                    const fallAnimation = setInterval(() => {
                        fallY += 5;
                        character.style.top = `${fallY}px`;
                        
                        if (fallY > 250) {
                            clearInterval(fallAnimation);
                            character.style.display = 'none';
                            
                            // Show message
                            const messageContainer = container.querySelector('.message-container');
                            if (messageContainer) {
                                messageContainer.textContent = "YOU FELL INTO THE ABYSS";
                                messageContainer.style.opacity = '1';
                                messageContainer.classList.add('glitch-text');
                            }
                        }
                    }, 50);
                }
            }
        }
        
        requestAnimationFrame(jumpAnimation);
    }

    // Ghost Tetris functions
    function rotatePiece() {
        if (currentChannel !== 1 || !isTvOn) return;
        console.log('Rotating tetris piece');
        // Visual feedback only - no actual gameplay
        const gameOverDiv = document.querySelector('.ghost-tetris .game-over');
        if (gameOverDiv) {
            gameOverDiv.style.animation = 'flicker 0.5s';
            setTimeout(() => {
                gameOverDiv.style.animation = 'none';
            }, 500);
        }
    }

    function dropPiece() {
        if (currentChannel !== 1 || !isTvOn) return;
        console.log('Dropping tetris piece');
        
        // Visual feedback - create falling skull
        const container = document.querySelector('.ghost-tetris');
        if (!container) return;
        
        const fallingSkulls = container.querySelector('div:nth-child(3)');
        if (!fallingSkulls) return;
        
        const skull = document.createElement('div');
        skull.classList.add('falling-skull');
        skull.style.left = `${Math.random() * 200 + 30}px`;
        
        const duration = Math.random() * 3 + 2;
        skull.style.animationDuration = `${duration}s`;
        
        // Create skull using canvas
        const skullCanvas = document.createElement('canvas');
        skullCanvas.width = 40;
        skullCanvas.height = 40;
        const skullCtx = skullCanvas.getContext('2d');
        
        // Draw skull
        skullCtx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        skullCtx.beginPath();
        skullCtx.arc(20, 20, 15, 0, Math.PI * 2);
        skullCtx.fill();
        
        // Eyes
        skullCtx.fillStyle = '#000';
        skullCtx.fillRect(12, 15, 5, 5);
        skullCtx.fillRect(23, 15, 5, 5);
        
        // Mouth
        skullCtx.beginPath();
        skullCtx.arc(20, 25, 8, 0, Math.PI);
        skullCtx.stroke();
        
        skull.style.backgroundImage = `url(${skullCanvas.toDataURL('image/png', 0.8)})`;
        skull.style.backgroundSize = 'contain';
        
        fallingSkulls.appendChild(skull);
        
        // Remove after animation completes
        setTimeout(() => {
            if (fallingSkulls.contains(skull)) {
                fallingSkulls.removeChild(skull);
            }
        }, duration * 1000);
    }

    // Corrupted RPG functions
    function moveRPGCharacter(deltaX, deltaY) {
        if (currentChannel !== 2 || !isTvOn) return;
        
        const container = document.querySelector('.corrupted-rpg');
        if (!container) return;
        
        const hero = container.querySelector('.rpg-hero');
        if (!hero || gameStates.corrupted_rpg.inBattle) return;
        
        let top = parseInt(hero.style.top || '120');
        let left = parseInt(hero.style.left || '120');
        
        // Update position
        top = Math.max(0, Math.min(230, top + deltaY));
        left = Math.max(0, Math.min(240, left + deltaX));
        
        hero.style.top = `${top}px`;
        hero.style.left = `${left}px`;
        
        // Check for collision with monster
        const monster = container.querySelector('.rpg-monster');
        if (monster) {
            const heroRect = hero.getBoundingClientRect();
            const monsterRect = monster.getBoundingClientRect();
            
            if (
                heroRect.right > monsterRect.left &&
                heroRect.left < monsterRect.right &&
                heroRect.bottom > monsterRect.top &&
                heroRect.top < monsterRect.bottom
            ) {
                startRPGBattle();
            }
        }
        
        // Random chance to show dialog
        if (Math.random() < 0.1) {
            const dialogBox = container.querySelector('.dialog-box');
            if (dialogBox) {
                const dialogMessages = [
                    "* The game is glitching\nfatal error at memory\naddress 0xF0A2...",
                    "* You shouldn't\nbe here. This game\nis CORRUPTED.",
                    "* Why do you continue\nto play? Don't you know\nwhat happens?",
                    "* Your save data has been\nDELETED. Your progress\nis GONE.",
                    "ERROR: C̵̡̠̩̹͗̅̂̚h̵̗͍̍͋̀̄ả̸̤̣͎̆̈́r̵͙̥̦̪͑̌̿̑à̶̠̮͗̆̃ċ̶̛̯̟t̵̛̙̭̳̟͒̐e̶̖͉̙̿̓r̴̩̻̈́͋̈́ ̵̡͚͌̔f̶̡͓͇͖͋̽̊î̶̧̿̆̎l̶̪̟̥̆ͅḗ̶̙͈̀̒",
                    "* THE HEROES ARE DEAD.\nTHE PRINCESS IS DEAD.\nEVERYONE IS DEAD."
                ];
                
                dialogBox.textContent = dialogMessages[Math.floor(Math.random() * dialogMessages.length)];
                dialogBox.style.display = 'block';
                
                // Add glitch effect randomly
                if (Math.random() > 0.5) {
                    dialogBox.classList.add('glitch-text');
                }
                
                // Hide after delay
                setTimeout(() => {
                    dialogBox.style.display = 'none';
                    dialogBox.classList.remove('glitch-text');
                }, 3000);
            }
        }
    }

    function startRPGBattle() {
        if (currentChannel !== 2 || !isTvOn) return;
        
        const container = document.querySelector('.corrupted-rpg');
        if (!container) return;
        
        const battleContainer = container.querySelector('.battle-container');
        if (!battleContainer) return;
        
        gameStates.corrupted_rpg.inBattle = true;
        
        // Show battle screen
        battleContainer.style.display = 'block';
        
        // Animate entrance
        battleContainer.classList.add('active');
        battleContainer.style.animation = 'shake 0.5s';
        
        // Update battle dialog
        const dialogBox = container.querySelector('.dialog-box');
        const battleMessages = [
            "* The corrupted monster\n attacks!",
            "* You feel your sins\n crawling on your back.",
            "* You can't escape.",
            "* It knows your name.",
            "* The game is breaking\n apart.",
            "FATAL ERROR 0xDEAD"
        ];
        
        const battleMessage = battleMessages[Math.floor(Math.random() * battleMessages.length)];
        
        if (dialogBox) {
            dialogBox.textContent = battleMessage;
            dialogBox.style.display = 'block';
        }
    }

    // Pacman functions
    function movePacmanManually(deltaX, deltaY) {
        if (currentChannel !== 5 || !isTvOn) return;
        
        const container = document.querySelector('.haunted-pacman');
        if (!container) return;
        
        const pacman = container.querySelector('.pacman');
        if (!pacman) return;
        
        // Update direction
        gameStates.pacman.direction.x = deltaX;
        gameStates.pacman.direction.y = deltaY;
        
        // Update position
        gameStates.pacman.x += deltaX * 5;
        gameStates.pacman.y += deltaY * 5;
        
        // Boundary check
        gameStates.pacman.x = Math.max(24, Math.min(216, gameStates.pacman.x));
        gameStates.pacman.y = Math.max(40, Math.min(216, gameStates.pacman.y));
        
        // Update element position
        pacman.style.left = `${gameStates.pacman.x}px`;
        pacman.style.top = `${gameStates.pacman.y}px`;
        
        // Update rotation based on direction
        if (deltaX === 1) {
            pacman.style.transform = 'rotate(0deg)';
        } else if (deltaX === -1) {
            pacman.style.transform = 'rotate(180deg)';
        } else if (deltaY === -1) {
            pacman.style.transform = 'rotate(270deg)';
        } else if (deltaY === 1) {
            pacman.style.transform = 'rotate(90deg)';
        }
        
        // Check ghost collisions
        const ghosts = container.querySelectorAll('.ghost');
        ghosts.forEach(ghost => {
            const ghostRect = ghost.getBoundingClientRect();
            const pacmanRect = pacman.getBoundingClientRect();
            
            if (
                ghostRect.right > pacmanRect.left &&
                ghostRect.left < pacmanRect.right &&
                ghostRect.bottom > pacmanRect.top &&
                ghostRect.top < pacmanRect.bottom
            ) {
                // Random chance for ghost to transform
                if (Math.random() > 0.5 && !ghost.dataset.transformed) {
                    if (!ghost.dataset.normalImage) {
                        ghost.dataset.normalImage = ghost.style.backgroundImage;
                        
                        // Create demonic version on first transformation
                        const demonicGhostCanvas = document.createElement('canvas');
                        demonicGhostCanvas.width = 16;
                        demonicGhostCanvas.height = 16;
                        const demonicGhostCtx = demonicGhostCanvas.getContext('2d');
                        
                        // Draw ghost body (dark red)
                        demonicGhostCtx.fillStyle = '#880000';
                        demonicGhostCtx.beginPath();
                        demonicGhostCtx.arc(8, 8, 7, Math.PI, 0, false);
                        demonicGhostCtx.fillRect(1, 8, 14, 7);
                        
                        // Draw pointy bottom
                        demonicGhostCtx.beginPath();
                        demonicGhostCtx.moveTo(1, 15);
                        demonicGhostCtx.lineTo(1, 13);
                        demonicGhostCtx.lineTo(4, 16);
                        demonicGhostCtx.lineTo(8, 13);
                        demonicGhostCtx.lineTo(12, 16);
                        demonicGhostCtx.lineTo(15, 13);
                        demonicGhostCtx.lineTo(15, 15);
                        demonicGhostCtx.fill();
                        
                        // Draw demonic eyes
                        demonicGhostCtx.fillStyle = '#ff0000';
                        demonicGhostCtx.beginPath();
                        demonicGhostCtx.arc(5, 7, 2, 0, Math.PI * 2);
                        demonicGhostCtx.arc(11, 7, 2, 0, Math.PI * 2);
                        demonicGhostCtx.fill();
                        
                        ghost.dataset.demonicImage = demonicGhostCanvas.toDataURL('image/png', 0.8);
                    }
                    
                    // Transform to demonic
                    ghost.style.backgroundImage = `url(${ghost.dataset.demonicImage})`;
                    ghost.dataset.transformed = 'true';
                    
                    // Show game over
                    const gameOver = container.querySelector('.game-over');
                    if (gameOver) {
                        gameOver.style.opacity = '1';
                        
                        setTimeout(() => {
                            gameOver.style.opacity = '0';
                        }, 3000);
                    }
                }
            }
        });
    }

    // Castlevania functions
    function moveHunterManually(deltaX) {
        if (currentChannel !== 7 || !isTvOn) return;
        
        const container = document.querySelector('.cursed-castlevania');
        if (!container) return;
        
        const hunter = container.querySelector('.castlevania-hunter');
        if (!hunter) return;
        
        // Update position
        gameStates.castlevania.hunterX += deltaX;
        
        // Boundary check
        gameStates.castlevania.hunterX = Math.max(20, Math.min(220, gameStates.castlevania.hunterX));
        
        // Update element position
        hunter.style.left = `${gameStates.castlevania.hunterX}px`;
        
        // Update direction
        if (deltaX > 0) {
            gameStates.castlevania.facingRight = true;
            hunter.style.transform = 'scaleX(1)';
        } else if (deltaX < 0) {
            gameStates.castlevania.facingRight = false;
            hunter.style.transform = 'scaleX(-1)';
        }
    }

    function attackWithHunter() {
        if (currentChannel !== 7 || !isTvOn) return;
        
        const container = document.querySelector('.cursed-castlevania');
        if (!container) return;
        
        const hunter = container.querySelector('.castlevania-hunter');
        if (!hunter || gameStates.castlevania.attacking) return;
        
        gameStates.castlevania.attacking = true;
        
        // Create whip effect
        const whip = document.createElement('div');
        whip.style.position = 'absolute';
        whip.style.height = '5px';
        whip.style.backgroundColor = '#8B4513';
        whip.style.top = `${gameStates.castlevania.hunterY + 10}px`;
        
        if (gameStates.castlevania.facingRight) {
            whip.style.left = `${gameStates.castlevania.hunterX + 20}px`;
            whip.style.width = '30px';
        } else {
            whip.style.left = `${gameStates.castlevania.hunterX - 30}px`;
            whip.style.width = '30px';
        }
        
        container.appendChild(whip);
        
        // Animate attack
        setTimeout(() => {
            if (container.contains(whip)) {
                container.removeChild(whip);
            }
            gameStates.castlevania.attacking = false;
        }, 200);
        
        // Random chance to show skull
        if (Math.random() < 0.2) {
            const skull = container.querySelector('.skull-jump-scare');
            if (skull) {
                skull.style.display = 'block';
                skull.style.animation = 'shake 0.5s';
                
                setTimeout(() => {
                    skull.style.display = 'none';
                }, 1000);
            }
        }
    }

    // Add missing utility functions for interactivity
    function pauseOrResumeGame() {
        if (!isTvOn) return;
        console.log('Pause/Resume game');
        
        // Add visual feedback depending on the current game
        switch(currentChannel) {
            case 0: // Haunted Mario
                const platformerContainer = document.querySelector('.haunted-platformer');
                if (platformerContainer) {
                    // Create pause message
                    const pauseMsg = document.createElement('div');
                    pauseMsg.textContent = "PAUSED";
                    pauseMsg.style.position = 'absolute';
                    pauseMsg.style.top = '50%';
                    pauseMsg.style.left = '50%';
                    pauseMsg.style.transform = 'translate(-50%, -50%)';
                    pauseMsg.style.color = '#fff';
                    pauseMsg.style.fontFamily = 'monospace';
                    pauseMsg.style.fontSize = '24px';
                    pauseMsg.style.zIndex = '10';
                    
                    // Check if pause message already exists
                    const existingPause = platformerContainer.querySelector('div[data-pause="true"]');
                    if (existingPause) {
                        platformerContainer.removeChild(existingPause);
                    } else {
                        pauseMsg.dataset.pause = "true";
                        platformerContainer.appendChild(pauseMsg);
                    }
                }
                break;
                
            case 1: // Ghost Tetris
            case 5: // Pacman
            case 7: // Castlevania
                // Similar pause logic for other games
                break;
        }
    }

    function toggleGameOptions() {
        if (!isTvOn) return;
        console.log('Toggle game options');
        
        // Create a simple options overlay based on the current game
        const channelContainer = channelContent.firstChild;
        if (!channelContainer) return;
        
        // Check if options already exist
        const existingOptions = channelContainer.querySelector('.game-options');
        if (existingOptions) {
            channelContainer.removeChild(existingOptions);
            return;
        }
        
        // Create options overlay
        const options = document.createElement('div');
        options.classList.add('game-options');
        options.style.position = 'absolute';
        options.style.top = '50%';
        options.style.left = '50%';
        options.style.transform = 'translate(-50%, -50%)';
        options.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        options.style.border = '2px solid #fff';
        options.style.padding = '20px';
        options.style.color = '#fff';
        options.style.fontFamily = 'monospace';
        options.style.fontSize = '12px';
        options.style.zIndex = '100';
        options.style.width = '70%';
        
        // Add some creepy options
        options.innerHTML = `
            OPTIONS<br><br>
            > RESTART GAME<br>
            > LOAD SAVE (?)<br>
            > SOUND: ON<br>
            > DELETE SAVE DATA<br>
            > I KNOW WHERE YOU LIVE
        `;
        
        channelContainer.appendChild(options);
        
        // Randomly glitch one of the options for creepy effect
        setTimeout(() => {
            if (options.parentNode) {
                const lines = options.innerHTML.split('<br>');
                const randomIndex = Math.floor(Math.random() * lines.length);
                if (lines[randomIndex].includes('>')) {
                    lines[randomIndex] = lines[randomIndex].replace('>', '> E̷̟͌R̶̨̓R̵̥̎');
                    options.innerHTML = lines.join('<br>');
                }
            }
        }, 1000);
    }

    function crouchCharacter() {
        if (currentChannel !== 0 || !isTvOn) return;
        
        const container = document.querySelector('.haunted-platformer');
        if (!container) return;
        
        const character = container.querySelector('.platform-character');
        if (!character) return;
        
        // Simple crouch animation
        character.style.height = '24px'; // Make shorter
        character.style.transform += ' scaleY(0.75)'; // Squish vertically
        
        // Return to normal after a delay
        setTimeout(() => {
            character.style.height = '32px';
            character.style.transform = character.style.transform.replace(' scaleY(0.75)', '');
        }, 500);
    }

    function runOrFireball() {
        if (currentChannel !== 0 || !isTvOn) return;
        
        // Throw a fireball with creepy effect
        const container = document.querySelector('.haunted-platformer');
        if (!container) return;
        
        const character = container.querySelector('.platform-character');
        if (!character) return;
        
        // Create fireball
        const fireball = document.createElement('div');
        fireball.style.position = 'absolute';
        fireball.style.width = '12px';
        fireball.style.height = '12px';
        fireball.style.borderRadius = '50%';
        fireball.style.backgroundColor = '#ff3300';
        fireball.style.boxShadow = '0 0 5px #ff3300';
        
        // Position at character's position
        const characterRect = character.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        const isFlipped = character.style.transform.includes('scaleX(-1)');
        const startX = gameStates.haunted_mario.playerX + (isFlipped ? 0 : 16);
        fireball.style.top = `${gameStates.haunted_mario.playerY + 10}px`;
        fireball.style.left = `${startX}px`;
        fireball.style.zIndex = '1';
        
        container.appendChild(fireball);
        
        // Animate fireball
        const direction = isFlipped ? -1 : 1;
        let posX = startX;
        
        const animateFireball = () => {
            posX += 5 * direction;
            fireball.style.left = `${posX}px`;
            
            // Check boundaries
            if (posX < 0 || posX > container.offsetWidth) {
                if (container.contains(fireball)) {
                    container.removeChild(fireball);
                }
                return;
            }
            
            // Random chance of fireball turning into a skull
            if (Math.random() < 0.05) {
                fireball.style.backgroundColor = '#fff';
                fireball.style.boxShadow = 'none';
                fireball.style.borderRadius = '0';
                
                // Create skull
                const skullCanvas = document.createElement('canvas');
                skullCanvas.width = 12;
                skullCanvas.height = 12;
                const skullCtx = skullCanvas.getContext('2d');
                
                // Draw simple skull
                skullCtx.fillStyle = '#fff';
                skullCtx.fillRect(0, 0, 12, 12);
                skullCtx.fillStyle = '#000';
                skullCtx.fillRect(2, 3, 2, 2); // Left eye
                skullCtx.fillRect(8, 3, 2, 2); // Right eye
                skullCtx.fillRect(4, 7, 4, 2); // Mouth
                
                fireball.style.backgroundImage = `url(${skullCanvas.toDataURL('image/png', 0.8)})`;
            }
            
            requestAnimationFrame(animateFireball);
        };
        
        requestAnimationFrame(animateFireball);
    }

    function movePieceLeft() {
        if (currentChannel !== 1 || !isTvOn) return;
        
        // Visual feedback for Tetris movement
        const container = document.querySelector('.ghost-tetris');
        if (!container) return;
        
        // Make screen glitch briefly
        container.style.animation = 'shake 0.1s';
        setTimeout(() => {
            container.style.animation = 'none';
        }, 100);
    }

    function movePieceRight() {
        if (currentChannel !== 1 || !isTvOn) return;
        
        // Visual feedback for Tetris movement
        const container = document.querySelector('.ghost-tetris');
        if (!container) return;
        
        // Make screen glitch briefly
        container.style.animation = 'shake 0.1s';
        setTimeout(() => {
            container.style.animation = 'none';
        }, 100);
    }

    function holdPiece() {
        if (currentChannel !== 1 || !isTvOn) return;
        
        // Show message when attempting to hold piece
        const container = document.querySelector('.ghost-tetris');
        if (!container) return;
        
        const messageDiv = container.querySelectorAll('div')[1];
        if (messageDiv) {
            messageDiv.style.opacity = '1';
            messageDiv.textContent = "YOU CAN'T HOLD THE PIECES\nTHEY HOLD YOU";
            
            setTimeout(() => {
                messageDiv.style.opacity = '0';
            }, 3000);
        }
    }

    function confirmRPGAction() {
        if (currentChannel !== 2 || !isTvOn) return;
        
        const container = document.querySelector('.corrupted-rpg');
        if (!container) return;
        
        const battleContainer = container.querySelector('.battle-container');
        if (!battleContainer || !gameStates.corrupted_rpg.inBattle) return;
        
        // Progress through RPG battle menu
        const battleMenu = battleContainer.querySelector('.battle-menu');
        if (!battleMenu) return;
        
        // Show attack effect
        const battleHero = battleContainer.querySelector('.battle-hero');
        if (battleHero) {
            battleHero.style.animation = 'shake 0.3s';
            setTimeout(() => {
                battleHero.style.animation = 'none';
            }, 300);
        }
        
        // Show monster taking damage
        const battleMonster = battleContainer.querySelector('.battle-monster');
        if (battleMonster) {
            setTimeout(() => {
                battleMonster.style.animation = 'shake 0.3s';
                
                // Add glitch effect
                battleContainer.style.animation = 'shake 0.5s';
                
                // Show error message
                const dialogBox = container.querySelector('.dialog-box');
                if (dialogBox) {
                    dialogBox.textContent = "* FATAL ERROR\nGAME DATA CORRUPTED\nSAVE FILE DELETED";
                    dialogBox.classList.add('glitch-text');
                    dialogBox.style.display = 'block';
                    
                    // End battle with glitch after a delay
                    setTimeout(() => {
                        battleContainer.style.display = 'none';
                        dialogBox.style.display = 'none';
                        dialogBox.classList.remove('glitch-text');
                        gameStates.corrupted_rpg.inBattle = false;
                    }, 3000);
                }
            }, 500);
        }
    }

    function cancelRPGAction() {
        if (currentChannel !== 2 || !isTvOn) return;
        
        const container = document.querySelector('.corrupted-rpg');
        if (!container) return;
        
        // Show message when trying to cancel in RPG
        const dialogBox = container.querySelector('.dialog-box');
        if (dialogBox) {
            dialogBox.textContent = "* You can't escape.";
            dialogBox.style.display = 'block';
            
            setTimeout(() => {
                dialogBox.style.display = 'none';
            }, 2000);
        }
    }

    function activatePacmanPower() {
        if (currentChannel !== 5 || !isTvOn) return;
        
        const container = document.querySelector('.haunted-pacman');
        if (!container) return;
        
        const pacman = container.querySelector('.pacman');
        if (!pacman) return;
        
        // Transform Pacman into skull
        if (!pacman.dataset.skullImage) {
            const skullCanvas = document.createElement('canvas');
            skullCanvas.width = 16;
            skullCanvas.height = 16;
            const skullCtx = skullCanvas.getContext('2d');
            
            // Skull shape
            skullCtx.fillStyle = '#ffffff';
            skullCtx.beginPath();
            skullCtx.arc(8, 8, 7, 0, Math.PI * 2);
            skullCtx.fill();
            
            // Skull details
            skullCtx.fillStyle = '#000';
            skullCtx.fillRect(4, 5, 3, 3); // Eyes
            skullCtx.fillRect(9, 5, 3, 3);
            skullCtx.fillRect(7, 9, 2, 2); // Nose
            skullCtx.fillRect(5, 11, 6, 2); // Teeth
            
            pacman.dataset.skullImage = skullCanvas.toDataURL('image/png', 0.8);
            pacman.dataset.originalImage = pacman.style.backgroundImage;
        }
        
        // Transform to skull
        pacman.style.backgroundImage = `url(${pacman.dataset.skullImage})`;
        pacman.style.animation = 'none';
        
        // Show hidden message
        const hiddenMessage = container.querySelector('.hidden-message');
        if (hiddenMessage) {
            hiddenMessage.textContent = "YOU ARE BECOMING ONE OF THEM";
            hiddenMessage.style.opacity = '1';
        }
        
        // Transform back after a delay
        setTimeout(() => {
            if (pacman.dataset.originalImage) {
                pacman.style.backgroundImage = pacman.dataset.originalImage;
                pacman.style.animation = 'pacmanMouth 0.3s infinite linear';
            }
            
            if (hiddenMessage) {
                hiddenMessage.style.opacity = '0';
            }
        }, 3000);
    }

    function boostPacmanSpeed() {
        if (currentChannel !== 5 || !isTvOn) return;
        
        // Just add some blood drips for visual effect
        const container = document.querySelector('.haunted-pacman');
        if (!container) return;
        
        const bloodCanvas = container.querySelector('canvas:nth-child(2)');
        if (!bloodCanvas) return;
        
        const bloodCtx = bloodCanvas.getContext('2d');
        if (!bloodCtx) return;
        
        // Create several blood drips
        for (let i = 0; i < 5; i++) {
            const x = Math.random() * bloodCanvas.width;
            const y = Math.random() * bloodCanvas.height;
            const width = Math.random() * 3 + 2;
            const height = Math.random() * 15 + 10;
            
            bloodCtx.fillStyle = '#aa0000';
            bloodCtx.fillRect(x, y, width, height);
        }
    }

    function jumpHunter() {
        if (currentChannel !== 7 || !isTvOn) return;
        
        const container = document.querySelector('.cursed-castlevania');
        if (!container) return;
        
        const hunter = container.querySelector('.castlevania-hunter');
        if (!hunter || gameStates.castlevania.jumpingOrFalling) return;
        
        gameStates.castlevania.jumpingOrFalling = true;
        
        // Simple jump animation
        const jumpHeight = 50;
        const jumpDuration = 600; // ms
        const startY = gameStates.castlevania.hunterY;
        const startTime = Date.now();
        
        function jumpAnimation() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / jumpDuration, 1);
            
            // Parabolic jump
            const jumpProgress = 1 - Math.pow(2 * progress - 1, 2);
            const newY = startY - jumpHeight * jumpProgress;
            
            gameStates.castlevania.hunterY = newY;
            hunter.style.top = `${newY}px`;
            
            if (progress < 1) {
                requestAnimationFrame(jumpAnimation);
            } else {
                hunter.style.top = `${startY}px`;
                gameStates.castlevania.hunterY = startY;
                gameStates.castlevania.jumpingOrFalling = false;
                
                // Random chance to light up windows
                if (Math.random() < 0.3) {
                    const windows = container.querySelectorAll('.castle-window');
                    if (windows.length) {
                        const windowIndex = Math.floor(Math.random() * windows.length);
                        windows[windowIndex].style.backgroundColor = '#ff0000';
                        windows[windowIndex].style.boxShadow = '0 0 10px #ff0000';
                        
                        setTimeout(() => {
                            windows[windowIndex].style.backgroundColor = '#000';
                            windows[windowIndex].style.boxShadow = 'none';
                        }, 500);
                    }
                }
            }
        }
        
        requestAnimationFrame(jumpAnimation);
    }

    function crouchHunter() {
        if (currentChannel !== 7 || !isTvOn) return;
        
        const container = document.querySelector('.cursed-castlevania');
        if (!container) return;
        
        const hunter = container.querySelector('.castlevania-hunter');
        if (!hunter) return;
        
        // Simple crouch animation
        hunter.style.height = '20px'; // Make shorter
        hunter.style.transform += ' scaleY(0.75)'; // Squish vertically
        
        // Return to normal after a delay
        setTimeout(() => {
            hunter.style.height = '32px';
            hunter.style.transform = hunter.style.transform.replace(' scaleY(0.75)', '');
        }, 500);
    }

    function useSubweapon() {
        if (currentChannel !== 7 || !isTvOn) return;
        
        const container = document.querySelector('.cursed-castlevania');
        if (!container) return;
        
        // Throw a cross
        const cross = document.createElement('div');
        cross.style.position = 'absolute';
        cross.style.width = '12px';
        cross.style.height = '12px';
        cross.style.backgroundColor = '#f5f5dc';
        cross.style.boxShadow = '0 0 5px #f5f5dc';
        
        // Create cross shape
        const crossCanvas = document.createElement('canvas');
        crossCanvas.width = 12;
        crossCanvas.height = 12;
        const crossCtx = crossCanvas.getContext('2d');
        
        // Draw cross
        crossCtx.fillStyle = '#f5f5dc';
        crossCtx.fillRect(4, 1, 4, 10); // Vertical bar
        crossCtx.fillRect(1, 4, 10, 4); // Horizontal bar
        
        cross.style.backgroundImage = `url(${crossCanvas.toDataURL('image/png', 0.8)})`;
        
        // Position at hunter's position
        cross.style.top = `${gameStates.castlevania.hunterY + 10}px`;
        cross.style.left = `${gameStates.castlevania.hunterX + (gameStates.castlevania.facingRight ? 20 : -10)}px`;
        cross.style.zIndex = '2';
        
        container.appendChild(cross);
        
        // Animate cross
        const direction = gameStates.castlevania.facingRight ? 1 : -1;
        let posX = gameStates.castlevania.hunterX + (gameStates.castlevania.facingRight ? 20 : -10);
        
        const animateCross = () => {
            posX += 5 * direction;
            cross.style.left = `${posX}px`;
            
            // Rotate cross
            cross.style.transform = `rotate(${posX}deg)`;
            
            // Check boundaries
            if (posX < 0 || posX > container.offsetWidth) {
                if (container.contains(cross)) {
                    container.removeChild(cross);
                }
                return;
            }
            
            requestAnimationFrame(animateCross);
        };
        
        requestAnimationFrame(animateCross);
    }
}); 