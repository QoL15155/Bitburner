import { describe, it, expect } from "vitest";
import { mergeOverlappingIntervals } from "../../scripts/contracts/merge_overlapping_intervals.js";

describe("Merge Overlapping Intervals", () => {
  it("should merge overlapping intervals", () => {
    const input = [
      [1, 3],
      [8, 10],
      [2, 6],
      [10, 16],
    ];
    expect(mergeOverlappingIntervals(input)).toEqual([
      [1, 6],
      [8, 16],
    ]);
  });

  it("should merge all intervals into one", () => {
    const input = [
      [24, 29],
      [19, 26],
      [19, 20],
      [2, 10],
      [15, 19],
      [13, 22],
      [14, 24],
      [1, 7],
      [4, 8],
      [6, 15],
    ];
    expect(mergeOverlappingIntervals(input)).toEqual([[1, 29]]);
  });

  it("should handle already sorted non-overlapping", () => {
    const input = [
      [1, 2],
      [5, 6],
      [9, 10],
    ];
    expect(mergeOverlappingIntervals(input)).toEqual([
      [1, 2],
      [5, 6],
      [9, 10],
    ]);
  });

  it("should handle single interval", () => {
    expect(mergeOverlappingIntervals([[1, 5]])).toEqual([[1, 5]]);
  });

  it("should handle empty array", () => {
    expect(mergeOverlappingIntervals([])).toEqual([]);
  });

  it("should handle adjacent but not overlapping intervals", () => {
    // [1,3] and [4,6] don't overlap (3 < 4)
    expect(
      mergeOverlappingIntervals([
        [1, 3],
        [4, 6],
      ]),
    ).toEqual([
      [1, 3],
      [4, 6],
    ]);
  });

  it("should handle touching intervals", () => {
    // [1,3] and [3,6] overlap at point 3
    expect(
      mergeOverlappingIntervals([
        [1, 3],
        [3, 6],
      ]),
    ).toEqual([[1, 6]]);
  });

  it("should handle contained intervals", () => {
    // [1,10] contains [3,5]
    expect(
      mergeOverlappingIntervals([
        [1, 10],
        [3, 5],
      ]),
    ).toEqual([[1, 10]]);
  });
});
