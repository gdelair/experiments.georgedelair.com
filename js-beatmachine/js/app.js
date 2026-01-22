// Constants and Configuration
const NUM_STEPS = 16;

// Multiple drum kits with updated directory names (no spaces)
const DRUM_KITS = {
    'clean': {
        name: 'Clean Kit',
        sounds: [
            { id: 'kick', name: 'Kick', file: 'CleanKit/kick01rr1.wav' },
            { id: 'snare', name: 'Snare', file: 'CleanKit/snare01.wav' },
            { id: 'hihat-closed', name: 'HH Closed', file: 'CleanKit/hhclosed.wav' },
            { id: 'hihat-open', name: 'HH Open', file: 'CleanKit/hhopen.wav' },
            { id: 'clap', name: 'Clap', file: 'CleanKit/clap.wav' },
            { id: 'tom', name: 'Tom', file: 'CleanKit/tomlo.wav' },
            { id: 'perc1', name: 'Conga', file: 'CleanKit/congahi.wav' },
            { id: 'perc2', name: 'Cowbell', file: 'CleanKit/cowbell.wav' }
        ]
    },
    'hot': {
        name: 'Hot Kit',
        sounds: [
            { id: 'kick', name: 'Kick', file: 'HotKit/kick01.wav' },
            { id: 'snare', name: 'Snare', file: 'HotKit/snare01.wav' },
            { id: 'hihat-closed', name: 'HH Closed', file: 'HotKit/hhclosed.wav' },
            { id: 'hihat-open', name: 'HH Open', file: 'HotKit/hhopen.wav' },
            { id: 'clap', name: 'Clap', file: 'HotKit/clap.wav' },
            { id: 'tom', name: 'Tom', file: 'HotKit/tomlo.wav' },
            { id: 'perc1', name: 'Conga', file: 'HotKit/congahi.wav' },
            { id: 'perc2', name: 'Cowbell', file: 'HotKit/cowbell.wav' }
        ]
    },
    'warm': {
        name: 'Warm Kit',
        sounds: [
            { id: 'kick', name: 'Kick', file: 'WarmKit/kick01.wav' },
            { id: 'snare', name: 'Snare', file: 'WarmKit/snare01.wav' },
            { id: 'hihat-closed', name: 'HH Closed', file: 'WarmKit/hhclosed.wav' },
            { id: 'hihat-open', name: 'HH Open', file: 'WarmKit/hhopen.wav' },
            { id: 'clap', name: 'Clap', file: 'WarmKit/clap.wav' },
            { id: 'tom', name: 'Tom', file: 'WarmKit/tomlo.wav' },
            { id: 'perc1', name: 'Conga', file: 'WarmKit/congahi.wav' },
            { id: 'perc2', name: 'Cowbell', file: 'WarmKit/cowbell.wav' }
        ]
    }
};

// Main Class for Beat Machine
class BeatMachine {
    constructor() {
        console.log("Initializing Beat Machine");
        
        // Initialize state
        this.isPlaying = false;
        this.currentStep = 0;
        this.bpm = 120;
        this.tracks = {};
        this.stepButtons = {};
        this.currentKit = 'clean'; // Default kit
        this.effects = {};
        this.volumes = {};
        this.samplesLoaded = false;
        this.sampleRetries = 0;
        this.selectedTrack = null; // Track the selected track
        this.isLoadingKit = false; // Prevents race conditions during kit switching
        
        // Initialize Tone.js
        this.initTone();
        
        // Create UI elements
        this.createUI();
        
        // Add kit selector
        this.createKitSelector();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize presets
        this.presets = this.createPresets();
        
        // Show loading indicator
        this.showLoadingIndicator();
        
        // Create sequencer tracks first
        this.createSequencerTracks();
        
        // Then load audio samples
        this.loadSamples();
        
        console.log("Beat Machine initialization complete");
    }
    
    async initTone() {
        console.log("Initializing Tone.js");
        
        try {
            // Set up Tone.js master output
            this.masterVolume = new Tone.Volume(0).toDestination();
            
            // Initialize Tone.js Transport
            Tone.Transport.bpm.value = this.bpm;
            Tone.Transport.timeSignature = [4, 4];
            
            // Create a recurring event using Tone.js Transport
            this.loop = new Tone.Loop((time) => {
                this.playStep(time);
            }, '16n');
            
            console.log("Tone.js initialized");
        } catch (error) {
            console.error("Error initializing Tone.js:", error);
            document.body.innerHTML += `<div style="color:red;padding:20px;background:#333;position:fixed;top:0;left:0;right:0;z-index:9999">
                ERROR initializing Tone.js: ${error.message}<br>
                Please ensure you're accessing via http://localhost:8000/
            </div>`;
        }
    }
    
