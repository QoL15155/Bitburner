import { describe, it, expect } from "vitest";
import { uniquePathsInGrid2 } from "../../scripts/contracts/unique_paths_grid_2.js";

describe("Unique Paths in a Grid II", () => {
  it("should find 3 paths for 2x3 grid without obstacles", () => {
    expect(
      uniquePathsInGrid2([
        [0, 0, 0],
        [0, 0, 0],
      ]),
    ).toBe(3);
  });

  it("should find 3 paths for 3x2 grid without obstacles", () => {
    expect(
      uniquePathsInGrid2([
        [0, 0],
        [0, 0],
        [0, 0],
      ]),
    ).toBe(3);
  });

  it("should find 2380 paths for 14x5 grid without obstacles", () => {
    const grid = Array(14)
      .fill(null)
      .map(() => Array(5).fill(0));
    expect(uniquePathsInGrid2(grid)).toBe(2380);
  });

  it("should handle obstacle in middle", () => {
    expect(
      uniquePathsInGrid2([
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 0],
      ]),
    ).toBe(2);
  });

  it("should handle obstacle blocking one path", () => {
    expect(
      uniquePathsInGrid2([
        [0, 1],
        [0, 0],
      ]),
    ).toBe(1);
  });

  it("should handle obstacle at bottom-left", () => {
    expect(
      uniquePathsInGrid2([
        [0, 0],
        [1, 0],
      ]),
    ).toBe(1);
  });

  it("should return 0 when start is blocked", () => {
    expect(
      uniquePathsInGrid2([
        [1, 0],
        [0, 0],
      ]),
    ).toBe(0);
  });

  it("should return 0 when end is blocked", () => {
    expect(
      uniquePathsInGrid2([
        [0, 0],
        [0, 1],
      ]),
    ).toBe(0);
  });

  it("should handle complex grid with obstacles", () => {
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 0, 0, 0],
      [1, 0, 0, 0, 0],
      [0, 0, 1, 0, 0],
      [1, 0, 0, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 0, 1, 0],
      [0, 0, 0, 1, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 1],
      [0, 0, 0, 0, 0],
    ];
    expect(uniquePathsInGrid2(grid)).toBe(36);
  });

  // BUG: single-row grid with obstacle should return 0, but returns 1
  it("should return 0 for single-row grid with obstacle", () => {
    expect(uniquePathsInGrid2([[0, 1, 0]])).toBe(0);
  });

  // BUG: single-column grid with obstacle should return 0, but returns 1
  it("should return 0 for single-column grid with obstacle", () => {
    expect(uniquePathsInGrid2([[0], [1], [0]])).toBe(0);
  });

  // BUG: single-row grid without obstacles should still work
  it("should return 1 for single-row grid without obstacles", () => {
    expect(uniquePathsInGrid2([[0, 0, 0]])).toBe(1);
  });

  // BUG: single-column grid without obstacles should still work
  it("should return 1 for single-column grid without obstacles", () => {
    expect(uniquePathsInGrid2([[0], [0], [0]])).toBe(1);
  });
});
