/**
Algorithmic Stock Trader I

You are given the following array of stock prices (which are numbers) where the i-th element represents the stock price on day i:

175,1,115,122,10,167,179,96,92,6,166,122,25,133,127,66,20,102

Determine the maximum possible profit you can earn using at most one transaction (i.e. you can only buy and sell the stock once). 
If no profit can be made then the answer should be 0. Note that you have to buy the stock before you can sell it.
*/

function getMaxProfitRecursive(
  stockPricesByDay,
  currentDay,
  hasStock,
  stockPrice,
) {
  if (currentDay >= stockPricesByDay.length) {
    return 0;
  }

  const nextDay = currentDay + 1;
  const todayPrice = stockPricesByDay[currentDay];

  let actionProfit = 0;
  if (hasStock) {
    // Profit if we sell today
    actionProfit = todayPrice - stockPrice;
  } else {
    // Profit if we buy today
    actionProfit = getMaxProfitRecursive(
      stockPricesByDay,
      nextDay,
      true,
      todayPrice,
    );
  }

  const noActionProfit = getMaxProfitRecursive(
    stockPricesByDay,
    nextDay,
    hasStock,
    stockPrice,
  );
  return Math.max(actionProfit, noActionProfit);
}

/** Finds maximum profit with 1 transaction */
export function algorithmicStockTrader1(stockPricesByDay) {
  return getMaxProfitRecursive(stockPricesByDay, 0, false, 0);
}

/** @param {NS} ns */
export async function main(ns) {}
