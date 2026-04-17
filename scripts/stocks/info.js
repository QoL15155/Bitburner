import {
  AttributeQuality,
  getForecastQuality,
  getPriceQuality,
  getVolatilityQuality,
} from "./utils.js";
import { Color, toGreen, toRed } from "/utils/print.js";

function printSectionHeader(ns, title) {
  const delimiter = "═".repeat(100);
  ns.tprint(toGreen(delimiter));
  ns.tprint(toGreen(`  ${title}`));
  ns.tprint(toGreen(delimiter));
}

/**
 * Return information about all stocks
 * @param {NS} ns
 * @returns {Array} Array of stock information objects
 */
function getStocksInformation(ns) {
  const stockSymbols = ns.stock.getSymbols();

  const stocksInfo = stockSymbols.map((symbol) => {
    const organization = ns.stock.getOrganization(symbol);
    const maxShares = ns.stock.getMaxShares(symbol);

    const forecast = ns.stock.getForecast(symbol);
    const volatility = ns.stock.getVolatility(symbol);
    const position = ns.stock.getPosition(symbol);

    const price = ns.stock.getPrice(symbol);
    const askPrice = ns.stock.getAskPrice(symbol);
    const bidPrice = ns.stock.getBidPrice(symbol);
    return {
      symbol,
      organization,
      forecast,
      volatility,
      position,
      maxShares,
      price,
      askPrice,
      bidPrice,
    };
  });

  return stocksInfo;
}

function printStock(ns, stock) {
  const fmtForecast = formatPercent(
    stock.forecast,
    getForecastQuality(stock.forecast),
    Color.FgBlueBright,
  );
  const fmtVolatility = formatPercent(
    stock.volatility,
    getVolatilityQuality(stock.volatility),
    Color.FgGreen,
  );

  const fmtPrice = formatNumber(
    stock.price,
    getPriceQuality(stock.price),
    Color.FgYellow,
    10,
  );

  const symbolPad = stock.symbol.padEnd(6);
  const orgPad = stock.organization.padEnd(22);

  ns.tprint(
    `  ${Color.FgCyan}${symbolPad}${Color.Reset} │ ${orgPad} │ ` +
      `Price: ${fmtPrice} │ ` +
      `Forecast: ${fmtForecast} │ ` +
      `Volatility: ${fmtVolatility}`,
  );

  // Bought stocks
  const [shares, avgPx, sharesShort, avgShortPx] = stock.position;
  const hasLong = shares > 0;
  const hasShort = sharesShort > 0;

  if (hasLong || hasShort) {
    const parts = [];
    if (hasLong) {
      const profit = shares * (stock.price - avgPx);
      const fmtProfit =
        profit >= 0
          ? toGreen(`+$${ns.formatNumber(profit)}`)
          : toRed(`-$${ns.formatNumber(Math.abs(profit))}`);
      parts.push(
        `Long: ${ns.formatNumber(shares)} shares @ $${ns.formatNumber(avgPx)} (P/L: ${fmtProfit})`,
      );
    }
    if (hasShort) {
      const shortProfit = sharesShort * (avgShortPx - stock.price);
      const fmtShortProfit =
        shortProfit >= 0
          ? toGreen(`+$${ns.formatNumber(shortProfit)}`)
          : toRed(`-$${ns.formatNumber(Math.abs(shortProfit))}`);
      parts.push(
        `Short: ${ns.formatNumber(sharesShort)} shares @ $${ns.formatNumber(avgShortPx)} (P/L: ${fmtShortProfit})`,
      );
    }
    ns.tprint(
      `  ${"".padEnd(6)} │ ${"".padEnd(22)} │ ${Color.FgMagenta}Position:${Color.Reset} ${parts.join(" │ ")}`,
    );
  }

  function formatPercent(value, quality, colorHigh) {
    const fmtValue = ns.formatPercent(value);
    switch (quality) {
      case AttributeQuality.LOW:
        return toRed(fmtValue);
      case AttributeQuality.MEDIUM:
        return fmtValue;
      case AttributeQuality.HIGH:
        return `${colorHigh}${fmtValue}${Color.Reset}`;
    }
  }

  function formatNumber(value, quality, colorHigh, padLength = 0) {
    const fmtValue = ns.formatNumber(value).padStart(padLength);
    switch (quality) {
      case AttributeQuality.LOW:
        return toRed(fmtValue);
      case AttributeQuality.MEDIUM:
        return fmtValue;
      case AttributeQuality.HIGH:
        return `${colorHigh}${fmtValue}${Color.Reset}`;
    }
  }
}

