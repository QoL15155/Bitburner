/**
 * Constants for Gang management.
 *
 * These constants are suitable for both Hacking and Combat gangs.
 */

export const memberNamePrefix = "Keves";

export const scriptHackingGang = "gangs/hacking_gang.js";
// TODO: not implemented yet
export const scriptCombatGang = "gangs/combat_gang.js";

export const recruitmentMaxWaitTimeSeconds = 60 * 5; // 5 minutes

/**
 * Recommended number of ethical members in a hacking gang until it is formed.
 * This is to maintain a balance between respect gain and wanted level gain.
 */
export const normalEthicalMembers = 2;

const maxAscensionLevel = 25;

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

// Gang Equipment
// =====================
// Limits of the percentage of equipment cost out of the player's money.
// Note that these don't take into account the current augmentation the gang members have.
//
// Buy equipment:
// User didn't ask to buy equipment, but the percentage is lower than min
export const minAugmentationsCostPercent = 0.01;
export const minEquipmentCostPercent = 0.0001;
// Don't buy equipment:
// User asked to buy equipment, but the percentage is higher than max
export const maxAugmentationsCostPercent = 0.1;
export const maxEquipmentCostPercent = 0.001;

// Gang Warfare
// =====================
// If the gang's minimum clash win chance is under this threshold, disengage in warfare to avoid losses
export const clashWinChanceThreshold = 0.7;
