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

/**
 * Determines if a gang member should be ascended based on their potential stat gains.
 *
 * @param {NS} ns - the Netscript environment
 * @param {Object} member - the gang member object
 * @returns {boolean} true if the member should be ascended, false otherwise
 */
export function shouldAscendMember(ns, member) {
  const ascensionResult = ns.gang.getAscensionResult(member.name);
  if (ascensionResult == null) {
    // Member cannot be ascended
    return false;
  }

  function shouldAscendForStat(statName) {
    if (statName === "respect") return false;

    const multiplier = ascensionResult[statName];
    if (multiplier >= 2) {
      return true;
    }
    return member[statName] >= 1000 && multiplier >= 1.2;
  }

  return Object.keys(ascensionResult).some((key) => {
    return shouldAscendForStat(key);
  });
}

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
