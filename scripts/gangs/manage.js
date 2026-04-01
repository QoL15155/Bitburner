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
  formatGainRate,
} from "/utils/formatters.js";
import { memberNamePrefix } from "./constants.js";
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

//#region Focus & Tasks

export const GangFocus = {
  RECRUITING: 0,
  HACKING: 1,
  COMBAT: 2,
};

const allTrainingTasks = ["Train Hacking", "Train Charisma", "Train Combat"];
const allEthicalTasks = ["Ethical Hacking", "Vigilante Justice"];

export function isEthicalTask(taskName) {
  return allEthicalTasks.includes(taskName);
}

export function isTrainingTask(taskName) {
  return allTrainingTasks.includes(taskName);
}

export const TrainingTasks = {
  [GangFocus.HACKING]: ["Train Hacking", "Train Charisma"],
  [GangFocus.COMBAT]: ["Train Combat"],
};

export const EthicalTasks = {
  [GangFocus.HACKING]: ["Ethical Hacking"],
  [GangFocus.COMBAT]: ["Vigilante Justice"],
};

export function getGangTrainingTask(gangFocus) {
  return TrainingTasks[gangFocus][0];
}

export function getGangEthicalTask(gangFocus) {
  return EthicalTasks[gangFocus][0];
}

//#endregion Focus & Tasks

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

function canRecruit(gangInformation) {
  return gangInformation.respectForNextRecruit <= gangInformation.respect;
}

/**
 * Recruits new gang members until we cannot recruit any more members.
 *
 * @param {NS} ns - the Netscript environment
 * @param {MyGang} myGang - the gang management object
 */
export function recruitGangMembers(ns, myGang) {
  const fname = "recruitGangMembers";
  let membersCount = myGang.memberCount();

  while (canRecruit(ns.gang.getGangInformation())) {
    membersCount++;
    const memberName = `${memberNamePrefix}${membersCount}`;
    if (!ns.gang.recruitMember(memberName)) {
      printError(
        ns,
        `[${fname}] Failed to recruit member ${memberName}. Current member count: ${membersCount - 1} `,
      );
      return;
    }

    myGang.addNewMember(memberName);
  }
}

/**
 * Updates the recruitment status of the gang.
 * Should be called after recruiting new members and before deciding whether to ascend members.
 *
 * @param {NS} ns - the Netscript environment
 * @param {MyGang} myGang - the gang management object
 */
export function handleRecruitmentStatus(ns, myGang) {
  const fname = "handleRecruitmentStatus";
  const gangInformation = ns.gang.getGangInformation();

  // Check if we are close to recruiting the next member.
  // If we are close, wait for respect to recruit the next member instead of ascending current members.
  const neededRespect = getRespectNeededForNextRecruit(gangInformation);
  if (neededRespect === Infinity) {
    myGang.stopRecruit();
    return;
  }

  // respect gain rate is per game cycle
  const respectGainRatePerSecond = gangInformation.respectGainRate * 5;
  const timeToNextRecruitSeconds = neededRespect / respectGainRatePerSecond;

  let message = `[${fname}] Respect needed: ${doConversion(neededRespect)}, `;
  message += `gain: ${formatGainRate(gangInformation.respectGainRate)} `;
  message += `=> Time to next recruit: ${formatTimeSeconds(timeToNextRecruitSeconds)}.`;
  ns.printf(message);

  myGang.shouldWaitAscend =
    timeToNextRecruitSeconds <= recruitmentMaxWaitTimeSeconds;
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
    const wantedGainRate = formatGainRate(gangInformation.wantedLevelGainRate);
    printLogWarn(
      ns,
      `[${fname}] Wanted penalty ${gangInformation.wantedPenalty} has reached the maximum. Wanted level: ${gangInformation.wantedLevel}, Wanted Gain Rate: ${wantedGainRate}.`,
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
    message += ` Wanted level gain rate: ${formatGainRate(gangInformation.wantedLevelGainRate)}.`;
    message += ` Wanted penalty: ${gangInformation.wantedPenalty.toFixed(3)}.`;
    ns.printf(message);
  }
}

//#endregion Wanted Level
