/**
 * Constants for Gang management.
 *
 * These constants are suitable for both Hacking and Combat gangs.
 */

export const recruitmentMaxWaitTimeSeconds = 60 * 5; // 5 minutes

/**
 * Recommended number of ethical members in a hacking gang until it is formed.
 * This is to maintain a balance between respect gain and wanted level gain.
 */
export const normalEthicalMembers = 2;

const maxAscensionLevel = 25;

// Wanted Level
// =====================
// If the wanted level gain is higher than this threshold, we will prioritize lowering the wanted level.
const wantedGainThreshold = 1.5;
const wantedLevelMax = 1000;
// We want to keep the wanted level penalty below 10% (this is the inverse).
// Money and respect gains multiplied by this number
export const wantedPenaltyMax = 0.9;
