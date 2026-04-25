/**
 * Minimum Path Sum in a Triangle

Given a triangle, find the minimum path sum from top to bottom.
Each step you may move to adjacent numbers on the row below.
For example, given the following triangle

[
     [2],
    [3,4],
   [6,5,7],
  [4,1,8,3]
]
The minimum path sum from top to bottom is 11 (i.e., 2 + 3 + 5 + 1 = 11).
 */

export function triangleMinimumPathSum(triangle, row = 0, col = 0) {
  if (row == triangle.length - 1) {
    return triangle[row][col];
  }

  const leftPath = triangleMinimumPathSum(triangle, row + 1, col);
  const rightPath = triangleMinimumPathSum(triangle, row + 1, col + 1);

  return triangle[row][col] + Math.min(leftPath, rightPath);
}

/** @param {NS} ns */
export async function main(ns) {}
