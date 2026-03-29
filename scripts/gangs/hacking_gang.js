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
  findLeastProductiveMember,
} from "./utils.js";
import {
  recruitGangMembers,
  handleRecruitmentStatus,
  ascendGangMembers,
  getWantedLevelStatus,
  WantedLevelStatus,
} from "/gangs/manage.js";
import { normalEthicalMembers } from "./constants.js";
import { formatGainRate } from "/utils/formatters.js";
import { MyGang } from "./my_gang.js";

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
const unassignedTask = "Unassigned";
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
let tasksWithRespectGain = null;
let tasksWithMoneyGain = null;

/** @type {MyGang} */
let myGang = null;

//#region Wanted Level

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
  const focusString = myGang.canRecruit ? "Respect" : "Money";

  const wantedLevelStatus = getWantedLevelStatus(ns, gangInformation);
  const wantedLevelGainRate = formatGainRate(
    gangInformation.wantedLevelGainRate,
  );

  if (wantedLevelStatus === WantedLevelStatus.Safe) {
    return;
  }

  if (wantedLevelStatus === WantedLevelStatus.ShouldLower) {
    ns.printf(
      `[${fname}] Lowering wanted level (Gain rate: ${wantedLevelGainRate}). ${focusString} focus`,
    );
    myGang.isFocusOptimized = false;
    lowerWantedLevel(ns);
    return;
  }

  if (myGang.isFocusOptimized) {
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

  // Training Task -> Ethical Task
  if (myGang.isMembersTraining) {
    myGang.assignFirstTrainingMemberToEthical(ethicalTask);
    return;
  }

  // Working Task
  if (!myGang.isMembersWorking) {
    printLogWarn(
      ns,
      `[${fname}] No working member to assign Ethical task to. Need to wait.`,
    );
    return;
  }

  /** @type {GangMemberInfo} */
  const memberObject = findMemberHighestWantedLevel(ns, myGang.membersWorking);
  if (myGang.membersEthicalCount() < normalEthicalMembers) {
    myGang.assignWorkingMemberToEthical(memberObject, ethicalTask);
    return;
  }

  /** @type {GangTaskStats} */
  const memberTask = tasksList.find((task) => task.name === memberObject.task);
  if (memberTask == null) {
    throw new Error(
      `[${fname}] Could not find task information for member '${memberObject.name}' task '${memberObject.task}'`,
    );
  }

  const relevantTasks = tasksList.filter(
    (task) => task.baseWanted < memberTask.baseWanted,
  );
  // Working Task -> Ethical Task
  if (relevantTasks.length === 0) {
    // Worker's task is already the task with the lowest wanted level, we cannot reduce more the wanted level gain.
    myGang.assignWorkingMemberToEthical(memberObject, ethicalTask);
    return;
  }

  // Working Task -> Working Task with lower wanted level gain

  // Get the best task with lower wanted level gain and higher respect or money gain depending on the focus.
  let nextTask = null;
  if (myGang.canRecruit) {
    // Respect Focus
    nextTask = relevantTasks.reduce((prev, current) => {
      return current.baseRespect > prev.baseRespect ? current : prev;
    });
  } else {
    // Money Focus
    nextTask = relevantTasks.reduce((prev, current) => {
      return current.baseMoney > prev.baseMoney ? current : prev;
    });
  }

  const currentTask = memberObject.task;
  ns.gang.setMemberTask(memberObject.name, nextTask.name);
  myGang.logMemberReassignTask(
    fname,
    memberObject.name,
    currentTask,
    nextTask.name,
  );
}

/**
 * Choose a task with better focus gain (money / respect) even if it means a higher wanted level gain.
 */
function raiseFocusGain(ns) {
  const fname = "raiseFocusGain";

  const focusTasks = myGang.canRecruit
    ? tasksWithRespectGain
    : tasksWithMoneyGain;

  // Training -> Working
  if (myGang.isMembersTraining) {
    assignTrainingMemberToWork(ns, focusTasks);
    return;
  }

  if (myGang.membersEthical.length > normalEthicalMembers) {
    // More than 2 members are doing ethical hacking, we can assign one of them to a money task.
    assignEthicalMemberToWork(ns, focusTasks);
    return;
  }

  // Search among working members if someone can be assigned to a better money task.
  if (tryUpgradeWorkingMember(ns)) {
    return;
  }

  if (!myGang.isMembersEthical) {
    myGang.isFocusOptimized = true;
    printLogInfo(
      ns,
      `[${fname}] All members are working on the best focus gaining task`,
    );
    return;
  }

  // Swap Ethical <-> Working
  // No member can be assigned to a better money task - swap ethical with lowest hacking-level member
  const worstWorkingMember = findMemberLowestHackingLevel(
    ns,
    myGang.membersWorking,
  );
  const bestEthicalMember = findMemberHighestHackingLevel(
    ns,
    myGang.membersEthical,
  );
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
  const easiestTask = taskList.reduce((prev, current) =>
    current.difficulty < prev.difficulty ? current : prev,
  );
  myGang.assignFirstTrainingMemberToWork(easiestTask.name);
}

