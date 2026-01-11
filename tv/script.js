// script.js

// Global variables for TV state
let tvPowered = false;
let currentChannel = 1;
let channelTimeout = null;
let controlsVisible = false; // Track if embed controls are visible

// Collection of Archive.org items that can be embedded
const archiveItems = [
  // Current working videos from RSS feed
  'll-dec-2024-h-264-final-20241207',    // Lost Landscapes of San Francisco 2024
  '200503_The_Human_Factor_In_Driving',   // Driving safety film 
  '200470_Young_Girl_in_a_Garden',        // Young dancer emoting to piano soundtrack
  '200470_Second_Fiddle_R4',              // Boy protects mother with unloaded shotgun
  '200470_Floating_Mapped_Out',           // Visual explanation of flotation principle
  '200461_Calvin_0317',                   // Scrap metal yard documentary
  '200460_Toward_Emotional_Maturity',     // Educational film about emotional responses
  '200458_Calvin_0316',                   // More scrap metal yard footage
  '200452_Hog_Sense',                     // Hog raising practices
  'Strohm_0049',                          // Labor and industry in Southeast Asia
  'Strohm_0048',                          // Rubber farming in Southeast Asia
  'Strohm_0047',                          // Visit to Egypt, India, and Thailand
  '200335_China_Under_Communism_Strohm_0053', // China under communism documentary
  'Strohm_0046',                         // Grain trade show in Pakistan 1968
  'Strohm_0045',                         // South Dakota experimental research farm
  'Strohm_0044',                         // Farming in Turkey
  'Strohm_0043',                         // Farming communities in rural India
  'Strohm_0042',                         // Grain fields in Soviet Union
  'Strohm_0035',                         // New Jersey Business Association meeting
  
  // Videos from VHS Vault collection
  'dtv-love-songs-1985-vhs-recording-by-old-school-disney-archive', // DTV: Love Songs (1985)
  'ancient-america-the-southwest',       // Ancient America: The Southwest
  'the-complete-yellowstone',            // The Complete Yellowstone Video
  'big-bend-americas-last-primitive-frontier', // Big Bend: America's Last Primitive Frontier
  'americas-natural-wonders-yellowstone-grand-canyon-yosemite', // America's Natural Wonders
  'opening-to-the-aristocats-1996-vhs_202504', // The Aristoanimals (1996 VHS)
  'DBGT-OP-Official-TV-Size-Instrumental', // Dragon Ball GT Theme Instrumental
  '2025-04-06-22-19-00',                // 1988 HBO Commercials
  'shrek-2001-vhs-25of-25',             // Shrek (2001 VHS)
  'shrek-2001-vhs_202504',              // Shrek (2001 VHS) alternate
  'alice-in-wonderland-1995-vhs-part-18', // Alice in Wonderland (1995 VHS)
  'cffvgbhjklmjin75',                   // Ninja Operation 5 Godfather
  'kion-and-bunga-shrek-part-06-welcome-to-duloc', // Kion and Bunga (Shrek parody)
  'Thanksgiving_Day_Parade_2009'        // Thanksgiving Day Parade 2009
];

// DOM elements
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded');
  const powerButton = document.getElementById('power-button');
  const channelDisplay = document.getElementById('channel-number');
  const volumeKnob = document.querySelector('.volume-knob');
  const channelKnob = document.querySelector('.channel-knob');
  const tvScreen = document.querySelector('.tv-screen');
  const staticOverlay = document.querySelector('.static-overlay');
  
  // Set initial state
  channelDisplay.textContent = '--';
  
  // Add event listeners
  powerButton.addEventListener('click', togglePower);
  channelKnob.addEventListener('click', changeChannel);
  
  // Use volume knob to toggle controls visibility
  volumeKnob.addEventListener('click', toggleControls);
  
  // Log player container to debug
  console.log('Player container:', document.getElementById('player'));
  
  // Enhance scanlines - make them more pronounced
  enhanceScanlines();
});

