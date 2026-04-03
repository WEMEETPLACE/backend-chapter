import { act, fireEvent, render, screen } from "@testing-library/react";
import { SnakeGame } from "./SnakeGame";
import type { GameConfig } from "../game/snakeEngine";

const testConfig: GameConfig = {
  width: 6,
  height: 6,
  initialSnake: [
    { x: 3, y: 3 },
    { x: 2, y: 3 },
    { x: 1, y: 3 },
  ],
  initialDirection: "right",
};

describe("SnakeGame", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("starts the game and updates the score after eating food", () => {
    const randomValues = [0.58, 0];
    let index = 0;
    const random = () => randomValues[Math.min(index++, randomValues.length - 1)];

    render(<SnakeGame config={testConfig} tickMs={200} random={random} />);

    expect(screen.getByText("점수: 0")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "게임 시작" }));

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByText("점수: 1")).toBeInTheDocument();
  });

  it("shows game over and restarts the game", () => {
    render(<SnakeGame config={testConfig} tickMs={200} random={() => 0} />);

    fireEvent.click(screen.getByRole("button", { name: "게임 시작" }));

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(screen.getByText("게임 오버")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "다시 시작" }));

    expect(screen.getByText("점수: 0")).toBeInTheDocument();
    expect(screen.queryByText("게임 오버")).not.toBeInTheDocument();
  });
});
