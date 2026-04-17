import { StockInformation } from "./utils.js";
/**
 * Stock Market Analysis utility
 *
 * Prints detailed information about stocks and their changes
 */

function printCurrentStocksInformation(ns, stocksInfo) {
  ns.clearLog();
  const numberOfStocks = stocksInfo.length;

  stocksInfo.forEach((stock, index) => {
    stock.update();
    stock.display();
    if (index < numberOfStocks - 1) {
      ns.print(`  ${"─".repeat(6)}─┼─${"─".repeat(22)}─┼─${"─".repeat(120)}`);
    }
  });
  // ns.tprint(
  //   `- Forecast: ${positiveForecast} positive, ${negativeForecast} negative`,
  // );
  return stocksInfo;
}

async function analyzeStocks(ns) {
  const stockSymbols = ns.stock.getSymbols().sort((a, b) => a.localeCompare(b));
  const stocksInformation = stockSymbols.map(
    (symbol) => new StockInformation(ns, symbol),
  );

  ns.ui.openTail();
  ns.ui.setTailTitle("Stock Market Analysis");
  while (true) {
    printCurrentStocksInformation(ns, stocksInformation);
    await ns.stock.nextUpdate();
  }
}

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
  const defaultOptions = ["-h", "--help", "--tail"];

  return [...defaultOptions];
}

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([
    ["help", false],
    ["h", false],
  ]);
  if (args.help || args.h) {
    ns.tprint(`Usage: run ${ns.getScriptName()} `);
    ns.tprint("");
    ns.tprint("Stocks Analyzer");
    ns.tprint("=====================");
    ns.tprint("");
    ns.tprint("Options:");
    ns.tprint("  --help, -h     - Show this help message");

    return;
  }

  await analyzeStocks(ns);
}
