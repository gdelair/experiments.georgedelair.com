let segments = 8;
let trailLength = 50;
let brushSize = 10;
let currentColorMode = 'rainbow';
let customColor = '#ff00ff';
let trails = [];
let isDrawing = false;
let hueOffset = 0;
let canvasSize = 'fullscreen';
let canvasWidth = 800;
let canvasHeight = 600;

function setup() {
    // Set initial canvas dimensions
    if (canvasSize === 'fullscreen') {
        canvasWidth = windowWidth;
        canvasHeight = windowHeight;
    }
    
    createCanvas(canvasWidth, canvasHeight);
    background(0);
    colorMode(HSB, 360, 100, 100, 100);
    
    // Center canvas if not fullscreen
    if (canvasSize !== 'fullscreen') {
        let canvas = document.querySelector('canvas');
        canvas.style.position = 'absolute';
        canvas.style.left = '50%';
        canvas.style.top = '50%';
        canvas.style.transform = 'translate(-50%, -50%)';
        canvas.style.border = '2px solid rgba(255, 255, 255, 0.3)';
    }
    
    // Initialize trails array properly
    trails = [];
    for (let i = 0; i < segments; i++) {
        trails[i] = [];
    }
    
    // Initialize controls
    setupControls();
}

function draw() {
    // Fade background for trail effect
    fill(0, 0, 0, 100 - trailLength);
    rect(0, 0, width, height);
    
    // Update hue for rainbow mode
    hueOffset = (hueOffset + 1) % 360;
    
    // Draw trails for each segment
    for (let i = 0; i < segments; i++) {
        drawTrail(i);
    }
    
    // Clean up old trail points
    for (let i = 0; i < segments; i++) {
        if (trails[i].length > trailLength) {
            trails[i].splice(0, trails[i].length - trailLength);
        }
    }
}

function drawTrail(segmentIndex) {
    if (trails[segmentIndex].length < 2) return;
    
    push();
    translate(width / 2, height / 2);
    rotate((TWO_PI / segments) * segmentIndex);
    
    noFill();
    strokeWeight(brushSize);
    
    for (let i = 1; i < trails[segmentIndex].length; i++) {
        let prev = trails[segmentIndex][i - 1];
        let curr = trails[segmentIndex][i];
        
        // Calculate alpha based on age
        let alpha = map(i, 0, trails[segmentIndex].length - 1, 10, 100);
        
        if (currentColorMode === 'rainbow') {
            let hue = (hueOffset + i * 5) % 360;
            stroke(hue, 80, 100, alpha);
        } else {
            let c = color(customColor);
            stroke(hue(c), saturation(c), brightness(c), alpha);
        }
        
        line(prev.x, prev.y, curr.x, curr.y);
    }
    
    pop();
}

function addPointToTrails(x, y) {
    let centerX = width / 2;
    let centerY = height / 2;
    
    // Convert to relative coordinates from center
    let relX = x - centerX;
    let relY = y - centerY;
    
    // Ensure trails array is properly initialized
    if (trails.length !== segments) {
        trails = [];
        for (let i = 0; i < segments; i++) {
            trails[i] = [];
        }
    }
    
    // Add point to each segment's trail
    for (let i = 0; i < segments; i++) {
        if (!trails[i]) {
            trails[i] = [];
        }
        
        let angle = (TWO_PI / segments) * i;
        let cos_a = cos(angle);
        let sin_a = sin(angle);
        
        // Rotate the point for this segment
        let rotatedX = relX * cos_a - relY * sin_a;
        let rotatedY = relX * sin_a + relY * cos_a;
        
        trails[i].push({ x: rotatedX, y: rotatedY });
    }
}

function mouseMoved() {
    if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
        if (isDrawing || !mouseIsPressed) {
            addPointToTrails(mouseX, mouseY);
        }
    }
}

function mouseDragged() {
    if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
        isDrawing = true;
        addPointToTrails(mouseX, mouseY);
    }
}

function mousePressed() {
    isDrawing = true;
    if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
        addPointToTrails(mouseX, mouseY);
    }
}

function mouseReleased() {
    isDrawing = false;
}

function windowResized() {
    if (canvasSize === 'fullscreen') {
        canvasWidth = windowWidth;
        canvasHeight = windowHeight;
        resizeCanvas(canvasWidth, canvasHeight);
        background(0);
    }
}

function keyPressed() {
    if (key === 'c' || key === 'C') {
        clearCanvas();
    }
    if (key === 's' || key === 'S') {
        saveCanvas('kaleidoscope', 'png');
    }
}

