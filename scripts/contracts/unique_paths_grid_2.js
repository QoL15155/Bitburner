/** 
Unique Paths in a Grid II

You are located in the top-left corner of the following grid:

0,0,0,0,0,
0,0,0,0,1,
0,0,0,0,1,
1,0,0,0,0,
1,0,0,0,0,
0,1,0,0,0,
0,0,0,0,0,
0,0,0,0,0,
0,0,0,1,0,

You are trying reach the bottom-right corner of the grid, but you can only move down or right on each step. 
Furthermore, there are obstacles on the grid  you cannot move onto.
These obstacles are denoted by '1', while empty spaces are denoted by 0.

Determine how many unique paths there are from start to finish.

NOTE: The data returned for this contract is an 2D array of numbers representing the grid.

*/

export function uniquePathsInGrid2(obstacleGrid) {
  const [totalRows, totalColumns] = [
    obstacleGrid.length,
    obstacleGrid[0].length,
  ];

  if (totalRows <= 0 || totalColumns <= 0) {
    return 0;
  }

  if (totalRows === 1) {
    return obstacleGrid[0].every((col) => col === 0) ? 1 : 0;
  }

  if (totalColumns === 1) {
    return obstacleGrid.every((row) => row[0] === 0) ? 1 : 0;
  }

  return uniquePathsInGrid2Recursive(0, 0);

  // Function is called for every position moved in the grid.
  // It checks if the position is valid (not an obstacle) and then recursively calls itself for the next positions (down and right).
  // Returns number of unique paths from the current position to the bottom-right corner.
  function uniquePathsInGrid2Recursive(currentRow, currentColumn) {
    if (obstacleGrid[currentRow][currentColumn] == 1) {
      // Obstacle at the current position
      return 0;
    }

    if (currentRow == totalRows - 1) {
      // Reached the last row, can only move right. check if there are any obstacles in the way.
      for (let col = currentColumn; col < totalColumns; col++) {
        if (obstacleGrid[currentRow][col] == 1) {
          return 0;
        }
      }
      // One path is possible if there are no obstacles in the way.
      return 1;
    }

    if (currentColumn == totalColumns - 1) {
      // Reached the last column, can only move down. check if there are any obstacles in the way.
      for (let row = currentRow; row < totalRows; row++) {
        if (obstacleGrid[row][currentColumn] == 1) {
          return 0;
        }
      }
      // One path is possible if there are no obstacles in the way.
      return 1;
    }

    let possiblePaths = 0;
    for (let row = currentRow; row < totalRows; row++) {
      if (obstacleGrid[row][currentColumn] == 1) {
        break;
      }
      possiblePaths += uniquePathsInGrid2Recursive(row, currentColumn + 1);
    }
    return possiblePaths;
  }
}

/** @param {NS} ns */
export async function main(ns) {}
