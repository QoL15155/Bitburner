import { describe, it, expect } from "vitest";
import { arrayJumpingGame } from "../../scripts/contracts/array_jumping_game.js";

describe("Array Jumping Game", () => {
  it("should return 1 when reachable", () => {
    expect(
      arrayJumpingGame([
        9, 10, 7, 0, 2, 6, 8, 8, 3, 0, 10, 8, 3, 0, 0, 6, 4, 8, 8, 7, 4, 10,
      ]),
    ).toBe(1);
  });

  it("should return 0 when blocked by zero", () => {
    expect(arrayJumpingGame([1, 0, 1])).toBe(0);
  });

  it("should return 1 for single element", () => {
    expect(arrayJumpingGame([0])).toBe(1);
  });

  it("should return 1 when first jump covers entire array", () => {
    expect(arrayJumpingGame([10, 0, 0, 0, 0])).toBe(1);
  });

  it("should return 0 when stuck at zeros", () => {
    expect(arrayJumpingGame([3, 2, 1, 0, 4])).toBe(0);
  });

  it("should handle exact reach to last index", () => {
    expect(arrayJumpingGame([1, 1, 1, 1])).toBe(1);
  });

  it("should return 1 for two elements with non-zero start", () => {
    expect(arrayJumpingGame([1, 0])).toBe(1);
  });

  it("should return 0 for [0, 1]", () => {
    expect(arrayJumpingGame([0, 1])).toBe(0);
  });
});
