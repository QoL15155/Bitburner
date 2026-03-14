import {
  printError,
  printInfo,
  print,
  printLogInfo,
  printLogWarn,
  printWarn,
} from "/utils/print.js";
import { doConversion } from "/utils/formatters.js";
import {
  readGangTasks,
  findMemberHighestHackingLevel,
  findMemberLowestHackingLevel,
  findMemberHighestWantedLevel,
} from "./utils.js";
import {
  recruitGangMembers,
  getRecruitmentStatus,
  RecruitmentStatus,
  ascendGangMembers,
  getWantedLevelStatus,
  WantedLevelStatus,
} from "/gangs/manage.js";
import { normalEthicalMembers } from "./constants.js";

/**
 * Algorithm:
 * 1. Recruit new members until the maximum number of members is reached. Each new member is assigned the default task.
 * 2. Ascend members when they can be ascended.
 * 3. If we can recruit more members, prioritize respect gain to recruit more members.
 *
 * Tasks:
 * - Recruited members: first assign a **Training** task ("Train Hacking")
 * - Low Wanted Level:
 *   - *Training* members exists: Look for task with:
 *      - FOCUS Gain (money or respect) => lower difficulty => lower wanted level.
 *
 */

// Tasks
// =====================
const trainingTasks = ["Train Hacking", "Train Charisma", "Train Combat"];
// const trainingTasks = ["Train Hacking", "Train Charisma"];
// All charisma tasks are also 'hacking tasks'
// const charismaTasks = ["Phishing", "Identity Theft", "Fraud & Counterfeiting", "Money Laundering", "Cyberterrorism"];
// const hackingTasks = ["Ransomware", "DDoS Attacks", "Plant Virus"];
const lowerWantedLevelTasks = ["Ethical Hacking", "Vigilante Justice"];
const territoryTask = "Territory Warfare";

// New member should start with a training task to raise skill
const defaultTask = trainingTasks[0];

/* Variables */

let tasksList = null;
// Only include tasks that baseMoney > 0.
let ascendingTasksByMoneyGain = null;

// Members
// =====================
// Members doing "Ethical Hacking"
let membersEthical = [];
let membersWorking = [];
let membersTraining = [];

//#region Wanted Level

function wantedLevelGainRateString(gangInformation) {
  return `${gangInformation.wantedLevelGainRate.toFixed(3)}/sec`;
}

/**
 * Handles the wanted level of the gang.
 * When the wanted level gain rate is too high, it assigns members to lower wanted level tasks to reduce it.
 * When the wanted level gain rate is low, it assigns members to higher money or respect gain tasks to increase it.
 *
 * Prioritizes respect gain if we can recruit more members,
 * otherwise prioritizes lowering wanted level if the gain is too high.
 *
 * @param {NS} ns
 * @param {GangGenInfo} gangInformation
 * @param {bool} isFocusRespect
 */
function handleWantedLevel(ns, gangInformation, isFocusRespect) {
  const fname = "handleWantedLevel";
  const focusString = isFocusRespect ? "Respect" : "Money";

  const wantedLevelStatus = getWantedLevelStatus(ns, gangInformation);
  const wantedLevelGainRate = wantedLevelGainRateString(gangInformation);

  if (wantedLevelStatus === WantedLevelStatus.Safe) {
    return;
  }

  if (wantedLevelStatus === WantedLevelStatus.ShouldLower) {
    printLogInfo(
      ns,
      `[${fname}] Lowering wanted level (Gain rate: ${wantedLevelGainRate}). ${focusString} focus`,
    );
    if (isFocusRespect) {
      throw `[${fname}] lowerWantedLevelRespectFocus is not implemented yet.`;
    } else {
      lowerWantedLevelMoneyFocus(ns);
    }
    return;
  }

  printLogInfo(
    ns,
    `[${fname}] Wanted level gain rate is low (${wantedLevelGainRate}). Raising ${focusString} gain`,
  );
  if (isFocusRespect) {
    // Prioritize respect gain if we can recruit more members
    throw `[${fname}] raiseRespectGain is not implemented yet.`;
  } else {
    raiseMoneyGain(ns);
  }
}

