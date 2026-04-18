import { describe, it, expect } from "vitest";
import { triangleMinimumPathSum } from "../../contracts/minimum_path_sum_triangle.js";

describe("Minimum Path Sum in a Triangle", () => {
  it("should find minimum path sum for example triangle", () => {
    const triangle = [[2], [3, 4], [6, 5, 7], [4, 1, 8, 3]];
    expect(triangleMinimumPathSum(triangle)).toBe(11);
  });

  it("should find minimum path sum for larger triangle", () => {
    const triangle = [[5], [8, 6], [8, 5, 8], [2, 2, 3, 3], [2, 4, 8, 4, 2]];
    expect(triangleMinimumPathSum(triangle)).toBe(22);
  });

  it("should handle single element triangle", () => {
    expect(triangleMinimumPathSum([[42]])).toBe(42);
  });

  it("should handle two-row triangle", () => {
    expect(triangleMinimumPathSum([[1], [2, 3]])).toBe(3);
  });

  it("should prefer right path when cheaper", () => {
    const triangle = [[1], [100, 2], [100, 100, 3]];
    expect(triangleMinimumPathSum(triangle)).toBe(6);
  });
});
