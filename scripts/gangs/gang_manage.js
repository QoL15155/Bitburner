import { printError, printInfo, print, doConversion, formatTime, printLogInfo, printLogWarn, printWarn } from "../utils_print";
import { memberNamePrefix, readGangTasks, 
    findMemberHighestHackingLevel, findMemberLowestHackingLevel, 
    findMemberHighestWantedLevel } from "./utils";
import { recuitmentMaxWaitTimeSeconds } from "./constants";

/** 
 * Utility funciton for *General* gang management.
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
            printError(ns, `[${fname}] Failed to recruit member ${memberName}. Current member count: ${membersCount - 1} `);
            return;
        }
        ns.gang.setMemberTask(memberName, defaultTask);
        // membersTraining.push(memberName);
        newMembers.push(memberName);
    }

    if (newMembers.length > 0) {
        const membersList = newMembers.join(", ");
        printInfo(ns, `[${fname}] Finished recruiting ${newMembers.length}/${membersCount}. New members: ${membersList}`);
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
}

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
    const respectNextRecruit = gangInformation.respectForNextRecruit - gangInformation.respect;
    const respectGainRatePerSecond = gangInformation.respectGainRate * 5;
    const timeToNextRecruitSeconds = respectNextRecruit / respectGainRatePerSecond
    let message = `[${fname}] Respect needed: ${doConversion(respectNextRecruit)}, `;
    message += `gain: ${respectGainRatePerSecond.toFixed(3)}/sec. `;
    message += `=> Time to next recruit: ${formatTime(timeToNextRecruitSeconds)}.`;
    ns.printf(message);

    const shouldWait = timeToNextRecruitSeconds <= recuitmentMaxWaitTimeSeconds;
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
                printLogInfo(ns, `[${fname}] Ascended member ${memberName}. Result: ${JSON.stringify(result)}`);
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
}

//#endregion Ascend