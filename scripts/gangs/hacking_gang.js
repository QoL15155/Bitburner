import {
  printError,
  printInfo,
  print,
  printLogInfo,
  printLogWarn,
  printWarn,
} from "/utils/print.js";
import {
  readGangTasks,
  findMemberHighestHackingLevel,
  findMemberLowestHackingLevel,
  findMemberHighestWantedLevel,
  findMemberLowestWantedLevel,
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

/** @type {GangTaskStats[]} */
let tasksList = null;
/** Only include tasks with baseMoney > 0
 * @type {GangTaskStats[]} */
let ascendingTasksByMoneyGain = null;

/**  False when maximum number of member has been recruited. True otherwise. */
let canRecruitMembers = true;
let shouldWaitAscend = false;
let isFocusOptimized = false;

// Members
// =====================
let gangMemberNames = [];

let membersEthical = [];
let membersWorking = [];
let membersTraining = [];

//#region Wanted Level

function wantedLevelGainRateString(gangInformation) {
  return `${gangInformation.wantedLevelGainRate.toFixed(3)}/sec`;
}

/**
 * Handles the wanted level of the gang.
 *
 * When the wanted level gain rate is too high, it assigns members to lower wanted level tasks to reduce it.
 * When the wanted level gain rate is low, it assigns members to higher money or respect gain tasks to increase it.
 *
 * Prioritizes respect gain if we can recruit more members,
 * otherwise prioritizes lowering wanted level if the gain is too high.
 *
 * @param {NS} ns
 * @param {GangGenInfo} gangInformation
 */
function handleWantedLevel(ns, gangInformation) {
  const fname = "handleWantedLevel";
  const focusString = canRecruitMembers ? "Respect" : "Money";

  const wantedLevelStatus = getWantedLevelStatus(ns, gangInformation);
  const wantedLevelGainRate = wantedLevelGainRateString(gangInformation);

  if (wantedLevelStatus === WantedLevelStatus.Safe) {
    return;
  }

  if (wantedLevelStatus === WantedLevelStatus.ShouldLower) {
    ns.printf(
      `[${fname}] Lowering wanted level (Gain rate: ${wantedLevelGainRate}). ${focusString} focus`,
    );
    lowerWantedLevel(ns);
    return;
  }

  if (isFocusOptimized) {
    // Gang members are already assigned to the best tasks for the current focus.
    return;
  }

  ns.printf(
    `[${fname}] Wanted level gain rate is low (${wantedLevelGainRate}). Raising ${focusString} gain`,
  );
  raiseFocusGain(ns);
}

function lowerWantedLevel(ns) {
  const fname = "lowerWantedLevel";
  const ethicalTask = "Ethical Hacking";

  isFocusOptimized = false;

  // Training Task -> Ethical Task
  if (membersTraining.length > 0) {
    const memberName = membersTraining.shift();
    ns.gang.setMemberTask(memberName, ethicalTask);
    membersEthical.push(memberName);
    printLogInfo(
      ns,
      `[${fname}] Assigned member ${memberName} from Training to '${ethicalTask}' to reduce wanted level gain.`,
    );
    return;
  }

  // Working Task
  if (membersWorking.length === 0) {
    printLogWarn(
      ns,
      `[${fname}] No working member to assign to ethical task. Need to wait.`,
    );
    return;
  }
  /** @type {GangMemberInfo} */
  const memberObject = findMemberHighestWantedLevel(ns, membersWorking);

  if (membersEthical.length < normalEthicalMembers) {
    assignWorkingMemberToEthical(ns, memberObject, ethicalTask);
    return;
  }

  /** @type {GangTaskStats} */
  const memberTask = tasksList.find((task) => task.name === memberObject.task);

  const relevantTasks = tasksList.filter(
    (task) => task.baseWanted < memberTask.baseWanted,
  );
  // Working Task -> Ethical Task
  if (relevantTasks.length === 0) {
    // Worker's task is already the task with the lowest wanted level, we cannot reduce more the wanted level gain.
    assignWorkingMemberToEthical(ns, memberObject, ethicalTask);
    return;
  }

  // Working Task -> Working Task with lower wanted level gain

  // Get the best task with lower wanted level gain and higher respect or money gain depending on the focus.
  let nextTask = null;
  if (canRecruitMembers) {
    nextTask = relevantTasks.reduce((prev, current) => {
      return current.baseRespect > prev.baseRespect ? current : prev;
    });
  } else {
    nextTask = relevantTasks.reduce((prev, current) => {
      return current.baseMoney > prev.baseMoney ? current : prev;
    });
  }

  ns.gang.setMemberTask(memberObject.name, nextTask.name);
  printLogInfo(
    ns,
    `[${fname}] Assigned member ${memberObject.name} task from '${memberTask.name}' to '${nextTask.name}'.`,
  );
}

/**
 * Choose a task with better focus gain (money / respect) even if it means a higher wanted level gain.
 */
function raiseFocusGain(ns) {
  const fname = "raiseFocusGain";

  if (canRecruitMembers) {
    // Respect focus
    const focusTasks = tasksList.filter((task) => task.baseRespect > 0);
  } else {
    const focusTasks = tasksList.filter((task) => task.baseMoney > 0);
  }

  // Training -> Working
  if (membersTraining.length > 0) {
    assignTrainingMemberToWork(ns, focusTasks);
    return;
  }

  if (membersEthical.length > normalEthicalMembers) {
    // More than 2 members are doing ethical hacking, we can assign one of them to a money task.
    assignEthicalMemberToWork(ns, focusTasks);
    return;
  }

  // Search among working members if someone can be assigned to a better money task.
  let sortedTaskList = null;
  if (canRecruitMembers) {
    sortedTaskList = tasksList.sort((a, b) => {
      if (a.baseRespect !== b.baseRespect) {
        return a.baseRespect - b.baseRespect;
      }
      return a.baseWanted - b.baseWanted;
    });
  } else {
    sortedTaskList = tasksList.sort((a, b) => {
      if (a.baseMoney !== b.baseMoney) {
        return a.baseMoney - b.baseMoney;
      }
      return a.baseWanted - b.baseWanted;
    });
  }
  if (tryUpgradeWorkingMember(ns, sortedTaskList)) {
    return;
  }

  if (membersEthical.length === 0) {
    isFocusOptimized = true;
    printLogInfo(
      ns,
      `[${fname}] All members are working on the best focus gaining task`,
    );
    return;
  }

  // Swap Ethical <-> Working
  // No member can be assigned to a better money task - swap ethical with lowest hacking-level member
  const worstWorkingMember = findMemberLowestHackingLevel(ns, membersWorking);
  const bestEthicalMember = findMemberHighestHackingLevel(ns, membersEthical);
  if (worstWorkingMember.hack < bestEthicalMember.hack) {
    swapMembersTasks(ns, bestEthicalMember, worstWorkingMember);
    printLogInfo(
      ns,
      `[${fname}] Swapped member ${worstWorkingMember.name} with ${bestEthicalMember.name} tasks.`,
    );
    return;
  }

  // Ethical -> Working
  // There is no working member with lower hacking level than ethical members. Remove Ethical member
  assignEthicalMemberToWork(ns, focusTasks);
  return;
}

//#endregion Wanted Level

//#region Tasks

/**
 * Assign a member from training to the 'easiest' working task
 *
 * FIXME: take training member with best experience?
 *
 * @param {NS} ns
 * @param {GangTaskStats[]} taskList
 **/
function assignTrainingMemberToWork(ns, taskList) {
  const fname = "assignTrainingMemberToWork";

  const memberName = membersTraining.shift();
  const easiestTask = taskList.reduce((prev, current) =>
    current.difficulty < prev.difficulty ? current : prev,
  );
  ns.gang.setMemberTask(memberName, easiestTask.name);
  membersWorking.push(memberName);

  logMemberAssign(ns, fname, memberName, "Training", easiestTask.name);
}

/**
 * Assign a member from ethical to the less 'wanted' working task
 * The 'ethical' member with the least wanted level gain is chosen to minimize the wanted level gain increase.
 *
 * @param {NS} ns
 * @param {GangTaskStats[]} taskList
 */
function assignEthicalMemberToWork(ns, taskList) {
  const fname = "assignEthicalMemberToWork";

  const member = findMemberLowestWantedLevel(ns, membersEthical);
  const memberTask = member.task;
  const lowestWantedTask = taskList.reduce(
    (prev, current) => (current.baseWanted < prev.baseWanted ? current : prev),
    // current.difficulty < prev.difficulty ? current : prev,
  );
  ns.gang.setMemberTask(member.name, lowestWantedTask.name);
  membersWorking.push(member.name);
  membersEthical = membersEthical.filter((name) => name !== member.name);

  logMemberAssign(ns, fname, member.name, memberTask, lowestWantedTask.name);
}

/**
 * Working -> Ethical task
 *
 * @param {NS} ns
 * @param {GangMemberInfo} member
 * @param {string} ethicalTask to assign to the member
 */
function assignWorkingMemberToEthical(ns, member, ethicalTask) {
  const fname = "assignWorkingMemberToEthical";
  const memberTask = member.task;

  ns.gang.setMemberTask(member.name, ethicalTask);
  membersEthical.push(member.name);
  membersWorking = membersWorking.filter((name) => name !== member.name);

  logMemberAssign(ns, fname, member.name, memberTask, ethicalTask);
}

function tryUpgradeWorkingMember(ns, sortedTaskList) {
  const fname = "tryUpgradeWorkingMemberRespect";

  /** @type {GangMemberInfo[]} */
  const membersInfo = membersWorking.map((memberName) =>
    ns.gang.getMemberInformation(memberName),
  );

  let lowestGainingMember = null;
  let lowerTaskIdx = sortedTaskList.length - 1;
  for (const member of membersInfo) {
    const taskIndex = sortedTaskList.findIndex(
      (task) => task.name === member.task,
    );

    if (taskIndex === -1) {
      throw new Error(
        `[${fname}] Member ${member.name} is doing an unknown task: ${member.task}`,
      );
    }

    if (taskIndex < lowerTaskIdx) {
      lowerTaskIdx = taskIndex;
      lowestGainingMember = member;
    }
  }

  if (lowestGainingMember === null) {
    return false;
  }

  // Update the member with the best focus-gain task
  const currentTask = sortedTaskList[lowerTaskIdx];
  const nextTask = sortedTaskList[lowerTaskIdx + 1];
  ns.gang.setMemberTask(lowestGainingMember.name, nextTask.name);

  logMemberAssignEx(ns, fname, lowestGainingMember.name, currentTask, nextTask);
  return true;
}

function swapMembersTasks(ns, ethicalMember, workingMember) {
  const ethicalTask = ethicalMember.task;
  const workingTask = workingMember.task;

  ns.gang.setMemberTask(workingMember.name, ethicalTask);
  membersWorking = membersWorking.filter((name) => name !== workingMember.name);
  membersEthical.push(workingMember.name);

  ns.gang.setMemberTask(ethicalMember.name, workingTask);
  membersEthical = membersEthical.filter((name) => name !== ethicalMember.name);
  membersWorking.push(ethicalMember.name);
}

/**
 * @param {NS} ns
 * @param {string} fname
 * @param {string} memberName
 * @param {string} fromTaskName
 * @param {string} toTaskName
 */
function logMemberAssign(ns, fname, memberName, fromTaskName, toTaskName) {
  printLogInfo(
    ns,
    `[${fname}] Assigned member '${memberName}' from '${fromTaskName}' to '${toTask}'.`,
  );
}

/**
 * @param {NS} ns
 * @param {string} fname
 * @param {string} memberName
 * @param {GangTask} fromTask
 * @param {GangTask} toTask
 */
function logMemberAssignEx(ns, fname, memberName, fromTask, toTask) {
  let message = `[${fname}] Assigned member '${memberName}' `;
  message += `from '${fromTask.name}' (base money: ${fromTask.baseMoney}) to '${toTask.name}' (base money: ${toTask.baseMoney}).`;
  printLogInfo(ns, message);
}

//#endregion Tasks

//#region Members

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

  gangMemberNames.forEach((memberName) => sortMemberByTask(ns, memberName));

  let message = `Initial Members: \n`;
  message += getMembersStrings();
  ns.printf(message);
}

