/** 
Unique Paths in a Grid I

You are in a grid with 5 rows and 14 columns, and you are positioned in the top-left corner of that grid.
You are trying to reach the bottom-right corner of the grid, but you can only move down or right on each step.
Determine how many unique paths there are from start to finish.

NOTE: The data returned for this contract is an array with the number of rows and columns:

[5, 14]
*/

export function uniquePathsInGrid(gridSize) {
  const [rows, cols] = gridSize;

  if (rows <= 0 || cols <= 0) {
    return 0;
  }

  if (rows == 1 || cols == 1) {
    return 1;
  }

  let result = 0;
  for (let i = 0; i < rows; i++) {
    result += uniquePathsInGrid([i + 1, cols - 1]);
  }
  return result;
}

/** @param {NS} ns */
export async function main(ns) {
  test();
  function test() {
    if (uniquePathsInGrid([5, 14]) !== 2380) {
      ns.alert(
        `Test failed for uniquePathsInGrid. Expected [5,14]==2380, but got ${uniquePathsInGrid([5, 14])}`,
      );
    }
    if (uniquePathsInGrid([2, 3]) !== 3) {
      ns.alert(
        `Test failed for uniquePathsInGrid. Expected [2,3]==3, but got ${uniquePathsInGrid([2, 3])}`,
      );
    }
  }
}