    createUI() {
        // Create UI interface elements using NexusUI
        this.createControls();
        // Don't create sequencer tracks here - it's already done in the constructor
    }
    
    createControls() {
        // Tempo slider
        this.tempoSlider = new Nexus.Slider('#tempo-slider', {
            size: [150, 20],
            min: 60,
            max: 200,
            step: 1,
            value: this.bpm
        });
        
        this.tempoSlider.on('change', (v) => {
            this.bpm = v;
            Tone.Transport.bpm.value = v;
            document.getElementById('tempo-display').textContent = Math.round(v);
        });
        
        // Master volume dial
        this.masterVolumeDial = new Nexus.Dial('#master-volume', {
            size: [50, 50],
            interaction: 'vertical',
            min: -60,
            max: 0,
            step: 1,
            value: 0
        });
        
        this.masterVolumeDial.on('change', (v) => {
            this.masterVolume.volume.value = v;
        });
    }
    
    createKitSelector() {
        // Add kit selector to the DOM
        const presetSelect = document.getElementById('presets-select');
        if (presetSelect) {
            // Create kit selector above the preset selector
            const kitSelector = document.createElement('div');
            kitSelector.className = 'kit-selector';
            kitSelector.innerHTML = `
                <label for="kit-select">Kit:</label>
                <select id="kit-select">
                    <option value="clean">Clean Kit</option>
                    <option value="hot">Hot Kit</option>
                    <option value="warm">Warm Kit</option>
                </select>
            `;
            presetSelect.parentNode.insertBefore(kitSelector, presetSelect.parentNode.firstChild);
            
            // Add event listener
            document.getElementById('kit-select').addEventListener('change', (e) => {
                this.changeKit(e.target.value);
            });
        }
    }
    
    changeKit(kitId) {
        // Prevent rapid kit switching while samples are loading
        if (this.isLoadingKit) {
            console.log("Kit change in progress, please wait...");
            return;
        }

        // Change the current kit
        if (DRUM_KITS[kitId]) {
            this.isLoadingKit = true;
            this.currentKit = kitId;

            // Stop playing and reload samples
            if (this.isPlaying) {
                this.stop();
            }

            // Show loading indicator for new kit
            this.showLoadingIndicator();

            // Recreate sequencer tracks for the new kit
            this.createSequencerTracks();

            // Reload samples with new kit
            this.loadSamples();
        }
    }
    
    createSequencerTracks() {
        console.log("Creating sequencer tracks");
        const tracksContainer = document.querySelector('.tracks');
        
        if (!tracksContainer) {
            console.error("Could not find tracks container element!");
            return;
        }
        
        // Clear existing tracks
        tracksContainer.innerHTML = '';
        
        // Clear existing tracks and step buttons from memory
        this.tracks = {};
        this.stepButtons = {};
        
        // Reset selected track
        this.selectedTrack = null;
        this.hideTrackControls();
        
        // Use the current selected kit
        const currentKit = DRUM_KITS[this.currentKit];
        
        currentKit.sounds.forEach(sound => {
            const trackEl = document.createElement('div');
            trackEl.className = 'track';
            trackEl.dataset.sound = sound.id;
            
            // Simplified track HTML - just name and steps
            trackEl.innerHTML = `
                <div class="track-name">${sound.name}</div>
                <div class="track-steps" id="${sound.id}-steps"></div>
            `;
            
            tracksContainer.appendChild(trackEl);
            
            // Add click handler for track selection
            trackEl.addEventListener('click', (e) => {
                // Prevent clicking on step buttons from selecting the track
                if (e.target.classList.contains('step') || e.target.closest('.step-container')) {
                    return;
                }
                this.selectTrack(sound.id);
            });
            
            this.createStepButtons(sound.id);
            
            // Create volume and effects nodes for this track (but no UI yet)
            this.createTrackEffects(sound.id);
        });
        
        // Select the first track by default
        if (currentKit.sounds.length > 0) {
            this.selectTrack(currentKit.sounds[0].id);
        }
    }
    
