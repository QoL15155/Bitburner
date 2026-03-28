/**
 * Formatting number in a human-readable way.
 * @param {number} value
 * @returns {string} Formatted value with suffixes (k, m, b, t, q, Q)
 */
export function doConversion(value) {
  const thousand = 1000;
  const million = thousand * thousand;
  const billion = million * thousand;
  const trillion = billion * thousand;
  const quadrillion = trillion * thousand;
  const quintillion = quadrillion * thousand;
  // const sextillion = quintillion * thousand;

  if (value >= quintillion) {
    return `${(value / quintillion).toFixed(3)}Q`;
  }

  if (value >= quadrillion) {
    return `${(value / quadrillion).toFixed(3)}q`;
  }

  if (value >= trillion) {
    return `${(value / trillion).toFixed(3)}t`;
  }

  if (value >= billion) {
    return `${(value / billion).toFixed(3)}b`;
  }

  if (value >= million) {
    return `${(value / million).toFixed(3)}m`;
  }
  if (value >= thousand) {
    return `${(value / thousand).toFixed(3)}k`;
  }

  return value.toString();
}

/**
 * @param {number} seconds
 * @returns {string} formatted time in seconds, minutes, hours
 */
export function formatTimeSeconds(seconds) {
  if (seconds < 60) {
    return `${seconds.toFixed(2)}s`;
  }

  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(2)}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const remainingMinutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${hours}h ${remainingMinutes}m ${remainingSeconds.toFixed(2)}s`;
}
/**
 * Formats the given time in milliseconds
 *
 * @param {number} milliseconds : time
 * @returns {string} of formatted time
 */
export function formatTime(milliseconds) {
  const minutes = Math.floor(milliseconds / 1000 / 60);
  const seconds = (milliseconds / 1000) % 60;
  milliseconds = milliseconds % (1000 * 60);

  let result = "";

  if (minutes >= 1) {
    result += `${minutes} minutes `;
  }

  result += `${seconds.toFixed(3)} seconds (${milliseconds} ms)`;
  return result;
}

/**
 * @param {number} ramGB : RAM in GB
 * @returns {string} of formatted ram
 */
export function formatRam(ramGB) {
  if (ramGB < 1000) return `${ramGB.toFixed(3)} GB`;
  let ramTB = ramGB / 1000;
  return `${ramTB.toFixed(3)} TB`;
}

/**
 * @param {number} money
 * @return {string} formatted money
 */
export function formatMoney(money) {
  return "$" + doConversion(money);
}

/** Gang rates are per game game cycle (200 ms) */
export function formatWantedLevelGainRate(gainRate) {
  return `${(gainRate * 5).toFixed(3)}/sec`;
}
