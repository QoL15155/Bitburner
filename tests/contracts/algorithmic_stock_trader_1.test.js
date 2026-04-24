import { describe, it, expect } from "vitest";
import { algorithmicStockTrader1 } from "../../scripts/contracts/algorithmic_stock_trader_1.js";

describe("Algorithmic Stock Trader I", () => {
  it("should find max profit with one transaction", () => {
    const prices = [
      175, 1, 115, 122, 10, 167, 179, 96, 92, 6, 166, 122, 25, 133, 127, 66, 20,
      102,
    ];
    expect(algorithmicStockTrader1(prices)).toBe(178);
  });

  it("should return 0 when prices only decrease", () => {
    expect(algorithmicStockTrader1([10, 8, 5, 3, 1])).toBe(0);
  });

  it("should return 0 for single element", () => {
    expect(algorithmicStockTrader1([5])).toBe(0);
  });

  it("should return 0 for empty array", () => {
    expect(algorithmicStockTrader1([])).toBe(0);
  });

  it("should handle all same prices", () => {
    expect(algorithmicStockTrader1([5, 5, 5, 5])).toBe(0);
  });

  it("should handle two elements ascending", () => {
    expect(algorithmicStockTrader1([1, 10])).toBe(9);
  });

  it("should pick best single transaction among multiple ups and downs", () => {
    // Best: buy at 1, sell at 9
    expect(algorithmicStockTrader1([3, 1, 4, 1, 5, 9, 2, 6])).toBe(8);
  });
});
