import {
  wantedGainRaiseMax,
  wantedPenaltyRaiseThreshold,
  wantedPenaltySafeThreshold,
} from "./constants.js";

/**
 * Utility functions for *General* gang management.
 *
 * Suitable for both Hacking and Combat gangs.
 */

//#region Ascend

//#endregion Ascend

//#region Wanted Level

/**
 * @param {GangGenInfo} gangInformation
 * @returns {bool} true if the gang should lower its wanted level, false otherwise
 */
export function shouldLowerWantedLevel(gangInformation) {
  if (gangInformation.wantedLevelGainRate < 0) {
    // Wanted level is decreasing
    return false;
  }

  return gangInformation.wantedPenalty < wantedPenaltySafeThreshold;
}

/**
 * Checks if the gang can choose a task with a better focus gain even if it means raising the
 * wanted level.
 *
 * @param {GangGenInfo} gangInformation
 * @returns {bool} true if the gang can raise its wanted level, false otherwise
 */
export function canRaiseWantedLevel(gangInformation) {
  return (
    gangInformation.wantedLevelGainRate < wantedGainRaiseMax &&
    gangInformation.wantedPenalty >= wantedPenaltyRaiseThreshold
  );
}

//#endregion Wanted Level
