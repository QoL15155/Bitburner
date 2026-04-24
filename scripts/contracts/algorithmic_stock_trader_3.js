/**
Algorithmic Stock Trader III

You are given the following array of stock prices (which are numbers) where the i-th element represents the stock price on day i:

131,49,85,128,47,34,117,146,139,142,104,154,41,12,149,61,41,148,119,72,85,87,45,197,150,174,88,77,16,47,27,79,180,36,122,109,131,124,109,96,93,143,89,111,170,40,170,102

Determine the maximum possible profit you can earn using at most two transactions.
A transaction is defined as buying and then selling one share of the stock. 
Note that you cannot engage in multiple transactions at once. In other words, you must sell the stock before you buy it again.

If no profit can be made, then the answer should be 0. 
*/

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
    if (sellProfit > 0) {
      actionProfit =
        sellProfit +
        getMaxProfitRecursive(stockPricesByDay, nextDay, false, 0, limit - 1);
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
  return Math.max(actionProfit, noActionProfit);
}

export function algorithmicStockTrader3(stockPricesByDay) {
  return getMaxProfitRecursive(stockPricesByDay, 0, false, 0, 2);
}

/** @param {NS} ns */
export async function main(ns) {
  test();
  function test() {
    const stockPrices = [
      131, 49, 85, 128, 47, 34, 117, 146, 139, 142, 104, 154, 41, 12, 149, 61,
      41, 148, 119, 72, 85, 87, 45, 197, 150, 174, 88, 77, 16, 47, 27, 79, 180,
      36, 122, 109, 131, 124, 109, 96, 93, 143, 89, 111, 170, 40, 170, 102,
    ];
    const result = algorithmicStockTrader3(stockPrices);
    if (result !== 349) {
      ns.alert(
        `Test failed for algorithmicStockTrader3. Expected 349, but got ${result}`,
      );
    }
  }
}
