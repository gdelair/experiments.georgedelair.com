import { animate, createTimeline, utils } from './anime.esm.min.js';

const [ $digitalClock ] = utils.$('#digital');
const [ $settingsGear ] = utils.$('#settings-gear');
const [ $settingsMenu ] = utils.$('#settings-menu');
const [ $targetTimeInput ] = utils.$('#target-time');
const [ $countdownTitle ] = utils.$('#countdown-title');

const s = 1000;
const m = 60*s;
const h = 60*m;
const oneDay = h * 24;

let targetTimeStr = $targetTimeInput.value;

// Function to update the title
const updateTitle = () => {
  // Convert 24-hour format to 12-hour format with AM/PM
  const [hours, minutes] = targetTimeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12; // Convert 0 to 12 for 12 AM
  const formattedTime = `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  
  $countdownTitle.textContent = `Countdown until ${formattedTime}`;
}

// Store the digit elements
const digitElements = [];

// Create the elements for the clock display with proper digit extraction
// First clear any existing content
$digitalClock.innerHTML = '';

// Create a container for better organization
const digitDisplay = document.createElement('div');
digitDisplay.classList.add('digit-display');
$digitalClock.appendChild(digitDisplay);

// Define our digit structure with labels (keep the structure but remove actual labels)
const digitStructure = [
  { value: 10, type: 'hours-tens', label: null },
  { value: 1, type: 'hours-ones', label: null },
  { value: 0, type: 'colon', label: null },
  { value: 10, type: 'minutes-tens', label: null },
  { value: 1, type: 'minutes-ones', label: null },
  { value: 0, type: 'colon', label: null },
  { value: 10, type: 'seconds-tens', label: null },
  { value: 1, type: 'seconds-ones', label: null },
  { value: 0, type: 'colon', label: null },
  { value: 100, type: 'millis-hundreds', label: null },
  { value: 10, type: 'millis-tens', label: null }
];

// Create each digit element and its corresponding label
digitStructure.forEach(({ value, type, label }) => {
  const $el = document.createElement('div');
  $el.classList.add('slot');
  $el.classList.add(type);
  digitDisplay.appendChild($el);
  
  if (value === 0) {
    // This is a colon
    $el.classList.add('colon');
    $el.textContent = ':';
  } else {
    // This is a digit
    $el.classList.add('numbers');
    for (let i = 0; i < 10; i++) {
      const $num = document.createElement('div');
      $num.textContent = `${i}`;
      utils.set($num, { rotateX: (i * 36), z: '3ch' });
      $el.appendChild($num);
    }
    
    // Save reference with the correct type information
    digitElements.push({ 
      element: $el, 
      value: value,
      type: type
    });
  }
});

// Function to get the target time Date object for today/tomorrow
const getTargetDateTime = () => {
  const now = new Date();
  const [targetHours, targetMinutes] = targetTimeStr.split(':').map(Number);
  
  // Create target date based on current date
  const targetDate = new Date(now);
  targetDate.setHours(targetHours, targetMinutes, 0, 0);
  
  // If target time is already past for today, set it for tomorrow
  if (targetDate.getTime() <= now.getTime()) {
    targetDate.setDate(targetDate.getDate() + 1);
  }
  
  return targetDate;
}

// Function to get time remaining until the target time
const getTimeRemaining = () => {
  const now = new Date();
  const targetTime = getTargetDateTime();

  let remaining = targetTime.getTime() - now.getTime();
  // Ensure remaining is never negative (should reset before hitting 0)
  return Math.max(0, remaining); 
};

// Function to update digit positions based on remaining time
const updateDigits = (remainingTime) => {
  // Extract individual time components correctly
  const msTotal = remainingTime;
  const hours = Math.floor(msTotal / h);
  const minutes = Math.floor((msTotal % h) / m);
  const seconds = Math.floor((msTotal % m) / s);
  const milliseconds = msTotal % s;
  
  // For each digit element, calculate what number it should show based on type
  digitElements.forEach(({ element, type }) => {
    let digit;
    
    // Extract the correct digit based on the type
    switch (type) {
      case 'hours-tens':
        digit = Math.floor(hours / 10) % 10;
        break;
      case 'hours-ones':
        digit = hours % 10;
        break;
      case 'minutes-tens':
        digit = Math.floor(minutes / 10) % 10;
        break;
      case 'minutes-ones':
        digit = minutes % 10;
        break;
      case 'seconds-tens':
        digit = Math.floor(seconds / 10) % 10;
        break;
      case 'seconds-ones':
        digit = seconds % 10;
        break;
      case 'millis-hundreds':
        digit = Math.floor(milliseconds / 100) % 10;
        break;
      case 'millis-tens':
        digit = Math.floor(milliseconds / 10) % 10;
        break;
      default:
        digit = 0;
    }
    
    // Calculate rotation to show the correct number
    const rotateX = -digit * 36;
    
    // For millisecond digits, just set the position directly without animation
    if (type.includes('millis')) {
      utils.set(element, { rotateX });
      element._currentRotateX = rotateX;
    } 
    // For all other digits, animate only when changed
    else {
      // Animate to the position if it's changed
      const currentRotateX = element._currentRotateX || 0;
      
      if (currentRotateX !== rotateX) {
        // If the digit has changed, animate to the new position
        animate(element, {
          rotateX,
          duration: 300,
          easing: 'cubicBezier(.4,0,.2,1)'
        });
        
        // Remember the current rotation
        element._currentRotateX = rotateX;
      }
    }
  });
};

// Variable to hold the animation frame request ID
let animationFrameId = null;

// Main function to update the clock
const updateClock = () => {
  // Clear previous frame request if any
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  
  // Get current time remaining
  const remainingTime = getTimeRemaining();
  
  // Update the digit positions
  updateDigits(remainingTime);
  
  // Schedule the next update ONLY if time is remaining
  if (remainingTime > 0) {
    animationFrameId = requestAnimationFrame(updateClock);
  } else {
    // Optionally display a message when countdown ends
    console.log("Countdown finished!");
    // Stop requesting frames
    animationFrameId = null;
  }
};

// Initially hide the settings menu
$settingsMenu.classList.add('hidden');

// Toggle settings menu visibility
$settingsGear.onclick = () => {
  $settingsMenu.classList.toggle('hidden');
};

// Handle target time change
$targetTimeInput.onchange = (event) => {
  targetTimeStr = event.target.value;
  console.log('Target time changed to:', targetTimeStr);
  updateTitle(); // Update the H1 title
  // Restart the clock to apply the new target time
  updateClock(); 
};

// Start the clock
updateTitle(); // Set initial title
updateClock(); 