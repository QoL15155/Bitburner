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