// Enhance scanlines function
function enhanceScanlines() {
  // Create a style element to override the default scanline styles
  const scanlineStyles = document.createElement('style');
  scanlineStyles.textContent = `
    .scanlines {
      background: linear-gradient(
        to bottom,
        rgba(255, 255, 255, 0) 0%,
        rgba(255, 255, 255, 0) 48%,
        rgba(16, 16, 16, 0.5) 50%,
        rgba(255, 255, 255, 0) 52%,
        rgba(255, 255, 255, 0) 100%
      );
      background-size: 100% 6px; /* Larger scanlines (was likely 2-3px) */
      opacity: 0.6 !important; /* More pronounced */
      pointer-events: none;
      z-index: 15 !important;
    }
    
    /* Add a subtle bloom effect to enhance the retro look */
    .tv-powered-on:after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      box-shadow: inset 0 0 50px rgba(10, 120, 200, 0.2); /* Subtle blue glow */
      pointer-events: none;
      z-index: 12;
    }
    
    /* Enhance static to be more visible */
    .static-overlay.active {
      opacity: 0.4 !important; /* More visible static */
    }
    
    /* Style for controls mode */
    .controls-visible .player-wrapper {
      z-index: 1000 !important;
      position: relative !important;
    }
    
    /* When controls are visible, ensure all overlays are out of the way */
    .controls-visible .scanlines,
    .controls-visible .static-overlay,
    .controls-visible .vignette,
    .controls-visible:after {
      display: none !important;
    }
    
    /* Make the iframe container take up full space in controls mode */
    .controls-visible #player {
      width: 100% !important;
      height: 100% !important;
      z-index: 1000 !important;
      position: relative !important;
    }
    
    /* Add message overlay styling */
    .message-overlay {
      position: absolute;
      top: 10px;
      left: 0;
      right: 0;
      text-align: center;
      color: white;
      background-color: rgba(0,0,0,0.5);
      padding: 5px;
      z-index: 2000;
      pointer-events: none;
    }
  `;
  
  // Add the style element to the head of the document
  document.head.appendChild(scanlineStyles);
  
  console.log('Enhanced scanlines applied');
}

// Power toggle function
function togglePower() {
  console.log('Power button clicked');
  const tvScreen = document.querySelector('.tv-screen');
  const staticOverlay = document.querySelector('.static-overlay');
  const channelDisplay = document.getElementById('channel-number');
  const powerButton = document.getElementById('power-button');
  
  if (!tvPowered) {
    // Power on sequence
    console.log('Powering on TV');
    powerButton.classList.add('active');
    tvScreen.classList.add('tv-powering-on');
    
    // Set tvPowered to true immediately to avoid race condition
    tvPowered = true;
    
    // Show power-on animation
    setTimeout(() => {
      tvScreen.classList.remove('tv-powering-on');
      tvScreen.classList.add('tv-powered-on');
      staticOverlay.classList.add('active');
      
      // Show initial channel
      currentChannel = Math.floor(Math.random() * archiveItems.length);
      channelDisplay.textContent = (currentChannel + 1).toString().padStart(2, '0');
      
      // Load video
      console.log('Loading initial video');
      loadArchiveEmbed(archiveItems[currentChannel]);
    }, 500);
  } else {
    // Power off
    console.log('Powering off TV');
    powerButton.classList.remove('active');
    tvScreen.classList.remove('tv-powered-on');
    staticOverlay.classList.remove('active');
    channelDisplay.textContent = '--';
    
    // Clear any pending channel changes
    if (channelTimeout) {
      clearTimeout(channelTimeout);
      channelTimeout = null;
    }
    
    // Stop video if playing
    const playerContainer = document.getElementById('player');
    if (playerContainer) {
      console.log('Clearing player container');
      playerContainer.innerHTML = '';
    }
    
    tvPowered = false;
    
    // Reset controls state when turning off
    controlsVisible = false;
    updateControlsVisibility();
  }
}

