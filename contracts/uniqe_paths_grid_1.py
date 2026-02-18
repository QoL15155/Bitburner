"""
Unique Paths in a Grid I

You are in a grid with 5 rows and 14 columns, and you are positioned in the top-left corner of that grid.
You are trying to reach the bottom-right corner of the grid, but you can only move down or right on each step.
Determine how many unique paths there are from start to finish.

NOTE: The data returned for this contract is an array with the number of rows and columns:

[5, 14]
"""

import argparse
from math import factorial


def solve_grid_claude(n: int, m: int) -> int:
    # The number of unique paths from the top-left corner to the bottom-right corner
    # in a grid of size n x m can be calculated using the formula:
    # C(n + m - 2, n - 1) = (n + m - 2)! / ((n - 1)! * (m - 1)!)

    if n == 0 or m == 0:
        return 0

    return factorial(n + m - 2) // (factorial(n - 1) * factorial(m - 1))


def solve_grid_naiive(n: int, m: int) -> int:
    if n == 0 or m == 0:
        return 0

    if n == 1 or m == 1:
        return 1

    result = 0
    for i in range(n):
        result += solve_grid_naiive(i + 1, m - 1)

    return result


def test():
    assert solve_grid_naiive(2, 3) == 3
    assert (
        solve_grid_naiive(3, 7) == 28
    ), f"Expected 28 but got {solve_grid_naiive(3, 7)}"
    assert solve_grid_naiive(5, 14) == 2380


def main():
    parser = argparse.ArgumentParser(description="Solve unique paths in a grid problem")
    parser.add_argument(
        "rows",
        type=int,
        help="Number of rows in the grid (default: 5)",
    )
    parser.add_argument(
        "cols",
        type=int,
        help="Number of columns in the grid (default: 14)",
    )

    # If arguments are provided directly (for testing), use them
    args = parser.parse_args()
    n, m = args.rows, args.cols

    solution = solve_grid_naiive(n, m)
    print(f"Grid: {[n, m]}, Solution: {solution}")


if __name__ == "__main__":
    test()
    main()
