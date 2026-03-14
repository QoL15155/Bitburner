import {
  printError,
  printInfo,
  print,
  printLogInfo,
  printLogWarn,
  printWarn,
} from "/utils/print";
import { doConversion, formatTimeSeconds } from "/utils/formatters";
import {
  memberNamePrefix,
  findMemberHighestHackingLevel,
  findMemberLowestHackingLevel,
  findMemberHighestWantedLevel,
} from "./utils";
import { recruitmentMaxWaitTimeSeconds, wantedPenaltyMax } from "./constants";

/**
 * Utility functions for *General* gang management.
 *
 * Suitable for both Hacking and Combat gangs.
 */

//#region Recruitment

/**
 * Recruits new gang members until the maximum number of members is reached.
 * Each new member is assigned the default task.
 *
 * @param {NS} ns - the Netscript environment
 * @param {string} defaultTask - the task to assign to new members
 * @return {string[]} - the list of new members recruited
 *
 * Note: The default task should be a valid task for the gang type (hacking or combat).
 *       For example, "Ransomware" is a valid task for hacking gangs, while "Vigilante Justice" is a valid task for combat gangs.
 */
export function recruitGangMembers(ns, defaultTask) {
  const fname = "recruitGangMembers";
  let membersCount = ns.gang.getMemberNames().length;
  let newMembers = [];

  while (ns.gang.canRecruitMember()) {
    membersCount++;
    const memberName = `${memberNamePrefix}${membersCount}`;
    if (!ns.gang.recruitMember(memberName)) {
      printError(
        ns,
        `[${fname}] Failed to recruit member ${memberName}. Current member count: ${membersCount - 1} `,
      );
      return;
    }
    ns.gang.setMemberTask(memberName, defaultTask);
    // membersTraining.push(memberName);
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
  WaitingForRespect: "Waiting For respect",
  // Try to ascend current members
  Ascending: "Ascend current members",
};

/**
 * Determines whether should wait for respect to recruit the next member before
 * ascending current members.
 *
 * @param {NS} ns - the Netscript environment
 * @param {GangInformation} gangInformation - the current gang information
 * @return {boolean} - true if should wait for respect to recruit the next member, false otherwise
 */
export function getRecruitmentStatus(ns) {
  const fname = "getRecruitmentStatus";
  const gangInformation = ns.gang.getGangInformation();
  if (gangInformation.respectForNextRecruit === Infinity) {
    return RecruitmentStatus.DoneRequirement;
  }

  // Check if we are close to recruiting the next member.
  // If we are close, wait for respect to recruit the next member instead of ascending current members.
  const respectNextRecruit =
    gangInformation.respectForNextRecruit - gangInformation.respect;
  const respectGainRatePerSecond = gangInformation.respectGainRate * 5;
  const timeToNextRecruitSeconds =
    respectNextRecruit / respectGainRatePerSecond;
  let message = `[${fname}] Respect needed: ${doConversion(respectNextRecruit)}, `;
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

export function ascendGangMembers(ns) {
  const fname = "ascendGangMembers";
  const members = ns.gang.getMemberNames();

  for (let memberName of members) {
    const canAscend = shouldAscendMember(ns, memberName);
    if (canAscend) {
      const result = ns.gang.ascendMember(memberName);
      if (result) {
        printLogInfo(
          ns,
          `[${fname}] Ascended member ${memberName}. Result: ${JSON.stringify(result)}`,
        );
      } else {
        printError(ns, `[${fname}] Failed to ascend member ${memberName}`);
      }
    }
  }
}

function shouldAscendMember(ns, memberName) {
  const fname = "shouldAscendMember";
  const ascensionResult = ns.gang.getAscensionResult(memberName);
  if (ascensionResult === null || ascensionResult === undefined) {
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
