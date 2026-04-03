export type Direction = "up" | "down" | "left" | "right";
export type GameStatus = "idle" | "running" | "gameOver";

export interface Position {
  x: number;
  y: number;
}

export interface GameConfig {
  width: number;
  height: number;
  initialSnake: Position[];
  initialDirection: Direction;
}

export interface GameState {
  snake: Position[];
  direction: Direction;
  queuedDirection: Direction;
  food: Position;
  score: number;
  status: GameStatus;
}

const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

function positionsEqual(a: Position, b: Position) {
  return a.x === b.x && a.y === b.y;
}

function nextHeadPosition(head: Position, direction: Direction): Position {
  switch (direction) {
    case "up":
      return { x: head.x, y: head.y - 1 };
    case "down":
      return { x: head.x, y: head.y + 1 };
    case "left":
      return { x: head.x - 1, y: head.y };
    case "right":
      return { x: head.x + 1, y: head.y };
  }
}

function isInsideBoard(position: Position, config: GameConfig) {
  return (
    position.x >= 0 &&
    position.x < config.width &&
    position.y >= 0 &&
    position.y < config.height
  );
}

function createFood(
  snake: Position[],
  config: GameConfig,
  random: () => number,
): Position {
  const freeCells: Position[] = [];

  for (let y = 0; y < config.height; y += 1) {
    for (let x = 0; x < config.width; x += 1) {
      const candidate = { x, y };

      if (!snake.some((segment) => positionsEqual(segment, candidate))) {
        freeCells.push(candidate);
      }
    }
  }

  if (freeCells.length === 0) {
    return snake[0];
  }

  const index = Math.min(
    freeCells.length - 1,
    Math.floor(random() * freeCells.length),
  );

  return freeCells[index];
}

export function createInitialState(
  config: GameConfig,
  random: () => number = Math.random,
): GameState {
  return {
    snake: config.initialSnake,
    direction: config.initialDirection,
    queuedDirection: config.initialDirection,
    food: createFood(config.initialSnake, config, random),
    score: 0,
    status: "idle",
  };
}

export function startGame(state: GameState): GameState {
  if (state.status !== "idle") {
    return state;
  }

  return { ...state, status: "running" };
}

export function restartGame(
  config: GameConfig,
  random: () => number = Math.random,
): GameState {
  return createInitialState(config, random);
}

export function setDirection(state: GameState, direction: Direction): GameState {
  if (state.status === "gameOver") {
    return state;
  }

  const baseDirection =
    state.status === "running" ? state.queuedDirection : state.direction;

  if (direction === baseDirection || direction === OPPOSITE_DIRECTION[baseDirection]) {
    return state;
  }

  return { ...state, queuedDirection: direction };
}

export function tick(
  state: GameState,
  config: GameConfig,
  random: () => number = Math.random,
): GameState {
  if (state.status !== "running") {
    return state;
  }

  const direction = state.queuedDirection;
  const nextHead = nextHeadPosition(state.snake[0], direction);
  const isEatingFood = positionsEqual(nextHead, state.food);
  const nextSnake = isEatingFood
    ? [nextHead, ...state.snake]
    : [nextHead, ...state.snake.slice(0, -1)];

  const hitsWall = !isInsideBoard(nextHead, config);
  const hitsSelf = nextSnake.slice(1).some((segment) => positionsEqual(segment, nextHead));

  if (hitsWall || hitsSelf) {
    return {
      ...state,
      direction,
      queuedDirection: direction,
      status: "gameOver",
    };
  }

  return {
    snake: nextSnake,
    direction,
    queuedDirection: direction,
    food: isEatingFood ? createFood(nextSnake, config, random) : state.food,
    score: isEatingFood ? state.score + 1 : state.score,
    status: "running",
  };
}
