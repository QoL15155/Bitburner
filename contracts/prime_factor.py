"""
contract_name: contract-680223.cct
description:

Find Largest Prime Factor
A prime factor is a factor that is a prime number. What is the largest prime factor of 971392119?

"""

import argparse


def find_largest_prime_factor(n):
    largest_factor = None
    # Check for number of 2s that divide n
    while n % 2 == 0:
        largest_factor = 2
        n //= 2

    # n must be odd at this point, so we can skip even numbers
    for i in range(3, int(n**0.5) + 1, 2):
        while n % i == 0:
            largest_factor = i
            n //= i

    # This condition is to check if n is a prime number greater than 2
    if n > 2:
        largest_factor = n

    return largest_factor


def test():
    assert find_largest_prime_factor(971392119) == 17041967
    assert find_largest_prime_factor(56086774) == 1649611


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Find the largest prime factor of a number"
    )
    parser.add_argument(
        "number", type=int, help="The number to find the largest prime factor for"
    )
    parser.add_argument("--test", action="store_true", help="Run the test case")

    args = parser.parse_args()

    if args.test:
        test()
        print("Test passed!")

    result = find_largest_prime_factor(args.number)
    print(f"The largest prime factor of {args.number} is: {result}")
