/**
 * Snake Game Logic
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const currentScoreEl = document.getElementById('currentScore');
const bestScoreEl = document.getElementById('bestScore');
const overlay = document.getElementById('overlay');
const restartBtn = document.getElementById('restartBtn');
const overlayText = document.getElementById('overlayText');

// Game Constants
const GRID_SIZE = 20;
const TILE_COUNT = canvas.width / GRID_SIZE;
const INITIAL_SPEED = 120; // ms

const SKINS = {
    default: { head: '#e94560', body: '#0f3460' },
    emerald: { head: '#4ecca3', body: '#1a535c' },
    gold: { head: '#f0a500', body: '#334756' },
    neon: { head: '#00fff5', body: '#222831' }
};

// Skin selection elements
const skinBtns = document.querySelectorAll('.skin-btn');
let currentSkin = localStorage.getItem('snakeSkin') || 'default';

// Set active skin button initially
skinBtns.forEach(btn => {
    if (btn.dataset.skin === currentSkin) btn.classList.add('active');
});

// Game State
let snake = [];
let food = { x: 5, y: 5 };
let direction = { x: 0, y: 0 };
let nextDirection = { x: 0, y: 0 };
let score = 0;
let bestScore = localStorage.getItem('snakeBestScore') || 0;
let gameLoopId = null;
let lastUpdateTime = 0;
let currentSpeed = INITIAL_SPEED;

function init() {
    snake = [
        { x: 10, y: 10 },
        { x: 10, y: 11 },
        { x: 10, y: 12 }
    ];
    direction = { x: 0, y: -1 };
    nextDirection = { x: 0, y: -1 };
    score = 0;
    currentSpeed = INITIAL_SPEED;
    currentScoreEl.textContent = score;
    bestScoreEl.textContent = bestScore;
    spawnFood();
    overlay.classList.add('hidden');
    lastUpdateTime = 0;
    
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    gameLoopId = requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
    gameLoopId = requestAnimationFrame(gameLoop);
    
    const deltaTime = timestamp - lastUpdateTime;
    if (deltaTime < currentSpeed) return;
    
    lastUpdateTime = timestamp;
    update();
    draw();
}

function update() {
    direction = nextDirection;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    // 1. Collision Detection (Walls)
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
        return gameOver();
    }

    // 2. Collision Detection (Self)
    if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        return gameOver();
    }

    snake.unshift(head);

    // 3. Food Consumption
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        currentScoreEl.textContent = score;
        // 점수가 오를수록 속도 증가 (최소 50ms까지)
        currentSpeed = Math.max(50, INITIAL_SPEED - Math.floor(score / 50) * 5);
        spawnFood();
    } else {
        snake.pop();
    }
}

function draw() {
    // Clear Canvas
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Food
    ctx.fillStyle = '#4ecca3';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#4ecca3';
    ctx.fillRect(food.x * GRID_SIZE + 2, food.y * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4);
    ctx.shadowBlur = 0;

    // Draw Snake
    snake.forEach((segment, index) => {
        const skin = SKINS[currentSkin];
        ctx.fillStyle = index === 0 ? skin.head : skin.body;
        ctx.strokeStyle = '#16213e';
        const x = segment.x * GRID_SIZE;
        const y = segment.y * GRID_SIZE;
        
        ctx.fillRect(x + 1, y + 1, GRID_SIZE - 2, GRID_SIZE - 2);
        ctx.strokeRect(x + 1, y + 1, GRID_SIZE - 2, GRID_SIZE - 2);
    });
}

function spawnFood() {
    food = {
        x: Math.floor(Math.random() * TILE_COUNT),
        y: Math.floor(Math.random() * TILE_COUNT)
    };
    // Ensure food doesn't spawn on snake body
    if (snake.some(s => s.x === food.x && s.y === food.y)) {
        spawnFood();
    }
}

function gameOver() {
    cancelAnimationFrame(gameLoopId);
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('snakeBestScore', bestScore);
    }
    overlayText.textContent = "GAME OVER";
    overlay.classList.remove('hidden');
}

function handleInput(e) {
    const key = e.key;
    const goingUp = direction.y === -1;
    const goingDown = direction.y === 1;
    const goingRight = direction.x === 1;
    const goingLeft = direction.x === -1;

    if ((key === 'ArrowUp' || key === 'w') && !goingDown) {
        nextDirection = { x: 0, y: -1 };
    } else if ((key === 'ArrowDown' || key === 's') && !goingUp) {
        nextDirection = { x: 0, y: 1 };
    } else if ((key === 'ArrowLeft' || key === 'a') && !goingRight) {
        nextDirection = { x: -1, y: 0 };
    } else if ((key === 'ArrowRight' || key === 'd') && !goingLeft) {
        nextDirection = { x: 1, y: 0 };
    }
}

// Skin selection handler
skinBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        skinBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSkin = btn.dataset.skin;
        localStorage.setItem('snakeSkin', currentSkin);
        if (gameLoopId === null) draw(); // Redraw if game hasn't started
    });
});

// Mobile control event listeners
const setupMobileControls = () => {
    const controls = {
        'ctrlUp': 'ArrowUp',
        'ctrlDown': 'ArrowDown',
        'ctrlLeft': 'ArrowLeft',
        'ctrlRight': 'ArrowRight'
    };

    Object.entries(controls).forEach(([id, key]) => {
        const btn = document.getElementById(id);
        const triggerInput = (e) => {
            e.preventDefault();
            handleInput({ key });
        };
        btn.addEventListener('touchstart', triggerInput, { passive: false });
        btn.addEventListener('mousedown', triggerInput);
    });
};

// Event Listeners
window.addEventListener('keydown', handleInput);
restartBtn.addEventListener('click', init);
setupMobileControls();

// Initial Screen Setup
ctx.fillStyle = '#16213e';
ctx.fillRect(0, 0, canvas.width, canvas.height);
currentScoreEl.textContent = score;
bestScoreEl.textContent = bestScore;

// Prevent scrolling with arrows
window.addEventListener("keydown", (e) => {
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code) > -1) e.preventDefault();
}, false);