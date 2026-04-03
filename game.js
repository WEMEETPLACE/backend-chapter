const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const stateEl = document.getElementById('state');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const boardSizeSelect = document.getElementById('boardSize');
const skinSelect = document.getElementById('skinSelect');
const speedSelect = document.getElementById('speed');

const SNAKE_HEAD = { x: 0, y: 0 };
const DIR = { ArrowUp: {x:0,y:-1}, ArrowDown: {x:0,y:1}, ArrowLeft: {x:-1,y:0}, ArrowRight: {x:1,y:0} };

const SKINS = {
  classic: { bg: '#32b57e', head: '#d2db4f', eye: '#0a1d12', accent: '#26a080' },
  neon: { bg: '#a8fffc', head: '#00ffcc', eye: '#001e3f', accent: '#6efcff' },
  forest: { bg: '#597e5f', head: '#bfd4a4', eye: '#1c3122', accent: '#87ab71' },
  sunset: { bg: '#ff9f56', head: '#ffdf5e', eye: '#522f08', accent: '#ffb119' },
  ice: { bg: '#7cd2ea', head: '#d2f1fd', eye: '#0b3f57', accent: '#74e2ff' },
};
let currentSkin = SKINS.classic;

let boardSize = Number(boardSizeSelect.value);
let cellSize = canvas.width / boardSize;
let snake = [];
let direction = DIR.ArrowRight;
let queuedDirection = direction;
let apple = null;
let score = 0;
let highScore = Number(localStorage.getItem('snakeHighScore') || 0);
let gameState = 'READY';
let intervalId = null;
let speedLevel = 1; // 시작 속도 레벨 1
const BASE_DELAY = 300; // 1일 때 대기시간(밀리초)
const SPEED_STEP = 18; // 레벨업 시 감소 속도
const MIN_DELAY = 40;

function getDelayFromSpeedLevel() {
  return Math.max(MIN_DELAY, BASE_DELAY - (speedLevel - 1) * SPEED_STEP);
}

function setState(s) {
  gameState = s;
  stateEl.textContent = s;
}

function startInterval() {
  if (intervalId) {
    clearInterval(intervalId);
  }
  intervalId = setInterval(tick, getDelayFromSpeedLevel());
}

function resize() {
  boardSize = Number(boardSizeSelect.value);
  cellSize = canvas.width / boardSize;
}

function randomPos() {
  return {
    x: Math.floor(Math.random() * (boardSize - 2)) + 1,
    y: Math.floor(Math.random() * (boardSize - 2)) + 1,
  };
}

function spawnApple() {
  const occupied = new Set(snake.map(p => `${p.x}|${p.y}`));
  const free = [];
  for (let y = 1; y < boardSize - 1; y++) {
    for (let x = 1; x < boardSize - 1; x++) {
      if (!occupied.has(`${x}|${y}`)) free.push({x,y});
    }
  }
  if (!free.length) {
    apple = null;
    return;
  }
  apple = free[Math.floor(Math.random() * free.length)];
}

function resetGame() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  resize();
  snake = [];
  const center = Math.floor(boardSize / 2);
  snake.push({x: center - 1, y: center});
  snake.push({x: center, y: center});
  direction = DIR.ArrowRight;
  queuedDirection = direction;
  speedLevel = 1;
  currentSkin = SKINS[skinSelect.value] || SKINS.classic;
  score = 0;
  scoreEl.textContent = score;
  highScoreEl.textContent = highScore;
  spawnApple();
  setState('READY');
  draw();
}

function startGame() {
  if (gameState === 'RUNNING') return;
  if (gameState === 'GAME_OVER' || gameState === 'WIN' || gameState === 'READY') {
    setState('RUNNING');
    startInterval();
  }
}

function endGame(reason) {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  setState(reason);
  highScore = Math.max(highScore, score);
  localStorage.setItem('snakeHighScore', String(highScore));
  highScoreEl.textContent = highScore;
}

function checkCollision(point) {
  if (point.x <= 0 || point.x >= boardSize - 1 || point.y <= 0 || point.y >= boardSize - 1) return true;
  for (let i = 0; i < snake.length; i++) {
    if (snake[i].x === point.x && snake[i].y === point.y) return true;
  }
  return false;
}

