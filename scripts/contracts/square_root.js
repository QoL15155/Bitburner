/**
 * Square Root
 *
 * You are given a ~200 digit BigInt.
 * Find the square root of this number, to the nearest integer.
 *
 * The input is a BigInt value.
 * The answer must be the string representing the solution's BigInt value.
 * The trailing "n" is not part of the string.
 *
 * Hint: If you are having trouble, you might consult
 * https://en.wikipedia.org/wiki/Methods_of_computing_square_roots
 */

export function findSquareRoot(n) {
  n = BigInt(n);

  if (n < 2n) {
    return n;
  }

  let left = 1n;
  let right = n;

  while (left <= right) {
    const mid = (left + right) / 2n;
    const midSquared = mid * mid;

    if (midSquared === n) {
      return mid;
    } else if (midSquared < n) {
      left = mid + 1n;
    } else {
      right = mid - 1n;
    }
  }

  const leftSquared = left * left;
  const rightSquared = right * right;
  if (leftSquared - n < n - rightSquared) {
    // ns.printf(`Failed to find exact square root. Returning closest higher integer: ${left}`);
    return left;
  }

  // ns.printf(`"Failed to find exact square root. Returning closest lower integer: ${right}`);
  return right;
}

/** @param {NS} ns */
export async function main(ns) {}
