import {
  createInitialState,
  restartGame,
  setDirection,
  startGame,
  tick,
  type GameConfig,
} from "./snakeEngine";

const config: GameConfig = {
  width: 8,
  height: 8,
  initialSnake: [
    { x: 3, y: 3 },
    { x: 2, y: 3 },
    { x: 1, y: 3 },
  ],
  initialDirection: "right",
};

describe("snakeEngine", () => {
  it("creates the initial snake and food state", () => {
    const state = createInitialState(config, () => 0);

    expect(state.status).toBe("idle");
    expect(state.score).toBe(0);
    expect(state.snake).toEqual(config.initialSnake);
    expect(state.food).toEqual({ x: 0, y: 0 });
  });

  it("moves one tile in the current direction for each tick", () => {
    const initial = startGame(createInitialState(config, () => 0.4));

    const next = tick(initial, config, () => 0.4);

    expect(next.snake).toEqual([
      { x: 4, y: 3 },
      { x: 3, y: 3 },
      { x: 2, y: 3 },
    ]);
  });

  it("rejects an immediate reverse direction input", () => {
    const initial = startGame(createInitialState(config, () => 0.4));

    const updated = setDirection(initial, "left");
    const next = tick(updated, config, () => 0.4);

    expect(next.direction).toBe("right");
    expect(next.snake[0]).toEqual({ x: 4, y: 3 });
  });

  it("applies a valid direction change on the next tick", () => {
    const initial = startGame(createInitialState(config, () => 0.4));

    const updated = setDirection(initial, "up");
    const next = tick(updated, config, () => 0.4);

    expect(next.direction).toBe("up");
    expect(next.snake[0]).toEqual({ x: 3, y: 2 });
  });

  it("grows and scores when the snake eats food", () => {
    const initial = startGame({
      ...createInitialState(config, () => 0.4),
      food: { x: 4, y: 3 },
    });

    const next = tick(initial, config, () => 0);

    expect(next.score).toBe(1);
    expect(next.snake).toEqual([
      { x: 4, y: 3 },
      { x: 3, y: 3 },
      { x: 2, y: 3 },
      { x: 1, y: 3 },
    ]);
    expect(next.food).not.toEqual({ x: 4, y: 3 });
    expect(next.snake).not.toContainEqual(next.food);
  });

  it("ends the game when the snake hits a wall", () => {
    const wallConfig: GameConfig = {
      ...config,
      initialSnake: [
        { x: 7, y: 2 },
        { x: 6, y: 2 },
        { x: 5, y: 2 },
      ],
    };

    const initial = startGame(createInitialState(wallConfig, () => 0));
    const next = tick(initial, wallConfig, () => 0);

    expect(next.status).toBe("gameOver");
  });

  it("ends the game when the snake hits itself", () => {
    const selfCollisionState = startGame({
      ...createInitialState(config, () => 0),
      snake: [
        { x: 3, y: 3 },
        { x: 3, y: 4 },
        { x: 2, y: 4 },
        { x: 2, y: 3 },
      ],
      direction: "right",
      queuedDirection: "down",
      food: { x: 0, y: 0 },
    });

    const next = tick(selfCollisionState, config, () => 0);

    expect(next.status).toBe("gameOver");
  });

  it("stops movement after game over", () => {
    const wallConfig: GameConfig = {
      ...config,
      initialSnake: [
        { x: 7, y: 2 },
        { x: 6, y: 2 },
        { x: 5, y: 2 },
      ],
    };

    const gameOver = tick(startGame(createInitialState(wallConfig, () => 0)), wallConfig, () => 0);
    const next = tick(gameOver, wallConfig, () => 0);

    expect(next).toEqual(gameOver);
  });

  it("restarts to the initial state", () => {
    const restarted = restartGame(config, () => 0);

    expect(restarted).toEqual(createInitialState(config, () => 0));
  });
});