function tick() {
  if (gameState !== 'RUNNING') return;

  if (queuedDirection.x + direction.x !== 0 || queuedDirection.y + direction.y !== 0) {
    direction = queuedDirection;
  }

  const head = snake[snake.length - 1];
  const next = {x: head.x + direction.x, y: head.y + direction.y};

  if (checkCollision(next)) {
    endGame('GAME_OVER');
    draw();
    return;
  }

  snake.push(next);

  if (apple && next.x === apple.x && next.y === apple.y) {
    score += 1;
    scoreEl.textContent = score;
    speedLevel += 1;
    spawnApple();
    startInterval();
    if (snake.length === (boardSize - 2) * (boardSize - 2)) {
      endGame('WIN');
      draw();
      return;
    }
  } else {
    snake.shift();
  }

  draw();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#122232';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // walls
  ctx.fillStyle = '#7a8f9f';
  ctx.fillRect(0, 0, canvas.width, cellSize);
  ctx.fillRect(0, canvas.height - cellSize, canvas.width, cellSize);
  ctx.fillRect(0, 0, cellSize, canvas.height);
  ctx.fillRect(canvas.width - cellSize, 0, cellSize, canvas.height);

  // apple
  if (apple) {
    ctx.fillStyle = '#f44';
    ctx.fillRect(apple.x * cellSize, apple.y * cellSize, cellSize, cellSize);
  }

  // snake body (rounded segments)
  for (let i = 0; i < snake.length - 1; i++) {
    const p = snake[i];
    const cx = p.x * cellSize + cellSize / 2;
    const cy = p.y * cellSize + cellSize / 2;
    const radius = cellSize * 0.45;

    const grd = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius);
    grd.addColorStop(0, currentSkin.head);
    grd.addColorStop(1, currentSkin.bg);

    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = currentSkin.accent;
    ctx.lineWidth = Math.max(1, cellSize * 0.08);
    ctx.stroke();
  }

  // snake head (special style)
  const head = snake[snake.length - 1];
  const hcx = head.x * cellSize + cellSize / 2;
  const hcy = head.y * cellSize + cellSize / 2;
  const headRadius = cellSize * 0.47;

  ctx.fillStyle = currentSkin.head;
  ctx.beginPath();
  ctx.arc(hcx, hcy, headRadius, 0, Math.PI * 2);
  ctx.fill();

  // eyes
  const eyeR = cellSize * 0.08;
  const eyeOffsetX = Math.sign(direction.x) * cellSize * 0.15;
  const eyeOffsetY = Math.sign(direction.y) * cellSize * 0.15;

  ctx.fillStyle = currentSkin.eye;
  ctx.beginPath();
  ctx.arc(hcx - eyeOffsetY - Math.abs(eyeOffsetX), hcy - eyeOffsetX - Math.abs(eyeOffsetY), eyeR, 0, Math.PI * 2);
  ctx.arc(hcx + eyeOffsetY + Math.abs(eyeOffsetX), hcy + eyeOffsetX + Math.abs(eyeOffsetY), eyeR, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = currentSkin.accent;
  ctx.lineWidth = Math.max(1, cellSize * 0.06);
  ctx.stroke();

  if (gameState === 'GAME_OVER' || gameState === 'WIN') {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(gameState === 'WIN' ? 'YOU WIN!' : 'GAME OVER', canvas.width / 2, canvas.height / 2 - 14);
    ctx.font = '20px Arial';
    ctx.fillText(`Score ${score} | High ${highScore}`, canvas.width / 2, canvas.height / 2 + 24);
    ctx.fillText('Press Start to play again', canvas.width / 2, canvas.height / 2 + 56);
  }
}

window.addEventListener('keydown', (event) => {
  const dir = DIR[event.key];
  if (!dir) return;
  event.preventDefault();
  if (gameState === 'READY') startGame();
  if (gameState !== 'RUNNING') return;
  queuedDirection = dir;
});

startBtn.addEventListener('click', () => startGame());
resetBtn.addEventListener('click', () => resetGame());
boardSizeSelect.addEventListener('change', resetGame);
skinSelect.addEventListener('change', () => {
  currentSkin = SKINS[skinSelect.value] || SKINS.classic;
  draw();
});
speedSelect.addEventListener('change', () => {
  if (gameState === 'RUNNING') {
    startInterval();
  }
});

resetGame();
