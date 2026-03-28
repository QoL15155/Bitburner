import {
  printError,
  printInfo,
  print,
  printLogInfo,
  printLogWarn,
  printWarn,
} from "/utils/print.js";
import {
  doConversion,
  formatTimeSeconds,
  formatWantedLevelGainRate,
} from "/utils/formatters.js";
import { memberNamePrefix } from "./utils.js";
import {
  recruitmentMaxWaitTimeSeconds,
  wantedGainSafeThreshold,
  wantedPenaltyMax,
  wantedPenaltySafeThreshold,
} from "./constants.js";

/**
 * Utility functions for *General* gang management.
 *
 * Suitable for both Hacking and Combat gangs.
 */

//#region Recruitment

function getRespectNeededForNextRecruit(gangInformation) {
  if (gangInformation.respectForNextRecruit === Infinity) {
    return Infinity;
  }

  if (gangInformation.respectForNextRecruit <= gangInformation.respect) {
    return 0;
  }

  return gangInformation.respectForNextRecruit - gangInformation.respect;
}

/**
 * Recruits new gang members until we cannot recruit any more members.
 * Each new member is assigned the default task.
 *
 * @param {NS} ns - the Netscript environment
 * @param {string} defaultTask - the task to assign to new members
 *  Should be a valid task for the gang type (hacking or combat). For example:
 *    - "Ransomware" is a valid task for hacking gangs,
 *    - "Vigilante Justice" is a valid task for combat gangs.
 * @param {number} membersCount - the current number of members
 * @return {string[]} - the list of new members recruited
 */
export function recruitGangMembers(ns, defaultTask, membersCount) {
  const fname = "recruitGangMembers";
  let newMembers = [];

  while (getRespectNeededForNextRecruit(ns.gang.getGangInformation()) === 0) {
    membersCount++;
    const memberName = `${memberNamePrefix}${membersCount}`;
    if (!ns.gang.recruitMember(memberName)) {
      printError(
        ns,
        `[${fname}] Failed to recruit member ${memberName}. Current member count: ${membersCount - 1} `,
      );
      return newMembers;
    }
    ns.gang.setMemberTask(memberName, defaultTask);
    newMembers.push(memberName);
  }

  if (newMembers.length > 0) {
    const membersList = newMembers.join(", ");
    printInfo(
      ns,
      `[${fname}] Finished recruiting ${newMembers.length}/${membersCount}. New members: ${membersList}`,
    );
  }
  return newMembers;
}

export const RecruitmentStatus = {
  // Reached maximum number of members.
  DoneRequirement: "Done Requirement",
  // Close to recruiting next member
  WaitingForRespect: "Waiting for respect",
  // Try to ascend current members
  Ascending: "Ascend current members",
};

/**
 * Determines whether should wait for respect to recruit the next member
 * before ascending current members.
 *
 * @param {NS} ns - the Netscript environment
 * @return {boolean} true if should wait for respect to recruit the next member
 */
export function getRecruitmentStatus(ns) {
  const fname = "getRecruitmentStatus";
  const gangInformation = ns.gang.getGangInformation();

  // Check if we are close to recruiting the next member.
  // If we are close, wait for respect to recruit the next member instead of ascending current members.
  const neededRespect = getRespectNeededForNextRecruit(gangInformation);
  if (neededRespect === Infinity) {
    return RecruitmentStatus.DoneRequirement;
  }

  // respect gain rate is per game cycle
  const respectGainRatePerSecond = gangInformation.respectGainRate * 5;
  const timeToNextRecruitSeconds = neededRespect / respectGainRatePerSecond;

  let message = `[${fname}] Respect needed: ${doConversion(neededRespect)}, `;
  message += `gain: ${respectGainRatePerSecond.toFixed(3)}/sec. `;
  message += `=> Time to next recruit: ${formatTimeSeconds(timeToNextRecruitSeconds)}.`;
  ns.printf(message);

  const shouldWait = timeToNextRecruitSeconds <= recruitmentMaxWaitTimeSeconds;
  if (shouldWait) {
    return RecruitmentStatus.WaitingForRespect;
  }
  return RecruitmentStatus.Ascending;
}

//#endregion Recruitment

//#region Ascend

