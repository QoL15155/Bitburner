"""
contract_name:
    contract-146041-Netburners.cct,
    contract-268366-CyberSec.cct
description:

Square Root

You are given a ~200 digit BigInt.
Find the square root of this number, to the nearest integer.

The input is a BigInt value.
The answer must be the string representing the solution's BigInt value.
The trailing "n" is not part of the string.

Hint: If you are having trouble, you might consult
https://en.wikipedia.org/wiki/Methods_of_computing_square_roots

Input number:
130493527461448832591871443261380007128546257302069986531746312828044833334965835148209383490948881394796368823845710700841871980749486227178944296537154680096725614794923831824238893533600360702884961
"""

from operator import le
from tabnanny import check


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

    # print(f"Failed to find an exact square root. \nleft:{left} \nright:{right}")
    # Assert expected conditions
    assert left > right, "Left should be greater than right after the loop ends."
    assert (
        left - right == 1
    ), f"Left and right should differ by 1. Left: {left}, Right: {right}"
    # print(f"left > right? {left > right}. Diff: {left - right}")

    l_sum = left * left
    r_sum = right * right
    diff_left_sum = abs(l_sum - n)
    diff_right_sum = abs(r_sum - n)
    # print(f"left^2: {l_sum} \nright^2: {r_sum}")
    # print(f"Diff left^2 - n: {abs(l_sum - n)} \nDiff right^2 - n: {abs(r_sum - n)}")
    # if r_sum < n:
    #     print("right^2 < n")
    # if r_sum > n:
    #     print("right^2 > n")
    # if l_sum < n:
    #     print("left^2 < n")
    # if l_sum > n:
    #     print("left^2 > n")

    if diff_left_sum < diff_right_sum:
        print("Left number is closer to n. Return left.")
        return left

    print("Right number is closer to n. Return right.")
    return right

    # print("Failed to find an exact square root. Return the lowest number.")
    # return right


def test():
    def check_square_root(n, number, expected_result):
        result = find_square_root(number)
        assert (
            result == expected_result
        ), f"Test Case #{n} failed: expected {expected_result}, got {result}"
        print(f"Test Case #{n} passed")

    big_number = 82174920767709014264359125774247005983182641454218761959062312234050539703754855634631421327126005298067841039438961274596837489905885403880047665014778464110341685880615090761126564813764930460666300
    expected_result = 9065038376516064935415161598025316019457048828155601103176631684846031317435548509562494382498976300
    check_square_root(1, big_number, expected_result)

    big_number = 130493527461448832591871443261380007128546257302069986531746312828044833334965835148209383490948881394796368823845710700841871980749486227178944296537154680096725614794923831824238893533600360702884961
    expected_result = 11423376359966821674072478097888243535751814988724998178438938295109692305804108169936495844553844639
    # check_square_root(2, big_number, expected_result)

    big_number = 215995057448243115908111577069443612751962068497025094297290073891500199650392518478196021975496074149959058101339064599775497789349242697632426822684806116807454042952958058089530534169208410690109664
    expected_result = 14696770306711713588633295771575023504890559054472790890341768440658621854914547433786086294733162394
    check_square_root(3, big_number, expected_result)

    big_number = 83871190181778405930934787411564167619964724528469343074346398048146847667280472539192790200007285450499690232242925611089517216884187990289555750953851523984762372272295854270549193846304948120113987
    expected_result = 9158121542203859937311870878942052355620557139991833384754665989044077107563965285136873330267982688
    check_square_root(4, big_number, expected_result)


def main():
    test()


if __name__ == "__main__":
    main()