    createStepButtons(trackId) {
        console.log(`Creating step buttons for ${trackId}`);
        const container = document.getElementById(`${trackId}-steps`);
        
        if (!container) {
            console.error(`Could not find container for ${trackId}-steps`);
            return;
        }
        
        // Add a flex container class for better layout
        container.classList.add('step-buttons-container');
        
        this.tracks[trackId] = Array(NUM_STEPS).fill(false);
        
        // Store step buttons for this track as an array
        this.stepButtons[trackId] = [];
        
        for (let i = 0; i < NUM_STEPS; i++) {
            try {
                const stepContainer = document.createElement('div');
                stepContainer.id = `${trackId}-step-${i}`;
                stepContainer.className = 'step-container';
                
                // Add visual marker for each 4 steps (beat)
                if (i % 4 === 0) {
                    stepContainer.classList.add('beat-start');
                }
                
                container.appendChild(stepContainer);
                
                const button = new Nexus.Button(`#${trackId}-step-${i}`, {
                    'size': [40, 40],
                    'mode': 'toggle',
                    'state': false
                });
                
                button.element.classList.add('step');
                button.element.dataset.step = i;
                
                // Add event listener for button toggle
                button.on('change', v => {
                    this.tracks[trackId][i] = v;
                });
                
                this.stepButtons[trackId].push(button);
            } catch (error) {
                console.error(`Error creating button for ${trackId} step ${i}:`, error);
            }
        }
    }
    
    // Create the audio nodes for a track (but not the UI controls)
    createTrackEffects(trackId) {
        try {
            // Check if we're in a secure context for AudioWorkletNode
            const isSecureContext = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';
            
            // Create volume node for this track
            this.volumes[trackId] = new Tone.Volume(-10);
            
            // Initialize effect nodes for this track
            this.effects[trackId] = {
                // Use a simpler reverb that doesn't require AudioWorklet
                reverb: isSecureContext ? 
                    new Tone.JCReverb({
                        roomSize: 0.2,
                        wet: 0
                    }).toDestination() :
                    new Tone.FeedbackDelay({ // Fallback if not in secure context
                        delayTime: 0.5,
                        feedback: 0.5,
                        wet: 0
                    }).toDestination(),
                delay: new Tone.FeedbackDelay({
                    delayTime: '8n',
                    feedback: 0.3,
                    wet: 0
                }).toDestination()
            };
        } catch (error) {
            console.error(`Error creating effects for ${trackId}:`, error);
        }
    }
    
    // Create and update the track controls panel when a track is selected
    selectTrack(trackId) {
        // Deselect previous track if any
        if (this.selectedTrack) {
            document.querySelector(`.track[data-sound="${this.selectedTrack}"]`)?.classList.remove('selected');
        }
        
        // Set new selected track
        this.selectedTrack = trackId;
        
        // Highlight the selected track
        document.querySelector(`.track[data-sound="${trackId}"]`)?.classList.add('selected');
        
        // Show the track controls panel
        this.showTrackControls(trackId);
    }
    
    // Show the track controls for the currently selected track
    showTrackControls(trackId) {
        const controlsPanel = document.getElementById('track-controls-panel');
        if (!controlsPanel) return;

        // Ensure effects and volumes exist for this track before proceeding
        if (!this.effects[trackId] || !this.volumes[trackId]) {
            console.warn(`Effects or volumes not initialized for track: ${trackId}`);
            return;
        }

        // Show the panel
        controlsPanel.classList.add('visible');
        
        // Clear any existing controls
        const volumeContainer = document.getElementById('selected-track-volume');
        const reverbContainer = document.getElementById('selected-track-reverb');
        const delayContainer = document.getElementById('selected-track-delay');
        
        if (volumeContainer) volumeContainer.innerHTML = '';
        if (reverbContainer) reverbContainer.innerHTML = '';
        if (delayContainer) delayContainer.innerHTML = '';
        
        // Create volume control
        this.selectedVolumeDial = new Nexus.Dial('#selected-track-volume', {
            size: [60, 60],
            interaction: 'vertical',
            min: -60,
            max: 0,
            step: 1,
            value: this.volumes[trackId].volume.value || -10
        });
        
        this.selectedVolumeDial.on('change', (v) => {
            if (this.volumes[this.selectedTrack]) {
                this.volumes[this.selectedTrack].volume.value = v;
            }
        });
        
        // Create reverb control
        this.selectedReverbDial = new Nexus.Dial('#selected-track-reverb', {
            size: [60, 60],
            interaction: 'vertical',
            min: 0,
            max: 1,
            step: 0.01,
            value: this.effects[trackId].reverb.wet.value || 0
        });
        
        this.selectedReverbDial.on('change', (v) => {
            if (this.effects[this.selectedTrack]) {
                this.effects[this.selectedTrack].reverb.wet.value = v;
            }
        });
        
        // Create delay control
        this.selectedDelayDial = new Nexus.Dial('#selected-track-delay', {
            size: [60, 60],
            interaction: 'vertical',
            min: 0,
            max: 1,
            step: 0.01,
            value: this.effects[trackId].delay.wet.value || 0
        });
        
        this.selectedDelayDial.on('change', (v) => {
            if (this.effects[this.selectedTrack]) {
                this.effects[this.selectedTrack].delay.wet.value = v;
            }
        });
    }
    