function getMembersStrings() {
  let message = `- Training: ${membersTraining.length} (${membersTraining.join(", ")})\n`;
  message += `- Ethical: ${membersEthical.length} (${membersEthical.join(", ")})\n`;
  message += `- Working: ${membersWorking.length} (${membersWorking.join(", ")})\n`;
  return message;
}

//#endregion Members

//#region Manage

function sanityCheckMembers(ns) {
  const fname = "sanityCheckMembers";
  const memberCount = gangMemberNames.length;
  const totalCategorizedMembers =
    membersTraining.length + membersEthical.length + membersWorking.length;

  if (memberCount === totalCategorizedMembers) return;

  let message = `[${fname}] Sanity Check Failed. Total members ${memberCount} does not match sum of categorized members ${totalCategorizedMembers}.\n`;
  message += getMembersStrings();
  throw new Error(message);
}

/**
 * Handle the recruitment of new gang members.
 * @param {NS} ns
 * @returns {boolean} true when done recruiting (focus changes)
 */
function handleRecruitment(ns) {
  const fname = "handleRecruitment";

  const newMembers = recruitGangMembers(
    ns,
    defaultTask,
    gangMemberNames.length,
  );
  if (newMembers.length !== 0) {
    isFocusOptimized = false;
    for (const memberName of newMembers) {
      gangMemberNames.push(memberName);
      membersTraining.push(memberName);
    }
  }

  // Check if should wait to ascend members
  const status = getRecruitmentStatus(ns);

  if (status === RecruitmentStatus.DoneRequirement) {
    printLogInfo(
      ns,
      `[${fname}] Maximum number of gang members have been recruited - ${gangMemberNames.length} members.`,
    );
    isFocusOptimized = false;
    canRecruitMembers = false;
    return true;
  }

  if (status === RecruitmentStatus.WaitingForRespect) {
    printLogInfo(
      ns,
      `[${fname}] Waiting to recruit next member before ascending current members.`,
    );
    shouldWaitAscend = true;
  }

  return false;
}

