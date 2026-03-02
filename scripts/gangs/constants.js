/**
 * Constants for Gang management.
 * 
 * These constants are suitable for both Hacking and Combat gangs.
 */

export const recuitmentMaxWaitTimeSeconds = 60 * 5; // 5 minutes

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
// Wanted level penalty - you want to keep wanted level penalry below 10%
export const wantedPenaltyMax = 10;