"""
contract_name: contract-680223.cct
description:

Find Largest Prime Factor
A prime factor is a factor that is a prime number. What is the largest prime factor of 971392119?

"""


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

    return str(largest_factor)


if __name__ == "__main__":
    n = 971392119
    result = find_largest_prime_factor(n)
    print(result)