async function manageGang(ns) {
  const fname = "manageGang";
  ns.print(
    `[${fname}] Started. Recruiting? ${canRecruitMembers}, Wait to ascend? ${shouldWaitAscend}, Focus optimized? ${isFocusOptimized}`,
  );

  while (true) {
    shouldWaitAscend = false;
    sanityCheckMembers(ns);

    if (canRecruitMembers) {
      let focusChanged = handleRecruitment(ns);
      // TODO: handle that
    }

    if (!shouldWaitAscend) {
      ascendGangMembers(ns, gangMemberNames);
    }

    // Update members tasks
    const gangInformation = ns.gang.getGangInformation();
    handleWantedLevel(ns, gangInformation);

    // Wait for the next gang update
    const duration = await ns.gang.nextUpdate();
  }
}

//#endregion Manage

//#region Main

function printUsage(ns) {
  ns.tprint(`Usage: run ${ns.getScriptName()} [MEMBER_NAMES]`);
  ns.tprint("");
  ns.tprint("Hacking Gang Running Script");
  ns.tprint("=============================");
  ns.tprint("");
  ns.tprint("Manages a Hacking Gang members and their tasks.");
  ns.tprint(
    "Automatically recruits new members, ascends them when possible, and assigns them to the appropriate tasks.",
  );
  ns.tprint("");
  ns.tprint("Arguments:");
  ns.tprint(
    "  MEMBER_NAMES: JSON stringified array of current gang member names.",
  );
  ns.tprint("");
  ns.tprint("Should be run by 'gangs/start.js' script");
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
  if (args.help || args.h || args._.length !== 1) {
    printUsage(ns);
    return;
  }

  ns.ui.setTailTitle("Hacking Gang Management");
  ns.ui.openTail();

  gangMemberNames = JSON.parse(args._[0]);

  // Update Tasks List
  tasksList = readGangTasks(ns, true);
  ascendingTasksByMoneyGain = tasksList
    .filter((task) => task.baseMoney > 0)
    .sort((a, b) => a.baseMoney - b.baseMoney);

  arrangeMembersByTask(ns);

  await manageGang(ns);
}

//#endregion Main