function lowerWantedLevelMoneyFocus(ns) {
  const fname = "lowerWantedLevelMoneyFocus";

  if (membersTraining.length > 0) {
    const memberName = membersTraining.shift();
    ns.gang.setMemberTask(memberName, "Ethical Hacking");
    membersEthical.push(memberName);
    // membersTraining = membersTraining.filter(name => name !== memberName);
    ns.printf(
      `[${fname}] Assigned member ${memberName} from training to 'Ethical Hacking' to reduce wanted level gain.`,
    );
    return;
  }

  // Reduce task wanted level in working members.
  const highestWantedWorker = findMemberHighestWantedLevel(ns, membersWorking);

  if (membersEthical.length < normalEthicalMembers) {
    workingMemberToEthical(highestWantedWorker);
    return;
  }

  // Find the worker with the highest wanted level gain and assign them to a lower wanted level task.

  // Ascending list
  const moneyTasksByWantedLevel = tasksList
    .filter((task) => task.baseMoney > 0)
    .sort((a, b) => a.baseWanted - b.baseWanted);
  const currentTaskIndex = moneyTasksByWantedLevel.findIndex(
    (task) => task.name === highestWantedWorker.task,
  );
  if (currentTaskIndex === -1) {
    throw `[${fname}] Member ${highestWantedWorker.name} is doing an unknown task ${highestWantedWorker.task}`;
  }
  if (currentTaskIndex === 0) {
    // Worker's task is already the task with the lowest wanted level, we cannot reduce more the wanted level gain.
    workingMemberToEthical(highestWantedWorker);
    return;
  }

  const currentTask = moneyTasksByWantedLevel[currentTaskIndex];
  const nextTask = moneyTasksByWantedLevel[currentTaskIndex - 1];
  ns.gang.setMemberTask(highestWantedWorker.name, nextTask.name);
  ns.printf(
    `[${fname}] Assigned member ${highestWantedWorker.name} task from ${currentTask.name} to task ${nextTask.name}.`,
  );

  function workingMemberToEthical(member) {
    const memberTask = member.task;
    ns.gang.setMemberTask(member.name, "Ethical Hacking");
    membersEthical.push(member.name);
    membersWorking = membersWorking.filter((name) => name !== member.name);
    ns.printf(
      `[${fname}] Assigned member ${member.name} from '${memberTask}' to 'Ethical Hacking' to reduce wanted level gain.`,
    );
  }
}

// Prioritize money gain
function raiseMoneyGain(ns) {
  const fname = "raiseMoneyGain";

  if (membersTraining.length > 0) {
    // FIXME: take training member with best experience?
    const memberName = membersTraining.shift();
    const bestTask = ascendingTasksByMoneyGain.reduce((prev, current) =>
      current.difficulty < prev.difficulty ? current : prev,
    );
    ns.gang.setMemberTask(memberName, bestTask.name);
    membersWorking.push(memberName);
    ns.printf(
      `[${fname}] Assigned member ${memberName} to task ${bestTask.name} for more money gain.`,
    );
    return;
  }

  if (membersEthical.length > normalEthicalMembers) {
    // More than 2 members are doing ethical hacking, we can assign one of them to a money task.
    assignEthicalMemberToWorkingTask();
    return;
  }

  // Search among working members if someone can be assigned to a better money task.
  if (tryUpgradeWorkingMemberMoney(ns)) {
    return;
  }

  // No member can be assigned to a better money task - swap ethical with lowest hacking-level member
  const worstWorkingMember = findMemberLowestHackingLevel(ns, membersWorking);
  const bestEthicalMember = findMemberHighestHackingLevel(ns, membersEthical);
  if (worstWorkingMember.hack < bestEthicalMember.hack) {
    // Swap between them
    ns.gang.setMemberTask(worstWorkingMember.name, "Ethical Hacking");
    membersWorking = membersWorking.filter(
      (name) => name !== worstWorkingMember.name,
    );
    membersEthical.push(worstWorkingMember.name);

    ns.gang.setMemberTask(bestEthicalMember.name, worstWorkingMember.task);
    membersEthical = membersEthical.filter(
      (name) => name !== bestEthicalMember.name,
    );
    membersWorking.push(bestEthicalMember.name);

    ns.printf(
      `[${fname}] Swapped member ${worstWorkingMember.name} with ${bestEthicalMember.name} to increase money gain.`,
    );
    return;
  }

  // There is no working member with lower hacking level than ethical members. Remove Ethical member
  assignEthicalMemberToWorkingTask();
  return;

  function assignEthicalMemberToWorkingTask() {
    const memberName = findMemberNameLowestWantedLevel(ns, membersEthical);
    const bestTask = ascendingTasksByMoneyGain.reduce((prev, current) =>
      current.difficulty < prev.difficulty ? current : prev,
    );
    ns.gang.setMemberTask(memberName, bestTask.name);
    membersWorking.push(memberName);
    // Remove member from ethical list
    membersEthical = membersEthical.filter((name) => name !== memberName);
    printLogInfo(
      ns,
      `[${fname}] Assigned member ${memberName} from Ethical Hacking to task ${bestTask.name} for more money gain.`,
    );
  }
}