    // Hide the track controls panel
    hideTrackControls() {
        const controlsPanel = document.getElementById('track-controls-panel');
        if (controlsPanel) {
            controlsPanel.classList.remove('visible');
        }
    }
    
    showLoadingIndicator() {
        // Create a loading indicator
        const loadingEl = document.createElement('div');
        loadingEl.id = 'loading-indicator';
        loadingEl.style.position = 'fixed';
        loadingEl.style.top = '10px';
        loadingEl.style.right = '10px';
        loadingEl.style.padding = '5px 10px';
        loadingEl.style.background = '#333';
        loadingEl.style.color = '#ff5';
        loadingEl.style.borderRadius = '4px';
        loadingEl.style.zIndex = '9999';
        loadingEl.style.fontSize = '14px';
        loadingEl.textContent = 'Loading samples...';
        document.body.appendChild(loadingEl);
    }
    
    updateLoadingIndicator(status, success = true) {
        const indicator = document.getElementById('loading-indicator');
        if (indicator) {
            indicator.textContent = status;
            indicator.style.color = success ? '#5f5' : '#f55';
            
            // Auto-hide after 3 seconds if successful
            if (success) {
                setTimeout(() => {
                    indicator.style.opacity = '0';
                    indicator.style.transition = 'opacity 0.5s';
                    setTimeout(() => {
                        if (indicator.parentNode) {
                            indicator.parentNode.removeChild(indicator);
                        }
                    }, 500);
                }, 3000);
            }
        }
    }
    
    loadSamples() {
        console.log("Loading samples for kit:", this.currentKit);
        
        // Clean up any previous players
        if (this.players) {
            this.players.dispose();
        }
        
        this.samplesLoaded = false;
        
        // Create object to hold sample URLs
        const sampleUrls = {};
        const currentKit = DRUM_KITS[this.currentKit];
        
        try {
            // Simple path construction - no encoding needed with new directory names
            currentKit.sounds.forEach(sound => {
                const samplePath = `samples/${sound.file}`;
                sampleUrls[sound.id] = samplePath;
                console.log(`Loading sample: ${sound.id} from: ${samplePath}`);
            });
            
            // Create new Tone.Players instance for all samples
            this.players = new Tone.Players({
                urls: sampleUrls,
                fadeOut: 0.1,
                onload: () => {
                    console.log("All samples loaded for kit:", this.currentKit);
                    this.samplesLoaded = true;
                    this.sampleRetries = 0;
                    this.isLoadingKit = false;
                    this.updateLoadingIndicator('Samples loaded successfully');
                    
                    // Set up audio routing for each player
                    currentKit.sounds.forEach(sound => {
                        const player = this.players.player(sound.id);
                        const volume = this.volumes[sound.id];
                        const effects = this.effects[sound.id];
                        
                        if (player && volume && effects) {
                            // Disconnect any previous connections
                            player.disconnect();

                            // Connect player to volume
                            player.connect(volume);

                            // Audio routing: Volume splits to reverb and delay in parallel.
                            // Each effect controls its own wet/dry mix via the .wet property.
                            // Effects connect directly to destination (set up in createTrackEffects).
                            volume.connect(effects.reverb);
                            volume.connect(effects.delay);
                        }
                    });
                },
                onerror: (error) => {
                    console.error("Error loading samples:", error);
                    this.samplesLoaded = false;
                    this.isLoadingKit = false;
                    this.updateLoadingIndicator('Failed to load samples. Please check that sample files exist.', false);
                }
            });
        } catch (error) {
            console.error("Exception in loadSamples:", error);
            this.updateLoadingIndicator('Error loading samples: ' + error.message, false);
        }
    }
    
