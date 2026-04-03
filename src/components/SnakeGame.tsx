import { useEffect, useRef, useState } from "react";
import {
  createInitialState,
  restartGame,
  setDirection,
  startGame,
  tick,
  type Direction,
  type GameConfig,
  type GameState,
} from "../game/snakeEngine";

const CELL_SIZE = 28;
const DEFAULT_TICK_MS = 180;

const DEFAULT_CONFIG: GameConfig = {
  width: 12,
  height: 12,
  initialSnake: [
    { x: 5, y: 5 },
    { x: 4, y: 5 },
    { x: 3, y: 5 },
  ],
  initialDirection: "right",
};

const KEYBOARD_DIRECTION_MAP: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  W: "up",
  s: "down",
  S: "down",
  a: "left",
  A: "left",
  d: "right",
  D: "right",
};

interface SnakeGameProps {
  config?: GameConfig;
  tickMs?: number;
  random?: () => number;
}

function drawBoard(canvas: HTMLCanvasElement, state: GameState, config: GameConfig) {
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#102820";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = "rgba(245, 239, 230, 0.08)";
  for (let x = 0; x <= config.width; x += 1) {
    context.beginPath();
    context.moveTo(x * CELL_SIZE, 0);
    context.lineTo(x * CELL_SIZE, canvas.height);
    context.stroke();
  }
  for (let y = 0; y <= config.height; y += 1) {
    context.beginPath();
    context.moveTo(0, y * CELL_SIZE);
    context.lineTo(canvas.width, y * CELL_SIZE);
    context.stroke();
  }

  context.fillStyle = "#f2aa4c";
  context.fillRect(
    state.food.x * CELL_SIZE + 5,
    state.food.y * CELL_SIZE + 5,
    CELL_SIZE - 10,
    CELL_SIZE - 10,
  );

  state.snake.forEach((segment, index) => {
    context.fillStyle = index === 0 ? "#f5efe6" : "#7bd389";
    context.fillRect(
      segment.x * CELL_SIZE + 2,
      segment.y * CELL_SIZE + 2,
      CELL_SIZE - 4,
      CELL_SIZE - 4,
    );
  });
}

export function SnakeGame({
  config = DEFAULT_CONFIG,
  tickMs = DEFAULT_TICK_MS,
  random = Math.random,
}: SnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [state, setState] = useState(() => createInitialState(config, random));

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const direction = KEYBOARD_DIRECTION_MAP[event.key];

      if (!direction) {
        return;
      }

      setState((current) => setDirection(current, direction));
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (state.status !== "running") {
      return;
    }

    const intervalId = window.setInterval(() => {
      setState((current) => tick(current, config, random));
    }, tickMs);

    return () => window.clearInterval(intervalId);
  }, [config, random, state.status, tickMs]);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    drawBoard(canvasRef.current, state, config);
  }, [config, state]);

  const handlePrimaryAction = () => {
    if (state.status === "idle") {
      setState((current) => startGame(current));
      return;
    }

    if (state.status === "gameOver") {
      setState(restartGame(config, random));
    }
  };

  const buttonLabel =
    state.status === "idle"
      ? "게임 시작"
      : state.status === "gameOver"
        ? "다시 시작"
        : "진행 중";

  return (
    <main className="app-shell">
      <section className="game-panel">
        <div className="hud">
          <div>
            <p className="eyebrow">TypeScript Snake</p>
            <h1>Snake Game</h1>
          </div>
          <div className="score-card">
            <span>점수: {state.score}</span>
            <span>상태: {state.status === "gameOver" ? "종료" : state.status === "running" ? "플레이 중" : "대기"}</span>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={config.width * CELL_SIZE}
          height={config.height * CELL_SIZE}
          aria-label="snake game board"
          className="game-canvas"
        />

        <div className="controls">
          <button type="button" onClick={handlePrimaryAction} disabled={state.status === "running"}>
            {buttonLabel}
          </button>
          <p>방향키 또는 WASD로 조작</p>
        </div>

        {state.status === "gameOver" ? <p className="game-over">게임 오버</p> : null}
      </section>
    </main>
  );
}
