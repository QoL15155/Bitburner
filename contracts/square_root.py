"""
contract_name: contract-146041-Netburners.cct
description:

Square Root

You are given a ~200 digit BigInt. Find the square root of this number, to the nearest integer.

The input is a BigInt value. The answer must be the string representing the solution's BigInt value. The trailing "n" is not part of the string.

Hint: If you are having trouble, you might consult https://en.wikipedia.org/wiki/Methods_of_computing_square_roots

Input number:
130493527461448832591871443261380007128546257302069986531746312828044833334965835148209383490948881394796368823845710700841871980749486227178944296537154680096725614794923831824238893533600360702884961


"""

from operator import le


def find_square_root(n):
    if n < 2:
        return str(n)

    left, right = 1, n
    while left <= right:
        mid = (left + right) // 2
        mid_squared = mid * mid

        if mid_squared == n:
            return str(mid)
        elif mid_squared < n:
            left = mid + 1
        else:
            right = mid - 1

    print(f"Failed to find an exact square root. \nleft:{left} \nright:{right}")
    print(f"left > right? {left > right}. Diff: {left - right}")

    l_sum = left * left
    r_sum = right * right
    print(f"left^2: {l_sum} \nright^2: {r_sum}")
    if r_sum < n:
        print("right^2 < n")
    if r_sum > n:
        print("right^2 > n")
    if l_sum < n:
        print("left^2 < n")
    if l_sum > n:
        print("left^2 > n")

    # if left != right:
    #     return None
    # if left * left == n:
    #     return str(right)

    # print("Failed to find an exact square root 2")
    return None


INPUT = 130493527461448832591871443261380007128546257302069986531746312828044833334965835148209383490948881394796368823845710700841871980749486227178944296537154680096725614794923831824238893533600360702884961
result = find_square_root(INPUT)
print(result)
