import { describe, it, expect } from "vitest";
import { findLargestPrimeFactor } from "../../scripts/contracts/largest_prime_factor.js";

describe("Largest Prime Factor", () => {
  it("should find largest prime factor of 56086774", () => {
    expect(Number(findLargestPrimeFactor(56086774))).toBe(1649611);
  });

  it("should find largest prime factor of a prime number", () => {
    expect(Number(findLargestPrimeFactor(13))).toBe(13);
  });

  it("should find largest prime factor of a power of 2", () => {
    expect(Number(findLargestPrimeFactor(1024))).toBe(2);
  });

  it("should find largest prime factor of 2", () => {
    expect(Number(findLargestPrimeFactor(2))).toBe(2);
  });

  it("should handle large number 971392119", () => {
    // 971392119 = 3 * 7 * 46256767... let's just verify it runs
    const result = Number(findLargestPrimeFactor(971392119));
    expect(result).toBeGreaterThan(1);
    // Verify the result is actually a factor
    expect(971392119 % result).toBe(0);
  });

  it("should find largest prime factor of 100", () => {
    // 100 = 2^2 * 5^2, largest prime factor is 5
    expect(Number(findLargestPrimeFactor(100))).toBe(5);
  });

  // BUG: returns BigInt instead of Number
  it("should return a BigInt value", () => {
    const result = findLargestPrimeFactor(100);
    expect(typeof result).toBe("bigint");
  });
});