// Toggle controls visibility function
function toggleControls() {
  if (!tvPowered) return;
  
  console.log('Toggle controls');
  controlsVisible = !controlsVisible;
  
  // Update UI to show volume knob state
  const volumeKnob = document.querySelector('.volume-knob');
  if (controlsVisible) {
    volumeKnob.classList.add('active');
  } else {
    volumeKnob.classList.remove('active');
  }
  
  // Don't reload the video - just update the visibility and controls
  updateControlsVisibility();
  
  // Try to send message to iframe to show/hide controls if possible
  try {
    const iframe = document.querySelector('#player iframe');
    if (iframe) {
      // Tell Archive.org player to show controls
      iframe.contentWindow.postMessage(
        JSON.stringify({
          event: 'av_uicontrols', 
          value: controlsVisible
        }), 
        '*'
      );
    }
  } catch (e) {
    console.log('Could not send controls message to iframe:', e);
  }
  
  // Show message to inform user
  const playerContainer = document.getElementById('player');
  if (playerContainer) {
    showMessage(
      controlsVisible ? 
        'Controls mode ON - Use Archive.org controls' : 
        'TV mode ON - Vintage experience'
    );
  }
}

// Helper to show temporary messages
function showMessage(text, duration = 3000) {
  const playerContainer = document.getElementById('player');
  if (!playerContainer) return;
  
  // Create message element
  const messageElement = document.createElement('div');
  messageElement.className = 'message-overlay';
  messageElement.innerText = text;
  
  // Remove any existing message
  const existingMessage = playerContainer.querySelector('.message-overlay');
  if (existingMessage) {
    playerContainer.removeChild(existingMessage);
  }
  
  playerContainer.appendChild(messageElement);
  
  // Remove message after specified duration
  setTimeout(() => {
    if (messageElement.parentNode === playerContainer) {
      playerContainer.removeChild(messageElement);
    }
  }, duration);
}

// Update the controls visibility based on state
function updateControlsVisibility() {
  const tvScreen = document.querySelector('.tv-screen');
  const staticOverlay = document.querySelector('.static-overlay');
  const scanlines = document.querySelector('.scanlines');
  
  if (controlsVisible) {
    // Controls mode - make iframe more accessible
    if (tvScreen) tvScreen.classList.add('controls-visible');
    if (staticOverlay) staticOverlay.style.opacity = '0';
    if (staticOverlay) staticOverlay.style.pointerEvents = 'none';
    if (scanlines) scanlines.style.opacity = '0';
    
    // Make sure all overlays are out of the way
    document.querySelectorAll('.tv-screen > *:not(#player)').forEach(element => {
      element.style.pointerEvents = 'none';
      element.style.opacity = '0';
    });
    
    // Make sure the player container is accessible
    const playerContainer = document.getElementById('player');
    if (playerContainer) {
      playerContainer.style.zIndex = '1000';
      playerContainer.style.position = 'relative';
      
      // Make each iframe more accessible
      playerContainer.querySelectorAll('iframe').forEach(iframe => {
        iframe.style.zIndex = '1500';
        iframe.style.position = 'relative';
        iframe.style.pointerEvents = 'auto';
      });
      
      // Make wrappers accessible too
      playerContainer.querySelectorAll('.player-wrapper').forEach(wrapper => {
        wrapper.style.zIndex = '1000';
        wrapper.style.pointerEvents = 'auto';
      });
    }
  } else {
    // TV mode - restore vintage look
    if (tvScreen) tvScreen.classList.remove('controls-visible');
    if (staticOverlay) staticOverlay.style.opacity = '';
    if (staticOverlay) staticOverlay.style.pointerEvents = '';
    if (scanlines) scanlines.style.opacity = '';
    
    // Restore overlay elements
    document.querySelectorAll('.tv-screen > *:not(#player)').forEach(element => {
      element.style.pointerEvents = '';
      element.style.opacity = '';
    });
    
    // Reset player container
    const playerContainer = document.getElementById('player');
    if (playerContainer) {
      playerContainer.style.zIndex = '';
      playerContainer.style.position = '';
      
      // Reset iframe styling
      playerContainer.querySelectorAll('iframe').forEach(iframe => {
        iframe.style.zIndex = '';
        iframe.style.position = '';
        iframe.style.pointerEvents = '';
      });
      
      // Reset wrappers too
      playerContainer.querySelectorAll('.player-wrapper').forEach(wrapper => {
        wrapper.style.zIndex = '';
        wrapper.style.pointerEvents = '';
      });
    }
  }
}

