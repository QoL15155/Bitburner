import { describe, it, expect } from "vitest";
import { algorithmicStockTrader4 } from "../../contracts/algorithmic_stock_trader_4.js";

describe("Algorithmic Stock Trader IV", () => {
  it("should find max profit with k=2 transactions", () => {
    const input = [
      2,
      [
        131, 49, 85, 128, 47, 34, 117, 146, 139, 142, 104, 154, 41, 12, 149, 61,
        41, 148, 119, 72, 85, 87, 45, 197, 150, 174, 88, 77, 16, 47, 27, 79,
        180, 36, 122, 109, 131, 124, 109, 96, 93, 143, 89, 111, 170, 40, 170,
        102,
      ],
    ];
    expect(algorithmicStockTrader4(input)).toBe(349);
  });

  it("should find max profit with k=10 transactions", () => {
    const input = [
      10,
      [
        24, 85, 176, 25, 98, 97, 91, 120, 122, 113, 46, 194, 149, 149, 112, 174,
        193, 79, 142, 20, 2, 192, 118, 61, 133, 62, 94, 3, 47, 61, 160, 163, 79,
        97, 31, 36, 113, 52, 154, 148, 161, 176, 45, 117, 74, 92,
      ],
    ];
    expect(algorithmicStockTrader4(input)).toBe(1180);
  });

  it("should return 0 for decreasing prices", () => {
    expect(algorithmicStockTrader4([3, [10, 8, 5, 3, 1]])).toBe(0);
  });

  it("should handle k=1 (same as trader I)", () => {
    expect(algorithmicStockTrader4([1, [1, 5, 1, 5]])).toBe(4);
  });

  it("should handle k=0 (no transactions allowed)", () => {
    expect(algorithmicStockTrader4([0, [1, 5, 10]])).toBe(0);
  });

  it("should handle repeated buy-sell cycles with enough k", () => {
    // k=3, prices=[1, 5, 1, 5, 1, 5]: 3 transactions of 4 = 12
    expect(algorithmicStockTrader4([3, [1, 5, 1, 5, 1, 5]])).toBe(12);
  });

  it("should handle k larger than possible transactions", () => {
    // k=100 but only 3 possible profitable transactions
    // Buy 1 sell 5, buy 2 sell 8, buy 1 sell 4 = 4 + 6 + 3 = 13
    expect(algorithmicStockTrader4([100, [1, 5, 2, 8, 1, 4]])).toBe(13);
  });

  // BUG: memoization cache doesn't distinguish hasStock state.
  // This test exercises a scenario where cache corruption can occur
  // with multiple transaction limits sharing cache keys.
  it("should correctly compute with k=3 and multiple valleys", () => {
    // 3 clear buy-sell opportunities of profit 9 each = 27
    expect(algorithmicStockTrader4([3, [5, 1, 10, 1, 10, 1, 10]])).toBe(27);
  });
});