    setupEventListeners() {
        // Play button
        document.getElementById('play-button').addEventListener('click', () => this.togglePlay());
        
        // Stop button
        document.getElementById('stop-button').addEventListener('click', () => this.stop());
        
        // Reset button
        document.getElementById('reset-button').addEventListener('click', () => this.reset());
        
        // Preset selection
        document.getElementById('presets-select').addEventListener('change', (e) => {
            const presetName = e.target.value;
            if (presetName !== 'none') {
                this.loadPreset(presetName);
            }
        });
        
        // Save button
        document.getElementById('save-button').addEventListener('click', () => this.savePattern());
        
        // Load button
        document.getElementById('load-button').addEventListener('click', () => this.loadPattern());
    }
    
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }
    
    async play() {
        try {
            // Check if samples are loaded before starting playback
            if (!this.samplesLoaded || !this.players) {
                console.warn("Cannot start playback - samples are not loaded yet");
                this.updateLoadingIndicator('Cannot play - samples still loading. Please wait...', false);
                return;
            }
            
            // Check that at least one sample is loaded properly
            let atLeastOneSampleLoaded = false;
            Object.keys(this.tracks).forEach(trackId => {
                if (this.players.player(trackId) && this.players.player(trackId).loaded) {
                    atLeastOneSampleLoaded = true;
                }
            });
            
            if (!atLeastOneSampleLoaded) {
                console.warn("No samples are loaded properly");
                this.updateLoadingIndicator('Samples failed to load. Check that all sample files exist.', false);
                return;
            }
            
            // Start audio context if it's not running (needed for browsers)
            if (Tone.context.state !== 'running') {
                console.log("Starting AudioContext on user interaction");
                await Tone.start();
            }
            
            this.isPlaying = true;
            document.getElementById('play-button').textContent = 'Pause';
            
            // Start transport and loop
            this.loop.start(0);
            Tone.Transport.start();
        } catch (error) {
            console.error('Error starting audio:', error);
            this.updateLoadingIndicator(`Error starting audio: ${error.message}`, false);
        }
    }
    
    pause() {
        this.isPlaying = false;
        document.getElementById('play-button').textContent = 'Play';
        
        // Stop transport only (don't reset state)
        Tone.Transport.pause();
    }
    
    stop() {
        this.isPlaying = false;
        document.getElementById('play-button').textContent = 'Play';
        
        // Stop and reset transport
        Tone.Transport.stop();
        this.currentStep = 0;
        this.updateStepVisuals();
    }
    
    reset() {
        // Stop playback
        this.stop();
        
        // Clear all steps
        Object.keys(this.tracks).forEach(trackId => {
            this.tracks[trackId].fill(false);
            this.stepButtons[trackId].forEach(button => {
                button.state = false;
            });
        });
    }
    
    playStep(time) {
        // Update current step
        this.currentStep = (this.currentStep + 1) % NUM_STEPS;
        
        // Update visual representation of steps
        this.updateStepVisuals();
        
        // Verify player is still available and loaded before trying to play
        if (!this.players || !this.samplesLoaded) {
            return; // Skip playback if players aren't ready
        }
        
        // Check which tracks have this step active
        Object.keys(this.tracks).forEach(trackId => {
            try {
                if (this.tracks[trackId][this.currentStep]) {
                    const player = this.players.player(trackId);
                    if (player && player.loaded) { // Only play if the specific sample is loaded
                        try {
                            // Play the sound using Tone.Players
                            // Using time parameter for accurate scheduling
                            player.start(time);
                        } catch (startError) {
                            console.error(`Error starting player ${trackId}:`, startError);
                        }
                    }
                }
            } catch (error) {
                console.error(`Error playing sample ${trackId}:`, error);
            }
        });
    }
    
    updateStepVisuals() {
        // Remove current step highlight from all buttons
        document.querySelectorAll('.step').forEach(el => el.classList.remove('current'));
        
        // Add current step highlight to the current step buttons
        Object.keys(this.stepButtons).forEach(trackId => {
            const buttons = this.stepButtons[trackId];
            if (buttons && buttons[this.currentStep]) {
                buttons[this.currentStep].element.classList.add('current');
            }
        });
    }
    
    savePattern() {
        // Save current pattern to localStorage
        try {
            const pattern = {
                kit: this.currentKit,
                bpm: this.bpm,
                tracks: { ...this.tracks }
            };
            
            localStorage.setItem('beatMachine-savedPattern', JSON.stringify(pattern));
            alert('Pattern saved successfully!');
        } catch (error) {
            console.error('Error saving pattern:', error);
            alert('Failed to save pattern.');
        }
    }
    
    loadPattern() {
        try {
            // Get saved pattern from localStorage
            const savedPattern = localStorage.getItem('beatMachine-savedPattern');
            
            if (savedPattern) {
                const pattern = JSON.parse(savedPattern);
                
                // Set kit if available
                if (pattern.kit && DRUM_KITS[pattern.kit]) {
                    this.currentKit = pattern.kit;
                    document.getElementById('kit-select').value = pattern.kit;
                    this.createSequencerTracks();
                    this.loadSamples();
                }
                
                // Set BPM
                this.bpm = pattern.bpm;
                this.tempoSlider.value = pattern.bpm;
                Tone.Transport.bpm.value = pattern.bpm;
                document.getElementById('tempo-display').textContent = Math.round(pattern.bpm);
                
                // Load tracks
                Object.keys(pattern.tracks).forEach(trackId => {
                    if (this.tracks[trackId]) {
                        this.tracks[trackId] = [...pattern.tracks[trackId]];
                        
                        // Update UI buttons
                        this.stepButtons[trackId].forEach((button, i) => {
                            button.state = pattern.tracks[trackId][i];
                        });
                    }
                });
                
                alert('Pattern loaded successfully!');
            } else {
                alert('No saved pattern found.');
            }
        } catch (error) {
            console.error('Error loading pattern:', error);
            alert('Failed to load pattern.');
        }
    }
    
    createPresets() {
        return {
            'basic-beat': {
                bpm: 90,
                tracks: {
                    'kick': [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
                    'snare': [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
                    'hihat-closed': [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
                    'hihat-open': [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, true],
                    'clap': [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, true],
                    'tom': [false, false, false, false, false, false, false, false, false, false, true, true, false, false, false, false],
                    'perc1': [false, false, true, false, false, false, true, false, false, false, true, false, false, false, false, false],
                    'perc2': [false, false, false, false, false, false, false, true, false, false, false, false, false, false, true, false]
                }
            },
            'hip-hop': {
                bpm: 85,
                tracks: {
                    'kick': [true, false, false, false, false, false, true, false, false, false, false, true, false, false, true, false],
                    'snare': [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
                    'hihat-closed': [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
                    'hihat-open': [false, false, false, false, false, false, false, true, false, false, false, false, false, false, false, true],
                    'clap': [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
                    'tom': [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
                    'perc1': [false, true, false, true, false, false, false, false, false, true, false, true, false, false, false, false],
                    'perc2': [false, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false]
                }
            },
            'electro': {
                bpm: 128,
                tracks: {
                    'kick': [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
                    'snare': [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
                    'hihat-closed': [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
                    'hihat-open': [false, false, false, false, false, false, false, true, false, false, false, false, false, false, false, true],
                    'clap': [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
                    'tom': [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
                    'perc1': [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
                    'perc2': [true, true, false, false, false, false, true, true, true, true, false, false, false, false, true, true]
                }
            }
        };
    }
    
    loadPreset(presetName) {
        const preset = this.presets[presetName];
        
        if (preset) {
            // Set BPM
            this.bpm = preset.bpm;
            this.tempoSlider.value = preset.bpm;
            Tone.Transport.bpm.value = preset.bpm;
            document.getElementById('tempo-display').textContent = Math.round(preset.bpm);
            
            // Load tracks
            Object.keys(preset.tracks).forEach(trackId => {
                if (this.tracks[trackId]) {
                    this.tracks[trackId] = [...preset.tracks[trackId]];
                    
                    // Update UI buttons
                    this.stepButtons[trackId].forEach((button, i) => {
                        button.state = preset.tracks[trackId][i];
                    });
                }
            });
        }
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, checking for libraries...");
    
    // Test NexusUI directly
    try {
        console.log("Testing NexusUI availability:", typeof Nexus);
        
        if (typeof Nexus !== 'undefined') {
            console.log("Nexus object properties:", Object.keys(Nexus));
            
            // Try to create a simple NexusUI object to test functionality
            const testElement = document.createElement('div');
            testElement.id = 'test-nexus';
            testElement.style.width = '50px';
            testElement.style.height = '50px';
            testElement.style.position = 'fixed';
            testElement.style.bottom = '10px';
            testElement.style.right = '10px';
            testElement.style.background = '#333';
            testElement.style.zIndex = '9999';
            document.body.appendChild(testElement);
            
            console.log("Testing NexusUI Button creation...");
            const testButton = new Nexus.Button('#test-nexus', {
                'size': [50, 50],
                'mode': 'toggle',
                'state': false
            });
            
            testButton.on('change', function(v) {
                console.log("Test button changed:", v);
            });
            
            console.log("NexusUI test successful!");
        }
    } catch (e) {
        console.error("NexusUI test failed:", e);
        document.body.innerHTML += `<div style="color:red;padding:20px;background:#333;position:fixed;top:30px;left:0;right:0;z-index:9999">
            NexusUI test failed: ${e.message}<br>
            ${e.stack.replace(/\n/g, '<br>')}
        </div>`;
    }
    
    // Check if libraries are available
    if (typeof Tone === 'undefined') {
        console.error("Tone.js library is not loaded!");
        document.body.innerHTML += '<div style="color:red;padding:20px;background:#333;position:fixed;top:0;left:0;right:0;z-index:9999">ERROR: Tone.js library is not loaded!</div>';
    }
    
    // Wait longer for NexusUI to load - it might be coming from the fallback source
    let attempts = 0;
    const maxAttempts = 30; // Wait up to 3 seconds
    
    // Check if audio libraries are loaded
    const checkLibraries = () => {
        console.log("Checking libraries... (Attempt " + (attempts + 1) + "/" + maxAttempts + ")");
        console.log("Tone available:", typeof Tone !== 'undefined');
        console.log("Nexus available:", typeof Nexus !== 'undefined');
        
        attempts++;
        
        if (typeof Tone !== 'undefined' && typeof Nexus !== 'undefined') {
            console.log("Libraries loaded, initializing Beat Machine...");
            try {
                // Create and initialize the Beat Machine
                window.beatMachine = new BeatMachine();
                console.log("Beat Machine initialized successfully");
            } catch (error) {
                console.error("Error initializing Beat Machine:", error);
                document.body.innerHTML += `<div style="color:red;padding:20px;background:#333;position:fixed;top:0;left:0;right:0;z-index:9999">
                    ERROR initializing Beat Machine: ${error.message}<br>
                    ${error.stack.replace(/\n/g, '<br>')}
                </div>`;
            }
        } else if (attempts < maxAttempts) {
            // Retry with longer intervals as we make more attempts
            const delay = 100 + Math.min(attempts * 50, 500);
            console.log("Libraries not loaded yet, retrying in " + delay + "ms");
            setTimeout(checkLibraries, delay);
        } else {
            console.error("NexusUI library could not be loaded after " + maxAttempts + " attempts");
            
            if (typeof Nexus === 'undefined') {
                document.body.innerHTML += '<div style="color:red;padding:20px;background:#333;position:fixed;top:0;left:0;right:0;z-index:9999">' +
                    'ERROR: NexusUI library is not loaded after multiple attempts!<br>' +
                    'Please try refreshing the page or check your internet connection.</div>';
                
                // Last desperate attempt - try to load directly
                console.log("Making one final attempt to load NexusUI directly");
                const script = document.createElement('script');
                script.src = "https://unpkg.com/nexusui";
                script.onload = () => {
                    console.log("Final NexusUI load attempt succeeded");
                    // Try initializing one more time
                    if (typeof Nexus !== 'undefined') {
                        try {
                            window.beatMachine = new BeatMachine();
                        } catch (e) {
                            console.error("Final attempt also failed:", e);
                        }
                    }
                };
                document.head.appendChild(script);
            }
        }
    };
    
    checkLibraries();
});
