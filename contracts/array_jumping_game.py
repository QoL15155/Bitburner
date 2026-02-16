"""
contract: contract-263691.cct
description:

Array Jumping Game

You are given the following array of integers:

9,10,7,0,2,6,8,8,3,0,10,8,3,0,0,6,4,8,8,7,4,10

Each element in the array represents your MAXIMUM jump length at that position.
This means that if you are at position i and your maximum jump length is n, you can jump to any position from i to i+n.

Assuming you are initially positioned at the start of the array, determine whether you are able to reach the last index.

Your answer should be submitted as 1 or 0, representing true and false respectively.
"""


def do_jump(input, position: int) -> list[int] | None:
    max_jump = input[position]

    if position + max_jump >= len(input) - 1:
        return [position]

    for i in range(max_jump):
        result = do_jump(input, position + i + 1)
        if result is not None:
            result.insert(0, position)
            return result

    return None


def jumping_game(input: str) -> int:
    jumps: list[int] = list(map(int, input.split(",")))
    result = do_jump(jumps, 0)
    if result is not None:
        print(f"Jumps: {result}")
    return result


def test():
    input = "9,10,7,0,2,6,8,8,3,0,10,8,3,0,0,6,4,8,8,7,4,10"
    result = jumping_game(input)
    assert result is not None


def main() -> None:
    input = "9,10,7,0,2,6,8,8,3,0,10,8,3,0,0,6,4,8,8,7,4,10"
    jumping_game(input)


if __name__ == "__main__":
    main()
