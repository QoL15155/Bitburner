import {
  recruitmentMaxWaitTimeSeconds,
  wantedGainRaiseMax,
  wantedPenaltyRaiseThreshold,
  wantedPenaltySafeThreshold,
} from "./constants.js";
import { formatGainRate, formatTimeSeconds } from "/utils/formatters.js";
import { printError } from "/utils/print.js";

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
