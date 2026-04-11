/**
 * Constants for Gang management.
 *
 * These constants are suitable for both Hacking and Combat gangs.
 */

export const memberNamePrefix = "Keves #";

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

// Wanted Lower : Lower
// We want to keep the wanted level penalty below 10% (this is the inverse).
// WantedPenalty = respect / (respect + wantedLevel)
// Money and respect gains multiplied by this number
// For Example see "Gang/formulas/formulas.ts" calculateMoneyGain
//  moneyGain=(baseMoneyGain*respectGain * wantedPenalty)
export const wantedPenaltyMax = 0.9;
// const wantedLevelMax = 1000;

// Wanted Level : Raise
// When the wanted level is under these thresholds, we can focus on raising respect and money gain
export const wantedGainSafeThreshold = 1;
export const wantedPenaltySafeThreshold = 0.95;

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
