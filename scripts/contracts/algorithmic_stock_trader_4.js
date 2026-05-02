/**
  Algorithmic Stock Trader IV

You are given the following array with two elements:
[10, [101,164,36,47,99,61,13,156,118,70,100,96,11,24,160,25,44,121,133,133,23,170,170,154,123,75,194,81,86,157,148,14,149,42,189,191,38,126,32,20,133,121,33,36,59,159,113,126]]

The first element is an integer k. The second element is an array of stock prices (which are numbers) where the i-th element represents the stock price on day i.

Determine the maximum possible profit you can earn using at most k transactions. A transaction is defined as buying and then selling one share of the stock. Note that you cannot engage in multiple transactions at once. In other words, you must sell the stock before you can buy it again.

If no profit can be made, then the answer should be 0.

*/

export function algorithmicStockTrader4([limit, stockPricesByDay]) {
  // Cache for storing the maximum profit for each day and remaining transaction limit
  let profitMatrix = Array(stockPricesByDay.length)
    .fill({})
    .map(() => Array(limit + 1).fill(-1));
  return getMaxProfitRecursive(stockPricesByDay, 0, false, 0, limit);

  function getMaxProfitRecursive(
    stockPricesByDay,
    currentDay,
    hasStock,
    stockPrice,
    limit,
  ) {
    if (currentDay >= stockPricesByDay.length) {
      return 0;
    }
    if (limit <= 0) {
      return 0;
    }

    const nextDay = currentDay + 1;
    const todayPrice = stockPricesByDay[currentDay];

    let actionProfit = 0;
    if (hasStock) {
      // Profit if we sell today
      const sellProfit = todayPrice - stockPrice;
      if (sellProfit >= 0) {
        if (profitMatrix[currentDay][limit - 1] == -1) {
          actionProfit = getMaxProfitRecursive(
            stockPricesByDay,
            nextDay,
            false,
            0,
            limit - 1,
          );
          profitMatrix[currentDay][limit - 1] = actionProfit;
        }
        actionProfit = sellProfit + profitMatrix[currentDay][limit - 1];
      }
    } else {
      // Profit if we buy today
      actionProfit = getMaxProfitRecursive(
        stockPricesByDay,
        nextDay,
        true,
        todayPrice,
        limit,
      );
    }

    const noActionProfit = getMaxProfitRecursive(
      stockPricesByDay,
      nextDay,
      hasStock,
      stockPrice,
      limit,
    );
    const result = Math.max(actionProfit, noActionProfit);
    profitMatrix[currentDay][limit] = result;
    return result;
  }
}

/** @param {NS} ns */
export async function main(ns) {}
