import {
  printError,
  printInfo,
  print,
  printLogInfo,
  printLogWarn,
  printWarn,
} from "/utils/print.js";
import { doConversion, formatTimeSeconds } from "/utils/formatters.js";
import {
  memberNamePrefix,
  findMemberHighestHackingLevel,
  findMemberLowestHackingLevel,
  findMemberHighestWantedLevel,
} from "./utils.js";
import {
  recruitmentMaxWaitTimeSeconds,
  wantedPenaltyMax,
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
 * @summary Recruits new gang members until the maximum number of members is reached.
 *
 * Each new member is assigned the default task.
 *
 * @param {NS} ns - the Netscript environment
 * @param {string} defaultTask - the task to assign to new members
 *  Should be a valid task for the gang type (hacking or combat).
 *  For example, "Ransomware" is a valid task for hacking gangs, while "Vigilante Justice" is a valid task for combat gangs.
 * @param {number} membersCount - the current number of members
 *
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
 * @summary Determines whether should wait for respect to recruit the next member
 * before ascending current members.
 *
 * @param {NS} ns - the Netscript environment
 * @param {GangInformation} gangInformation - the current gang information
 * @return {boolean} - true if should wait for respect to recruit the next member, false otherwise
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
 * @summary Ascends gang members if they meet the criteria
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

  const wantedGainRatePerSecond = gangInformation.wantedLevelGainRate * 5;

  if (wantedGainRatePerSecond <= 0) {
    return false;
  }

  if (gangInformation.wantedPenalty < wantedPenaltyMax) {
    printLogWarn(
      ns,
      `[${fname}] Wanted penalty ${gangInformation.wantedPenalty} has reached the maximum. Wanted level: ${gangInformation.wantedLevel}, wanted gain rate: ${wantedGainRatePerSecond.toFixed(3)}/sec`,
    );
    return true;
  }

  // // if (gangInformation.wantedLevel > wantedLevelMax) {
  // //     printLogWarn(ns, `[${fname}] Wanted level ${gangInformation.wantedLevel} has reached the maximum level ${wantedLevelMax}. Penalty: ${gangInformation.wantedPenalty}.`);
  // //     return true;
  // // }

  // // if (wantedGainRatePerSecond > wantedGainThreshold) {
  // //     printLogWarn(ns, `[${fname}] Wanted level gain rate ${wantedGainRatePerSecond.toFixed(3)}/sec has reached the threshold ${wantedGainThreshold}. Penalty: ${gangInformation.wantedPenalty}.`);
  // //     return true;
  // }
  return false;
}

/**
 * @param {NS} ns
 * @param {GangGenInfo} gangInformation
 * @returns {WantedLevelStatus} the wanted level status of the gang: lower/safe/raise
 */
export function getWantedLevelStatus(ns, gangInformation) {
  const fname = "getWantedLevelStatus";
  if (shouldLowerWantedLevel(ns, gangInformation)) {
    return WantedLevelStatus.ShouldLower;
  }

  if (gangInformation.wantedLevelGainRate > 0) {
    return WantedLevelStatus.Safe;
  }

  // Wanted level gain rate it low
  return WantedLevelStatus.CanBeRaise;
}

//#endregion Wanted Level