function clearCanvas() {
    background(0);
    for (let i = 0; i < segments; i++) {
        trails[i] = [];
    }
}

function setupControls() {
    // Segments control
    const segmentsSlider = document.getElementById('segments');
    const segmentValue = document.getElementById('segmentValue');
    segmentsSlider.addEventListener('input', function() {
        segments = parseInt(this.value);
        segmentValue.textContent = segments;
        
        // Reinitialize trails array
        trails = [];
        for (let i = 0; i < segments; i++) {
            trails[i] = [];
        }
    });
    
    // Trail length control
    const trailSlider = document.getElementById('trailLength');
    const trailValue = document.getElementById('trailValue');
    trailSlider.addEventListener('input', function() {
        trailLength = parseInt(this.value);
        trailValue.textContent = trailLength;
    });
    
    // Brush size control
    const brushSlider = document.getElementById('brushSize');
    const brushValue = document.getElementById('brushValue');
    brushSlider.addEventListener('input', function() {
        brushSize = parseInt(this.value);
        brushValue.textContent = brushSize;
    });
    
    // Color mode controls
    const rainbowBtn = document.getElementById('rainbow');
    const customBtn = document.getElementById('custom');
    const colorPicker = document.getElementById('colorPicker');
    
    rainbowBtn.addEventListener('click', function() {
        currentColorMode = 'rainbow';
        rainbowBtn.classList.add('active');
        customBtn.classList.remove('active');
        colorPicker.style.display = 'none';
    });
    
    customBtn.addEventListener('click', function() {
        currentColorMode = 'custom';
        customBtn.classList.add('active');
        rainbowBtn.classList.remove('active');
        colorPicker.style.display = 'inline';
    });
    
    colorPicker.addEventListener('input', function() {
        customColor = this.value;
    });
    
    // Canvas size controls
    const fullscreenBtn = document.getElementById('fullscreen');
    const size2160Btn = document.getElementById('size2160');
    const size1080Btn = document.getElementById('size1080');
    
    fullscreenBtn.addEventListener('click', function() {
        setCanvasSize('fullscreen', windowWidth, windowHeight);
        updateCanvasSizeButtons('fullscreen');
    });
    
    size2160Btn.addEventListener('click', function() {
        setCanvasSize('2160x2160', 2160, 2160);
        updateCanvasSizeButtons('2160x2160');
    });
    
    size1080Btn.addEventListener('click', function() {
        setCanvasSize('1080x1080', 1080, 1080);
        updateCanvasSizeButtons('1080x1080');
    });
    
    // Clear canvas button
    document.getElementById('clearCanvas').addEventListener('click', clearCanvas);
    
    // Save image button
    document.getElementById('saveImage').addEventListener('click', function() {
        saveCanvas('kaleidoscope', 'png');
    });
}

function setCanvasSize(size, width, height) {
    canvasSize = size;
    canvasWidth = width;
    canvasHeight = height;
    
    // Remove existing canvas
    let existingCanvas = document.querySelector('canvas');
    if (existingCanvas) {
        existingCanvas.remove();
    }
    
    // Create new canvas with new dimensions
    createCanvas(canvasWidth, canvasHeight);
    background(0);
    
    // Style canvas based on size
    let canvas = document.querySelector('canvas');
    if (canvasSize === 'fullscreen') {
        canvas.style.position = 'static';
        canvas.style.left = 'auto';
        canvas.style.top = 'auto';
        canvas.style.transform = 'none';
        canvas.style.border = 'none';
    } else {
        canvas.style.position = 'absolute';
        canvas.style.left = '50%';
        canvas.style.top = '50%';
        canvas.style.transform = 'translate(-50%, -50%)';
        canvas.style.border = '2px solid rgba(255, 255, 255, 0.3)';
        canvas.style.zIndex = '1';
    }
    
    // Clear trails when changing canvas size
    clearCanvas();
}

function updateCanvasSizeButtons(activeSize) {
    document.getElementById('fullscreen').classList.remove('active');
    document.getElementById('size2160').classList.remove('active');
    document.getElementById('size1080').classList.remove('active');
    
    if (activeSize === 'fullscreen') {
        document.getElementById('fullscreen').classList.add('active');
    } else if (activeSize === '2160x2160') {
        document.getElementById('size2160').classList.add('active');
    } else if (activeSize === '1080x1080') {
        document.getElementById('size1080').classList.add('active');
    }
} 