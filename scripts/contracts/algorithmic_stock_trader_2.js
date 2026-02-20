/**
Algorithmic Stock Trader II

You are given the following array of stock prices (which are numbers) where the i-th element represents the stock price on day i:

128,57,137,100,22,79,3,199,58,116,186,83,60,125,45,150,172,89,59,125,173,55,68,133,79,111,30,3,200,198,25,108,149

Determine the maximum possible profit you can earn using as many transactions as you'd like. A transaction is defined as buying and then selling one share of the stock. 
Note that you cannot engage in multiple transactions at once. In other words, you must sell the stock before you buy it again.

If no profit can be made, then the answer should be 0.

*/


export function algorithmicStockTrader2(stockPricesByDay) {
    let profitMatrix = Array(stockPricesByDay.length).fill(-1);
    return getMaxProfitRecursive(stockPricesByDay, 0, false, 0);

    function getMaxProfitRecursive(stockPricesByDay, currentDay, hasStock, stockPrice) {
        if (currentDay >= stockPricesByDay.length) {
            return 0;
        }

        const nextDay = currentDay + 1;
        const todayPrice = stockPricesByDay[currentDay];

        let actionProfit = 0;
        if (hasStock) {
            // Profit if we sell today
            const sellProfit = todayPrice - stockPrice
            if (sellProfit > 0) {
                if (profitMatrix[currentDay] == -1) {
                    actionProfit = getMaxProfitRecursive(stockPricesByDay, nextDay, false, 0);
                    profitMatrix[currentDay] = actionProfit;
                }
                actionProfit = sellProfit + profitMatrix[currentDay];
            }
        } else {
            // Profit if we buy today
            actionProfit = getMaxProfitRecursive(stockPricesByDay, nextDay, true, todayPrice);
        }

        const noActionProfit = getMaxProfitRecursive(stockPricesByDay, nextDay, hasStock, stockPrice);
        const maxProfit = Math.max(actionProfit, noActionProfit);
        return maxProfit;
    }

}


/** @param {NS} ns */
export async function main(ns) {
    test();

    function test() {
        const stockPrices = [128, 57, 137, 100, 22, 79, 3, 199, 58, 116, 186, 83, 60, 125, 45, 150, 172, 89, 59, 125, 173, 55, 68, 133, 79, 111, 30, 3, 200, 198, 25, 108, 149];

        // const startTime1 = performance.now();
        const result = algorithmicStockTrader2(stockPrices);
        if (result !== 1198) {
            ns.alert(`Test failed for algorithmicStockTrader2. Expected 1198, but got ${result}`);
        }
        // const endTime1 = performance.now();
        // console.log(`Execution time: ${endTime1 - startTime1} ms`);

    }
}
