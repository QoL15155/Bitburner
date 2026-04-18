import { describe, it, expect } from "vitest";
import { uniquePathsInGrid1 } from "../../contracts/unique_paths_grid_1.js";

describe("Unique Paths in a Grid I", () => {
  it("should find 3 paths for 2x3 grid", () => {
    expect(uniquePathsInGrid1([2, 3])).toBe(3);
  });

  it("should find 2380 paths for 5x14 grid", () => {
    expect(uniquePathsInGrid1([5, 14])).toBe(2380);
  });

  it("should return 1 for 1x1 grid", () => {
    expect(uniquePathsInGrid1([1, 1])).toBe(1);
  });

  it("should return 1 for single row", () => {
    expect(uniquePathsInGrid1([1, 10])).toBe(1);
  });

  it("should return 1 for single column", () => {
    expect(uniquePathsInGrid1([10, 1])).toBe(1);
  });

  it("should return 0 for zero dimensions", () => {
    expect(uniquePathsInGrid1([0, 5])).toBe(0);
  });

  it("should find 6 paths for 3x3 grid", () => {
    expect(uniquePathsInGrid1([3, 3])).toBe(6);
  });

  it("should find 2 paths for 2x2 grid", () => {
    expect(uniquePathsInGrid1([2, 2])).toBe(2);
  });
});
