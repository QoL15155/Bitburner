import {
  recruitmentMaxWaitTimeSeconds,
  wantedGainSafeThreshold,
  wantedPenaltyMax,
  wantedPenaltySafeThreshold,
} from "./constants.js";
import { formatGainRate, formatTimeSeconds } from "/utils/formatters.js";
import { printError, printLogWarn } from "/utils/print.js";

/**
 * Utility functions for *General* gang management.
 *
 * Suitable for both Hacking and Combat gangs.
 */

//#region Focus & Tasks

/**
 * Enum for gang focus types.
 *
 * Hacking : Recruiting -> Money
 * Combat: Recruiting -> Combat -> Money (when territory is 100%)
 */
export const GangFocus = Object.freeze({
  RECRUITING: "Recruiting",
  MONEY: "Money",
  COMBAT: "Combat",
});

const allTrainingTasks = ["Train Hacking", "Train Charisma", "Train Combat"];
const allEthicalTasks = ["Ethical Hacking", "Vigilante Justice"];
export const powerTaskName = "Territory Warfare";

export function isEthicalTask(taskName) {
  return allEthicalTasks.includes(taskName);
}

export function isTrainingTask(taskName) {
  return allTrainingTasks.includes(taskName);
}

export const TrainingTasks = {
  [GangFocus.MONEY]: ["Train Hacking", "Train Charisma"],
  [GangFocus.COMBAT]: ["Train Combat"],
};

export const EthicalTasks = {
  [GangFocus.MONEY]: ["Ethical Hacking"],
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
  const respectNeeded = gangInformation["respectForNextRecruit"];
  if (respectNeeded === Infinity) {
    return Infinity;
  }

  if (respectNeeded <= gangInformation.respect) {
    return 0;
  }

  return respectNeeded - gangInformation.respect;
}

function canRecruit(gangInformation) {
  const respectNeeded = gangInformation["respectForNextRecruit"];
  return respectNeeded <= gangInformation.respect;
}

/**
 * Recruits new gang members until we cannot recruit any more members.
 *
 * @param {NS} ns - the Netscript environment
 * @param {MyGang} myGang - the gang management object
 */
export function recruitGangMembers(ns, myGang) {
  const fname = "recruitGangMembers";

  while (canRecruit(ns.gang.getGangInformation())) {
    const memberName = myGang.getNewMemberName();
    if (!ns.gang.recruitMember(memberName)) {
      printError(
        ns,
        `[${fname}] Failed to recruit member ${memberName}. Current member count: ${myGang.memberCount()} `,
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

  let message = `[${fname}] Respect needed: ${ns.formatNumber(neededRespect)}, `;
  message += `gain: ${formatGainRate(gangInformation.respectGainRate)} `;
  message += `=> Time to next recruit: ${formatTimeSeconds(timeToNextRecruitSeconds)}.`;
  ns.printf(message);

  myGang.shouldWaitAscend =
    timeToNextRecruitSeconds <= recruitmentMaxWaitTimeSeconds;
}

//#endregion Recruitment

//#region Ascend

/** Determines if a gang member should be ascended based on their potential stat gains.
 * Criteria: Ascend if the member will gain at least 2 levels in any stat after ascending.
 * @param {NS} ns - the Netscript environment
 * @param {string} memberName - the name of the gang member
 * @returns {boolean} true if the member should be ascended, false otherwise
 */
export function shouldAscendMember(ns, memberName) {
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
  CanBeRaised: "Can be Raised",
};

/**
 * @param {NS} ns
 * @param {GangGenInfo} gangInformation
 * @returns {bool} true if the gang should focus on lowering wanted level, false otherwise
 */
function shouldLowerWantedLevel(ns, gangInformation) {
  const fname = "shouldLowerWantedLevel";

  if (gangInformation.wantedLevelGainRate < 0) {
    // Wanted level is decreasing
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
  const wantedPenalty = gangInformation.wantedPenalty;

  // Safe
  if (
    gangInformation.wantedLevelGainRate > wantedGainSafeThreshold ||
    (wantedPenalty > wantedPenaltyMax &&
      wantedPenalty < wantedPenaltySafeThreshold)
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
  return WantedLevelStatus.CanBeRaised;

  function displaySafeStatus() {
    if (safeCounter % 10 !== 0) return;
    safeCounter = 0;

    const gainRate = formatGainRate(gangInformation.wantedLevelGainRate);
    const penalty = ns.formatNumber(wantedPenalty);

    let message = `Playing it safe.`;
    message += ` Wanted level gain rate: ${gainRate}.`;
    message += ` Wanted penalty: ${penalty}.`;
    ns.printf(`[${fname}] ${message}`);
  }
}

//#endregion Wanted Level
