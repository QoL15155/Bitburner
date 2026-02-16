"""
contract: contract-728812.cct
description:

Minimum Path Sum in a Triangle

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
"""


def calculate_minimum_path_sum(triangle: list[list[int]], row: int, col: int) -> int:
    if row == len(triangle) - 1:
        return triangle[row][col]

    left_sum = calculate_minimum_path_sum(triangle, row + 1, col)
    right_sum = calculate_minimum_path_sum(triangle, row + 1, col + 1)

    return triangle[row][col] + min(left_sum, right_sum)


def triangle_minimum_path(triangle: list[list[int]]) -> int:
    if not triangle:
        return 0

    return calculate_minimum_path_sum(triangle, 0, 0)


def test():
    triangle = [[2], [3, 4], [6, 5, 7], [4, 1, 8, 3]]
    result = triangle_minimum_path(triangle)
    assert result == 11

    triangle = [[5], [8, 6], [8, 5, 8], [2, 2, 3, 3], [2, 4, 8, 4, 2]]
    result = triangle_minimum_path(triangle)
    assert result == 22


def main() -> None:
    test()

    triangle = [[5], [8, 6], [8, 5, 8], [2, 2, 3, 3], [2, 4, 8, 4, 2]]
    result = triangle_minimum_path(triangle)
    print(result)


if __name__ == "__main__":
    main()
