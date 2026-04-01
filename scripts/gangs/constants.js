/**
 * Constants for Gang management.
 *
 * These constants are suitable for both Hacking and Combat gangs.
 */

export const memberNamePrefix = "Keves #";

export const scriptHackingGang = "gangs/hacking_gang.js";
// TODO: not implemented yet
export const scriptCombatGang = "gang/combat_gang.js";

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
// Money and respect gains multiplied by this number
export const wantedPenaltyMax = 0.9;
// const wantedLevelMax = 1000;

// Wanted Level : Raise
// When the wanted level is under these thresholds, we can focus on raising respect and money gain
export const wantedGainSafeThreshold = 1;
export const wantedPenaltySafeThreshold = 0.1;
