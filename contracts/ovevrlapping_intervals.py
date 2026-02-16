"""
contract_name: contract-478590-AlphaEnterprises.cct
server: iron-gym
description:

Merge Overlapping Intervals
You are attempting to solve a Coding Contract. You have 15 tries remaining, after which the contract will self-destruct.

Given the following array of arrays of numbers representing a list of intervals, merge all overlapping intervals.

[[12,19],[12,17],[24,27],[10,15],[5,12],[25,28],[16,24],[25,32],[3,7],[10,17],[21,25],[12,15],[14,20],[8,11],[10,18],[15,20],[7,9]]

Example:

[[1, 3], [8, 10], [2, 6], [10, 16]]

would merge into [[1, 6], [8, 16]].

The intervals must be returned in ASCENDING order. You can assume that in an interval, the first number will always be smaller than the second.


If your solution is an empty string, you must leave the text box empty. Do not use "", '', or ``.
"""


def merge_overlapping_intervals(intervals):
    if not intervals:
        return []

    # Sort intervals based on the starting point
    intervals.sort(key=lambda x: x[0])

    merged = [intervals[0]]

    for current in intervals[1:]:
        last_merged = merged[-1]

        # Check if there is an overlap
        if current[0] <= last_merged[1]:  # Overlapping intervals
            # Merge the current interval with the last merged interval
            last_merged[1] = max(last_merged[1], current[1])
        else:
            # No overlap, add the current interval to merged list
            merged.append(current)

    return merged


def test():
    intervals = [[1, 3], [8, 10], [2, 6], [10, 16]]
    expected_output = [[1, 6], [8, 16]]
    assert merge_overlapping_intervals(intervals) == expected_output


def run():
    intervals = [
        [12, 19],
        [12, 17],
        [24, 27],
        [10, 15],
        [5, 12],
        [25, 28],
        [16, 24],
        [25, 32],
        [3, 7],
        [10, 17],
        [21, 25],
        [12, 15],
        [14, 20],
        [8, 11],
        [10, 18],
        [15, 20],
        [7, 9],
    ]
    answer = merge_overlapping_intervals(intervals)
    # [[3, 32]]
    print(answer)
    return answer


if __name__ == "__main__":
    test()
    run()
