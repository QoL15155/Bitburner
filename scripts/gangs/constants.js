/**
 * Constants for Gang management.
 *
 * These constants are suitable for both Hacking and Combat gangs.
 */

export const memberNamePrefix = "Keves";

// Gang Warfare
// =====================
// If the gang's minimum clash win chance is under this threshold, disengage in warfare to avoid losses
export const clashWinChanceThreshold = 0.7;

//#region File names

export const scriptHackingGang = "gangs/hacking_gang.js";
// TODO: not implemented yet
export const scriptCombatGang = "gangs/combat_gang.js";

export const recruitmentMaxWaitTimeSeconds = 60 * 5; // 5 minutes

// Task lists
export const tasksJsonHackingFilename = "data/gang_tasks_hacking.json";
export const tasksJsonCombatFilename = "data/gang_tasks_combat.json";

// Gang equipment mapping
export const equipmentJsonFilename = "data/gang_equipment.json";

//#endregion File names

//#region Wanted Level

// Wanted Level
// =====================

// Wanted Penalty
// ----------------------
// WantedPenalty = respect / (respect + wantedLevel)
// Money and respect gains multiplied by this number
// For Example see "Gang/formulas/formulas.ts" calculateMoneyGain
//      moneyGain=(baseMoneyGain*respectGain * wantedPenalty)

// Wanted Level : Lower
// Should be below 10% (this is the inverse)
// Lower the wanted level when penalty is lower than this threshold
export const wantedPenaltySafeThreshold = 0.9;

// Wanted Level : Raise
// Raise the wanted level when both conditions are met:
// Penalty is below 5% (this is the inverse)
export const wantedPenaltyRaiseThreshold = 0.95;
// Wanted level gain rate is under this threshold
export const wantedGainRaiseMax = 1;

//#endregion Wanted Level

//#region Equipment

// Gang Equipment
// =====================
// Limits of the percentage of equipment (augmentations + upgrades) cost out of the player's money.
// Note that these don't take into account the current augmentations (or upgrades) the gang members have.
//
// Buy equipment:
// User didn't ask to buy equipment, but the percentage is lower than min
const minAugmentationsCostPercent = 0.01;
const minUpgradesCostPercent = 0.0001;
// Don't buy equipment:
// User asked to buy equipment, but the percentage is higher than max
const maxAugmentationsCostPercent = 0.1;
const maxUpgradesCostPercent = 0.001;

export const BuyLimits = {
  augmentations: {
    type: "Augmentations",
    minCostPercent: minAugmentationsCostPercent,
    maxCostPercent: maxAugmentationsCostPercent,
  },
  upgrades: {
    type: "Upgrades",
    minCostPercent: minUpgradesCostPercent,
    maxCostPercent: maxUpgradesCostPercent,
  },
};

//#endregion Equipment

//#region Focus&Tasks

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

/**
 * Recommended number of ethical members in a hacking gang until it is formed.
 * This is to maintain a balance between respect gain and wanted level gain.
 */
export const normalEthicalMembers = 2;

const allTrainingTasks = ["Train Hacking", "Train Charisma", "Train Combat"];
const allEthicalTasks = ["Ethical Hacking", "Vigilante Justice"];
export const powerTaskName = "Territory Warfare";
export const unassignedTaskName = "Unassigned";

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

//#endregion Focus&Tasks