/**
 * Assign a member from ethical to the less 'wanted' working task
 * The 'ethical' member with the least wanted level gain is chosen to minimize the wanted level gain increase.
 *
 * @param {NS} ns
 * @param {GangTaskStats[]} taskList
 */
function assignEthicalMemberToWork(ns, taskList) {
  const member = findMemberLowestWantedLevel(ns, myGang.membersEthical);
  const lowestWantedTask = taskList.reduce(
    (prev, current) => (current.baseWanted < prev.baseWanted ? current : prev),
    // current.difficulty < prev.difficulty ? current : prev,
  );
  myGang.assignEthicalMemberToWork(member, lowestWantedTask.name);
}

function tryUpgradeWorkingMember(ns) {
  const fname = "tryUpgradeWorkingMember";

  let sortedTaskList = null;
  if (myGang.canRecruit) {
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

  const { member, taskIdx } = findLeastProductiveMember(
    ns,
    myGang.membersWorking,
    sortedTaskList,
  );

  if (member === null) {
    return false;
  }

  // Update the member with the best focus-gain task
  const currentTask = sortedTaskList[taskIdx];
  const nextTask = sortedTaskList[taskIdx + 1];
  ns.gang.setMemberTask(member.name, nextTask.name);

  logMemberAssignEx(ns, fname, member.name, currentTask, nextTask);
  return true;
}

function swapMembersTasks(ns, ethicalMember, workingMember) {
  const ethicalTask = ethicalMember.task;
  const workingTask = workingMember.task;

  myGang.assignWorkingMemberToEthical(workingMember, ethicalTask);
  myGang.assignEthicalMemberToWork(ethicalMember, workingTask);
}

/**
 * @param {GangTaskStats} fromTask
 * @param {GangTaskStats} toTask
 */
function logMemberAssignEx(ns, fname, memberName, fromTask, toTask) {
  let message = `[${fname}] Assigned member '${memberName}' `;
  message += `\n\tfrom '${fromTask.name}' (money: ${fromTask.baseMoney}, respect: ${fromTask.baseRespect}, wanted: ${fromTask.baseWanted}) `;
  message += `\n\tto '${toTask.name}' (money: ${toTask.baseMoney}, respect: ${toTask.baseRespect}, wanted: ${toTask.baseWanted}).`;
  printLogInfo(ns, message);
}

//#endregion Tasks

//#region Members

function sortMemberByTask(ns, memberName) {
  const memberInfo = ns.gang.getMemberInformation(memberName);
  const taskName = memberInfo.task;

  if (taskName === unassignedTask) {
    printWarn(
      ns,
      `'${memberName}' is unassigned. Assigning to default task '${defaultTask}'.`,
    );
    myGang.addMemberToTraining(memberName, defaultTask);
    return;
  }

  if (trainingTasks.includes(taskName)) {
    if (taskName === "Train Combat") {
      // NOTE: we still allow for "Train Charisma" for hacking gang.
      printWarn(
        ns,
        `'${memberName}' is in a **Hacking Gang** but is training combat. Changing to Hacking Training.`,
      );
    }
    myGang.addMemberToTraining(memberName, "Train Hacking");
    return;
  }

  if (lowerWantedLevelTasks.includes(taskName)) {
    if (taskName === "Vigilante Justice") {
      printWarn(
        ns,
        `${memberName} - is in a **Hacking Gang** but is doing Vigilante Justice. Changing to Ethical Hacking.`,
      );
    }
    myGang.addMemberToEthical(memberName, "Ethical Hacking");
    return;
  }

  if (taskName === territoryTask) {
    printWarn(
      ns,
      `${memberName} - is in a **Hacking Gang** but is doing Territory Warfare. Changing to 'Train Hacking'.`,
    );
    myGang.addMemberToTraining(memberName, "Train Hacking");
    return;
  }

  myGang.addMemberToWorking(memberName, taskName);
}

function arrangeMembersByTask(ns) {
  myGang.memberNames.forEach((memberName) => sortMemberByTask(ns, memberName));

  const message = `Initial Members: \n${myGang.membersString()} `;
  ns.printf(message);
}

//#endregion Members

//#region Manage

async function manageGang(ns) {
  const fname = "manageGang";
  ns.print(
    `[${fname}] Started. Recruiting? ${myGang.canRecruit}, Wait to ascend? ${myGang.shouldWaitAscend}, Focus optimized? ${myGang.isFocusOptimized}`,
  );

  while (true) {
    myGang.shouldWaitAscend = false;
    myGang.sanityCheckMembers();

    if (myGang.canRecruit) {
      recruitGangMembers(ns, myGang);
      handleRecruitmentStatus(ns, myGang);
      // TODO: handle focus change
    }

    if (!myGang.shouldWaitAscend) {
      ascendGangMembers(ns, myGang.memberNames);
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

  const gangMemberNames = JSON.parse(args._[0]);
  tasksList = readGangTasks(ns, true);
  tasksWithRespectGain = tasksList.filter((task) => task.baseRespect > 0);
  tasksWithMoneyGain = tasksList.filter((task) => task.baseMoney > 0);

  myGang = new MyGang(ns, gangMemberNames, defaultTask);
  arrangeMembersByTask(ns);

  await manageGang(ns);
}

//#endregion Main