// Change channel function
function changeChannel() {
  if (!tvPowered) return;
  
  console.log('Changing channel');
  const staticOverlay = document.querySelector('.static-overlay');
  const channelDisplay = document.getElementById('channel-number');
  
  // Clear any pending channel changes
  if (channelTimeout) {
    clearTimeout(channelTimeout);
  }
  
  // Show static
  staticOverlay.classList.add('active');
  
  // Change channel number
  currentChannel = (currentChannel + 1) % archiveItems.length;
  channelDisplay.textContent = (currentChannel + 1).toString().padStart(2, '0');
  
  // Load the next archive item after static effect
  channelTimeout = setTimeout(() => {
    loadArchiveEmbed(archiveItems[currentChannel]);
    // Static will be removed by the loadArchiveEmbed function
  }, 1000);
}

// Load an Archive.org item using their embed iframe
function loadArchiveEmbed(itemId) {
  console.log(`Loading Archive.org item: ${itemId}`);
  const playerContainer = document.getElementById('player');
  const staticOverlay = document.querySelector('.static-overlay');
  
  if (!tvPowered) {
    console.log('TV not powered on, not loading video');
    return;
  }
  
  if (!playerContainer) {
    console.error('Player container not found!');
    return;
  }
  
  try {
    // Clear container
    playerContainer.innerHTML = '';
    
    // Create a wrapper for the iframe to help with positioning
    const wrapper = document.createElement('div');
    wrapper.className = 'player-wrapper';
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
    wrapper.style.position = 'relative';
    
    // Create the iframe for Archive.org's player
    const iframe = document.createElement('iframe');
    
    // Set URL with appropriate parameters
    // Always include ui=1 to ensure controls are available
    // We'll just hide them with CSS in TV mode
    iframe.src = `https://archive.org/embed/${itemId}?autoplay=1&ui=1`;
    
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.frameBorder = '0';
    iframe.allowFullscreen = true;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.backgroundColor = 'black';
    
    // Add iframe to wrapper, then add wrapper to container
    wrapper.appendChild(iframe);
    playerContainer.appendChild(wrapper);
    
    console.log('Appending embed iframe to player container');
    
    // Apply current controls visibility to the iframe after it loads
    iframe.onload = function() {
      console.log('Iframe loaded, applying visibility settings');
      updateControlsVisibility();
      
      // Add a small delay to ensure controls state is correctly applied
      setTimeout(() => {
        try {
          // Tell Archive.org player to show/hide controls
          iframe.contentWindow.postMessage(
            JSON.stringify({
              event: 'av_uicontrols', 
              value: controlsVisible
            }), 
            '*'
          );
        } catch (e) {
          console.log('Could not send controls message to iframe:', e);
        }
      }, 500);
    };
    
    // Hide static after a reasonable delay
    setTimeout(() => {
      staticOverlay.classList.remove('active');
    }, 2500);
    
    // Handle iframes that might not load properly
    setTimeout(() => {
      if (staticOverlay.classList.contains('active')) {
        console.log('Embed timeout - trying next channel');
        changeChannel();
      }
    }, 10000);
    
  } catch (err) {
    console.error("Error loading archive item:", err);
    if (playerContainer) {
      playerContainer.innerHTML = `<div class="message-overlay">Error loading channel: ${err.message}</div>`;
    }
    
    // Try another channel after a delay
    setTimeout(() => {
      changeChannel();
    }, 3000);
  }
}