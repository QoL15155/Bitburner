import { describe, it, expect } from "vitest";
import { algorithmicStockTrader3 } from "../../contracts/algorithmic_stock_trader_3.js";

describe("Algorithmic Stock Trader III", () => {
  it("should find max profit with at most 2 transactions", () => {
    const prices = [
      131, 49, 85, 128, 47, 34, 117, 146, 139, 142, 104, 154, 41, 12, 149, 61,
      41, 148, 119, 72, 85, 87, 45, 197, 150, 174, 88, 77, 16, 47, 27, 79, 180,
      36, 122, 109, 131, 124, 109, 96, 93, 143, 89, 111, 170, 40, 170, 102,
    ];
    expect(algorithmicStockTrader3(prices)).toBe(349);
  });

  it("should return 0 for decreasing prices", () => {
    expect(algorithmicStockTrader3([10, 8, 5, 3, 1])).toBe(0);
  });

  it("should handle case where one transaction is optimal", () => {
    // Only one good transaction: buy at 1, sell at 100
    expect(algorithmicStockTrader3([1, 100])).toBe(99);
  });

  it("should find two profitable transactions", () => {
    // Buy 1 sell 5, buy 1 sell 5 = 8
    expect(algorithmicStockTrader3([1, 5, 1, 5])).toBe(8);
  });

  it("should return 0 for empty array", () => {
    expect(algorithmicStockTrader3([])).toBe(0);
  });
});
