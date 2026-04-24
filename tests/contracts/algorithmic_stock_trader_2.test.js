import { describe, it, expect } from "vitest";
import { algorithmicStockTrader2 } from "../../scripts/contracts/algorithmic_stock_trader_2.js";

describe("Algorithmic Stock Trader II", () => {
  it("should find max profit with unlimited transactions", () => {
    const prices = [
      128, 57, 137, 100, 22, 79, 3, 199, 58, 116, 186, 83, 60, 125, 45, 150,
      172, 89, 59, 125, 173, 55, 68, 133, 79, 111, 30, 3, 200, 198, 25, 108,
      149,
    ];
    // Sum of all positive consecutive differences = 1198
    expect(algorithmicStockTrader2(prices)).toBe(1198);
  });

  it("should return 0 for decreasing prices", () => {
    expect(algorithmicStockTrader2([10, 8, 5, 3, 1])).toBe(0);
  });

  it("should capture every uptick", () => {
    // Buy 1 sell 2, buy 3 sell 4, buy 5 sell 6 = 1+1+1 = 3
    expect(algorithmicStockTrader2([1, 2, 3, 4, 5, 6])).toBe(5);
  });

  it("should handle zigzag prices", () => {
    // Buy at 1, sell at 5, buy at 1, sell at 5 = 8
    expect(algorithmicStockTrader2([1, 5, 1, 5])).toBe(8);
  });

  it("should return 0 for empty array", () => {
    expect(algorithmicStockTrader2([])).toBe(0);
  });
});