/**
 * Among ethical members, find the member with the lowest wanted level gain.
 * Note: we want to keep the most "powerful" ethical member.
 */
function findMemberNameLowestWantedLevel(ns, membersEthical) {
  if (membersEthical.length === 1) {
    return membersEthical[0];
  }
  const members = membersEthical.map((memberName) =>
    ns.gang.getMemberInformation(memberName),
  );
  const bestMember = members.reduce((prev, current) => {
    return current.wantedLevelGain < prev.wantedLevelGain ? current : prev;
  });
  return bestMember.name;
}

/**
 * Tries to find the working member with the lowest money gain task and assign them to the next better money gain task.
 */
function tryUpgradeWorkingMemberMoney(ns) {
  const fname = "tryUpgradeWorkingMemberMoney";

  const members = membersWorking.map((memberName) =>
    ns.gang.getMemberInformation(memberName),
  );

  let lowestGainingMember = null;
  let maxTaskIdx = ascendingTasksByMoneyGain.length - 1;

  // ns.printf(ascendingTasksByMoneyGain.map(task => `${task.name} (base money: ${task.baseMoney}, base wanted: ${task.baseWanted})`).join("\n"));

  for (let member of members) {
    const taskIndex = ascendingTasksByMoneyGain.findIndex(
      (task) => task.name === member.task,
    );

    if (taskIndex === -1) {
      throw `[${fname}] Member ${member.name} is doing an unknown task ${member.task}`;
    }

    if (taskIndex < maxTaskIdx) {
      maxTaskIdx = taskIndex;
      lowestGainingMember = member;
    }
  }

  if (lowestGainingMember === null) {
    return false;
  }

  // Update the member with the best money gain task
  const currentTask = ascendingTasksByMoneyGain[maxTaskIdx];
  const nextTask = ascendingTasksByMoneyGain[maxTaskIdx + 1];
  ns.gang.setMemberTask(lowestGainingMember.name, nextTask.name);
  ns.printf(
    `[${fname}] Previous Task: '${currentTask.name}' base money: ${currentTask.baseMoney}. New task base money: ${nextTask.baseMoney}`,
  );
  return true;
}

//#endregion Wanted Level

//#region Main

function sortMemberByTask(ns, memberName) {
  const memberInfo = ns.gang.getMemberInformation(memberName);
  const taskName = memberInfo.task;

  if (trainingTasks.includes(taskName)) {
    if (taskName === "Train Combat") {
      // NOTE: we still allow for "Train Charisma" for hacking gang.
      printWarn(
        ns,
        `${memberName} - is in a **Hacking Gang** but is training combat. Changing to Hacking Training.`,
      );
      ns.gang.setMemberTask(memberName, "Train Hacking");
    }
    membersTraining.push(memberName);
    return;
  }

  if (lowerWantedLevelTasks.includes(taskName)) {
    if (taskName === "Vigilante Justice") {
      printWarn(
        ns,
        `${memberName} - is in a **Hacking Gang** but is doing Vigilante Justice. Changing to Ethical Hacking.`,
      );
      ns.gang.setMemberTask(memberName, "Ethical Hacking");
    }
    membersEthical.push(memberName);
    return;
  }

  if (taskName === territoryTask) {
    printWarn(
      ns,
      `${memberName} - is in a **Hacking Gang** but is doing Territory Warfare. Changing to 'Hacking Training'.`,
    );
    ns.gang.setMemberTask(memberName, "Train Hacking");
    membersTraining.push(memberName);
    return;
  }

  // This is a working member
  membersWorking.push(memberName);
}