/**
 * Ascends gang members if they meet the criteria.
 * Criteria: Ascend if the member will gain at least 2 levels in any stat after ascending.
 *
 * @param {NS} ns - the Netscript environment
 * @param {string[]} memberNames - the list of gang member names to check for ascension
 */
export function ascendGangMembers(ns, memberNames) {
  const fname = "ascendGangMembers";

  for (const memberName of memberNames) {
    if (!shouldAscendMember(ns, memberName)) {
      continue;
    }

    const ascendResult = ns.gang.ascendMember(memberName);
    if (ascendResult) {
      printLogInfo(
        ns,
        `[${fname}] Ascended member ${memberName}. Result: ${JSON.stringify(ascendResult)}`,
      );
    } else {
      printError(ns, `[${fname}] Failed to ascend member ${memberName}`);
    }
  }
}

function shouldAscendMember(ns, memberName) {
  const ascensionResult = ns.gang.getAscensionResult(memberName);
  if (ascensionResult == null) {
    // Member cannot be ascended
    return false;
  }

  if (Math.floor(ascensionResult.hack) >= 2) {
    return true;
  }
  if (Math.floor(ascensionResult.str) >= 2) {
    return true;
  }
  if (Math.floor(ascensionResult.def) >= 2) {
    return true;
  }
  if (Math.floor(ascensionResult.dex) >= 2) {
    return true;
  }
  if (Math.floor(ascensionResult.agi) >= 2) {
    return true;
  }
  if (Math.floor(ascensionResult.cha) >= 2) {
    return true;
  }

  return false;
}

//#endregion Ascend

//#region Wanted Level

export const WantedLevelStatus = {
  ShouldLower: "Should Lower",
  Safe: "Safe",
  CanBeRaise: "Can Be Raise",
};

/**
 * @param {NS} ns
 * @param {GangGenInfo} gangInformation
 * @returns {bool} true if the gang should focus on lowering wanted level, false otherwise
 */
function shouldLowerWantedLevel(ns, gangInformation) {
  const fname = "shouldLowerWantedLevel";

  if (gangInformation.wantedLevelGainRate <= 0) {
    return false;
  }

  if (gangInformation.wantedPenalty < wantedPenaltyMax) {
    const wantedGainRatePerSecond = formatWantedLevelGainRate(
      gangInformation.wantedLevelGainRate,
    );
    printLogWarn(
      ns,
      `[${fname}] Wanted penalty ${gangInformation.wantedPenalty} has reached the maximum. Wanted level: ${gangInformation.wantedLevel}, Wanted Gain Rate: ${wantedGainRatePerSecond}`,
    );
    return true;
  }

  /*
  if (gangInformation.wantedLevel > wantedLevelMax) {
    return true;
  }
  if (wantedGainRatePerSecond > wantedGainThreshold) {
    return true;
  }
  */
  return false;
}

/** Counter for safe status messages to avoid spamming
 * @type {number}
 */
let safeCounter = 0;

/**
 * @param {NS} ns
 * @param {GangGenInfo} gangInformation
 * @returns {WantedLevelStatus} the wanted level status of the gang: lower/safe/raise
 */
export function getWantedLevelStatus(ns, gangInformation) {
  const fname = "getWantedLevelStatus";

  // Safe
  if (
    gangInformation.wantedLevelGainRate > wantedGainSafeThreshold ||
    gangInformation.wantedPenalty < wantedPenaltySafeThreshold
  ) {
    displaySafeStatus();
    safeCounter++;
    return WantedLevelStatus.Safe;
  }

  safeCounter = 0;

  if (shouldLowerWantedLevel(ns, gangInformation)) {
    return WantedLevelStatus.ShouldLower;
  }

  // Wanted level gain rate it low
  return WantedLevelStatus.CanBeRaise;

  function displaySafeStatus() {
    if (safeCounter % 10 !== 0) return;
    safeCounter = 0;

    let message = `Playing it safe.`;
    message += ` Wanted level gain rate: ${formatWantedLevelGainRate(gangInformation.wantedLevelGainRate)}.`;
    message += ` Wanted penalty: ${gangInformation.wantedPenalty.toFixed(3)}.`;
    ns.printf(message);
  }
}

//#endregion Wanted Level
