/**
 * Stock Market Analysis Utilities
 */

export const AttributeQuality = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
};

export function getForecastQuality(forecast) {
  if (forecast < 0.5) {
    return AttributeQuality.LOW;
  } else if (forecast < 0.6) {
    return AttributeQuality.MEDIUM;
  } else {
    return AttributeQuality.HIGH;
  }
}

export function getVolatilityQuality(volatility) {
  if (volatility > 0.01) {
    return AttributeQuality.LOW;
  } else {
    return AttributeQuality.MEDIUM;
  }
}

export function getPriceQuality(price) {
  if (price < 20000) {
    return AttributeQuality.HIGH;
  } else if (price < 40000) {
    return AttributeQuality.MEDIUM;
  } else {
    return AttributeQuality.LOW;
  }
}