function arrangeMembersByTask(ns) {
  // Initialize lists
  membersEthical = [];
  membersWorking = [];
  membersTraining = [];

  for (let memberName of ns.gang.getMemberNames()) {
    sortMemberByTask(ns, memberName);
  }

  let message = `Initial Members: - \n`;
  message += `- Training (${membersTraining.length}): ${membersTraining.join(", ")}\n`;
  message += `- Ethical (${membersEthical.length}): ${membersEthical.join(", ")}\n`;
  message += `- Working (${membersWorking.length}): ${membersWorking.join(", ")}`;
  ns.printf(message);
}

function sanityCheckMembers(ns) {
  const fname = "sanityCheckMembers";
  const memberCount = ns.gang.getMemberNames().length;
  const totalCategorizedMembers =
    membersTraining.length + membersEthical.length + membersWorking.length;
  if (memberCount !== totalCategorizedMembers) {
    throw new Error(
      `[${fname}] Sanity check failed: total members ${memberCount} does not match sum of categorized members ${totalCategorizedMembers}. Training: ${membersTraining.length}, Ethical: ${membersEthical.length}, Working: ${membersWorking.length}`,
    );
  }
}

async function manageGang(ns) {
  // False when maximum number of member has been recruited. True otherwise.
  let canRecruit = true;

  while (true) {
    sanityCheckMembers(ns);

    let shouldWaitAscend = false;
    if (canRecruit) {
      const newMembers = recruitGangMembers(ns, defaultTask);
      for (let memberName of newMembers) {
        membersTraining.push(memberName);
      }

      // Check if should wait to ascend members
      const recruitmentStatus = getRecruitmentStatus(ns);
      switch (recruitmentStatus) {
        case RecruitmentStatus.DoneRequirement:
          printLogInfo(
            ns,
            `Maximum number of gang members has been recruited - ${ns.gang.getMemberNames().length} members.`,
          );
          canRecruit = false;
          break;
        case RecruitmentStatus.WaitingForRespect:
          printLogInfo(
            ns,
            `Waiting to recruit next member before ascending current members.`,
          );
          shouldWaitAscend = true;
          break;
        case RecruitmentStatus.Ascending:
          break;
      }
    }

    if (!shouldWaitAscend) {
      ascendGangMembers(ns);
    }

    // Update members tasks
    const gangInformation = ns.gang.getGangInformation();
    handleWantedLevel(ns, gangInformation, canRecruit);

    // Wait for the next gang update
    const duration = await ns.gang.nextUpdate();
  }
}

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
  const defaultOptions = ["-h", "--help", "--tail"];

  return [...defaultOptions];
}

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([
    ["help", false],
    ["h", false],
  ]);
  if (args.help || args.h) {
    ns.tprint(`Usage: run ${ns.getScriptName()}`);
    ns.tprint("");
    ns.tprint("Hacking Gang Running Script");
    ns.tprint("=============================");
    ns.tprint("");
    ns.tprint("Manages a Hacking Gang members and their tasks.");
    ns.tprint(
      "Automatically recruits new members, ascends them when possible, and assigns them to the appropriate tasks.",
    );
    ns.tprint(
      "Ran by the initial gang join script when player joins/belongs to a hacking gang.",
    );

    return;
  }

  // Update Tasks List
  tasksList = readGangTasks(ns, true);
  ascendingTasksByMoneyGain = tasksList
    .filter((task) => task.baseMoney > 0)
    .sort((a, b) => a.baseMoney - b.baseMoney);

  arrangeMembersByTask(ns);

  await manageGang(ns);
}

//#endregion Main
