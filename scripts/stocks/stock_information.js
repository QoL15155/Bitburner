import {
  AttributeQuality,
  getForecastQuality,
  getPriceQuality,
  getVolatilityQuality,
} from "./utils.js";
import { Color, toRed } from "/utils/print.js";

/** Holds information about the current state of a stock */
class StockState {
  constructor(ns, symbol) {
    this.symbol = symbol;
    this.forecast = ns.stock.getForecast(symbol);
    this.volatility = ns.stock.getVolatility(symbol);
    this.price = ns.stock.getPrice(symbol);
    // this.position = ns.stock.getPosition(symbol);
    // this.askPrice = ns.stock.getAskPrice(symbol);
    // this.bidPrice = ns.stock.getBidPrice(symbol);
  }
}

/**
 * Holds information about a stock
 * Both static information (symbol, organization, max shares)
 * and dynamic information (current price, forecast, volatility, etc.
 */
export class StockInformation {
  /** @const {NS} */
  #ns;

  /** @const {string} */
  #symbol;
  /** @const {string} */
  #organization;

  // Stock price
  /** @type {number} */
  #lowestPrice = 0;
  #highestPrice = 0;

  // #ownedShares = 0;
  #maxShares = 0;

  #prevState = null;
  /** @type {StockState} */
  #currentState;

  constructor(ns, symbol) {
    this.#ns = ns;

    this.#symbol = symbol;
    this.#organization = ns.stock.getOrganization(symbol);
    this.#maxShares = ns.stock.getMaxShares(symbol);

    this.#currentState = new StockState(ns, symbol);

    this.#lowestPrice = this.#currentState.price;
    this.#highestPrice = this.#currentState.price;
  }

  /** Updates the current state of the stock */
  update() {
    const state = new StockState(this.#ns, this.#symbol);
    if (state.price < this.#lowestPrice) {
      this.#lowestPrice = state.price;
    }
    if (state.price > this.#highestPrice) {
      this.#highestPrice = state.price;
    }

    this.#prevState = this.#currentState;
    this.#currentState = state;
  }

  display() {
    const fmtForecast = this.#formatPercent(
      this.#currentState.forecast,
      getForecastQuality(this.#currentState.forecast),
      Color.FgBlueBright,
      8,
    );

    const fmtVolatility = this.#formatPercent(
      this.#currentState.volatility,
      getVolatilityQuality(this.#currentState.volatility),
      Color.FgGreen,
      8,
    );

    const fmtPrice = this.#formatNumber(
      this.#currentState.price,
      getPriceQuality(this.#currentState.price),
      Color.FgYellow,
      10,
    );

    // higher forecast = better
    const forecastTrend = this.#trendIndicator(
      this.#prevState?.forecast,
      this.#currentState.forecast,
      true,
    );

    // TODO: see if volatility is const
    // lower volatility = better
    const volatilityTrend = this.#trendIndicator(
      this.#prevState?.volatility,
      this.#currentState.volatility,
      false,
    );
    // lower price = better (for buying)
    const priceTrend = this.#trendIndicator(
      this.#prevState?.price,
      this.#currentState.price,
      false,
    );

    const symbolPad = this.#symbol.padEnd(6);
    const orgPad = this.#organization.padEnd(22);
    this.#ns.print(
      `  ${Color.FgCyan}${symbolPad}${Color.Reset} │ ${orgPad} │ ` +
        `Volatility: ${fmtVolatility}${volatilityTrend} │ ` +
        `Forecast: ${fmtForecast}${forecastTrend} │ ` +
        `Price: ${fmtPrice}${priceTrend} │ ` +
        `Price Range: ${this.#formatPadNumber(this.#lowestPrice)} - ${this.#formatPadNumber(this.#highestPrice)}`,
    );
  }

  /** Returns a colored ▲/▼ indicator or space based on value change.
   * @param {boolean} higherIsBetter - if true, increase = green; if false, decrease = green */
  #trendIndicator(prev, current, higherIsBetter) {
    if (prev == null || prev === current) return " ";
    const increased = current > prev;
    const isBetter = increased === higherIsBetter;
    const arrow = increased ? " ▲" : " ▼";
    return isBetter
      ? `${Color.FgGreen}${arrow}${Color.Reset}`
      : `${Color.FgRed}${arrow}${Color.Reset}`;
  }

  #formatPercent(value, quality, colorHigh, padLength = 0) {
    const fmtValue = this.#ns.formatPercent(value).padStart(padLength);
    switch (quality) {
      case AttributeQuality.LOW:
        return toRed(fmtValue);
      case AttributeQuality.MEDIUM:
        return fmtValue;
      case AttributeQuality.HIGH:
        return `${colorHigh}${fmtValue}${Color.Reset}`;
    }
  }

  #formatPadNumber(value, padLength = 0) {
    return this.#ns.formatNumber(value).padStart(padLength);
  }

  #formatNumber(value, quality, colorHigh, padLength = 0) {
    const fmtValue = this.#formatPadNumber(value, padLength);
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