function analyzeStocks(ns, stocksInfo) {
  const numberOfStocks = stocksInfo.length;
  const positiveForecastStocks = stocksInfo.filter((s) => s.forecast >= 0.5);
  const negativeForecastStocks = stocksInfo.filter((s) => s.forecast < 0.5);

  // Forecast : probability of the stock going up.
  const positiveForecast = toGreen(
    `${positiveForecastStocks.length}/${numberOfStocks}`,
  );
  const negativeForecast = toRed(
    `${negativeForecastStocks.length}/${numberOfStocks}`,
  );

  const sortedStocksInfo = positiveForecastStocks.sort(
    (a, b) => b.forecast - a.forecast,
  );

  printSectionHeader(ns, "Stocks with Positive Forecast");
  sortedStocksInfo.forEach((stock, index) => {
    printStock(ns, stock);
    if (index < sortedStocksInfo.length - 1) {
      ns.tprint(`  ${"─".repeat(6)}─┼─${"─".repeat(22)}─┼─${"─".repeat(60)}`);
    }
  });
  const delimiter = "═".repeat(100);
  ns.tprint(toGreen(delimiter));
  ns.tprint(
    `- Forecast: ${positiveForecast} positive, ${negativeForecast} negative`,
  );
  return sortedStocksInfo;
}

/**
 * General stock market information
 * @returns {boolean} true if player has access to stocks API
 */
function generalInformation(ns) {
  printSectionHeader(ns, "General Stock Market Information");

  const constants = ns.stock.getConstants();
  ns.tprint(`Commission fee: $${constants.StockMarketCommission}`);
  const fmtNormalUpdateTime = `${constants.msPerStockUpdate}ms`;
  const fmtMinUpdateTime = `${constants.msPerStockUpdateMin}ms`;
  ns.tprint(
    `Stock market updates normal time: ${fmtNormalUpdateTime}, bonus time: ${fmtMinUpdateTime}`,
  );

  const hasWSEAccount = ns.stock.hasWSEAccount();
  const has4SData = ns.stock.has4SData();
  const hasTIXAPIAccess = ns.stock.hasTIXAPIAccess();
  const has4SDataTIXAPI = ns.stock.has4SDataTIXAPI();

  ns.tprint("API Access:");
  ns.tprint(formatValue(hasWSEAccount, "WSE Account"));
  ns.tprint(formatValue(hasTIXAPIAccess, "TIX API"));
  ns.tprint(formatValue(has4SData, "4S Data"));
  ns.tprint(formatValue(has4SDataTIXAPI, "4S Data TIX API"));

  ns.tprint("");

  return has4SDataTIXAPI && hasTIXAPIAccess;

  function formatValue(isAvailable, value) {
    return isAvailable ? "\t✅ " + toGreen(value) : "\t❌ " + toRed(value);
  }
}

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
  const defaultOptions = ["-h", "--help", "--tail"];
  const options = ["--raw"];

  return [...defaultOptions, ...options];
}

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([
    ["help", false],
    ["h", false],
    ["raw", false],
  ]);
  if (args.help || args.h) {
    ns.tprint(`Usage: run ${ns.getScriptName()} `);
    ns.tprint("");
    ns.tprint("Stocks Information");
    ns.tprint("=====================");
    ns.tprint("");
    ns.tprint("Options:");
    ns.tprint("  --help, -h     - Show this help message");
    ns.tprint(
      "  --raw          - Print raw stock information without formatting",
    );

    return;
  }

  const apiAccess = generalInformation(ns);
  if (!apiAccess) {
    ns.tprint(
      toRed(
        "You don't have access to the stock market API. Can't get stocks information.",
      ),
    );
    return;
  }

  const stocksInfo = getStocksInformation(ns);

  analyzeStocks(ns, stocksInfo);
  if (args.raw) {
    printSectionHeader(ns, "Raw Stocks Information");
    ns.tprint(JSON.stringify(stocksInfo, null, 2));
  }
}
