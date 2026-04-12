import {
  clashWinChanceThreshold,
  EthicalTasks,
  GangFocus,
  isEthicalTask,
  isTrainingTask,
  normalEthicalMembers,
  powerTaskName,
  TrainingTasks,
  unassignedTaskName,
} from "./constants.js";
import { MyGang } from "./my_gang.js";
import {
  canRaiseWantedLevel,
  findLeastProductiveMember,
  findMemberMaxHackingLevel,
  findMemberMaxWantedLevel,
  findMemberMinHackingLevel,
  findMemberMinWantedLevel,
  readGangTasks,
  shouldLowerWantedLevel,
} from "./utils.js";
import { formatGainRate } from "/utils/formatters.js";
import {
  Color,
  printError,
  printLogWarn,
  printWarn,
  toGreen,
  toRed,
} from "/utils/print.js";

/* Variables */

/** Sorted by Wanted Level Gain (asc)
 * @type {GangTaskStats[]}
 * */
let tasksByWantedLevel = null;
/**  Task name -> Task info
 * @type {Map<string, GangTaskStats>}
 * */
let tasksMap = null;
let tasksWithRespectGain = null;
let tasksWithMoneyGain = null;
let powerTasks = null;

/** @type {MyGang} */
let myGang = null;

//#region Warfare

/** Calculates the minimum chance for the gang to win in a clash */
function getClashMinWinChance(ns, gangInformation) {
  const myPower = gangInformation.power;
  if (myPower === 0) {
    return 0;
  }

  const otherGangs = ns.gang.getOtherGangInformation();

  let minClashChance = -1;
  for (const [gangName, gangInfo] of Object.entries(otherGangs)) {
    if (gangName === gangInformation.faction) {
      continue;
    }

    const clashChance = myPower / (myPower + gangInfo.power);
    if (clashChance < minClashChance || minClashChance === -1) {
      minClashChance = clashChance;
    }
  }

  if (minClashChance === -1) {
    throw new Error(
      "Got -1 for minimum clash win chance, which means there is no other gang.",
    );
  }

  return minClashChance;
}

/** Turns on/off territory warfare according to clash win chance*/
function handleClashWinChance(ns) {
  const fname = "handleClashWinChance";

  const gangInformation = ns.gang.getGangInformation();
  const winChance = getClashMinWinChance(ns, gangInformation);

  const msgMinClash = `min clash win chance: ${ns.formatPercent(winChance)}`;
  if (winChance < clashWinChanceThreshold) {
    // Do not engage in warfare
    if (!gangInformation.territoryWarfareEngaged) {
      return;
    }

    ns.print(
      `[${fname}] ${toRed("Disengaging in warfare")} to avoid losses (${msgMinClash}).`,
    );
    ns.gang.setTerritoryWarfare(false);
  } else {
    // Engage in warfare
    if (!gangInformation.territoryWarfareEngaged) {
      ns.print(
        `[${fname}] ${toGreen("Engaging in warfare")} (${msgMinClash}).`,
      );
      ns.gang.setTerritoryWarfare(true);
    }
  }
}

/** Checks if members were killed. In which case, change focus to recruiting */
function getKilledMembers(ns) {
  const gangMemberNames = ns.gang.getMemberNames();
  if (gangMemberNames.length === myGang.memberCount()) {
    return [];
  }

  // member(s) killed in warfare.
  return myGang.memberNames.filter((name) => !gangMemberNames.includes(name));
}

function handleWarfare(ns) {
  const fname = "handleWarfare";

  // if members were killed -> change focus to Recruiting
  const killedMembers = getKilledMembers(ns);
  if (killedMembers.length > 0) {
    ns.tprint(
      `[${fname}] Changing focus to ${toGreen("Recruiting")} and ${toRed("stopping territory warfare")} to recover`,
    );
    myGang.handleKilledMembers(killedMembers);
    ns.gang.setTerritoryWarfare(false);
    return;
  }

  if (myGang.handleMaxTerritory()) {
    // when territory is 100% -> Don't engage in warfare + Money focus
    ns.print(`[${fname}] Territory is 100%. ${toGreen("Turning off warfare")}`);
    ns.gang.setTerritoryWarfare(false);
    return;
  }

  handleClashWinChance(ns);
}

//#endregion Warfare

//#region Wanted Level

/** Counter for safe status messages to avoid spamming
 * @type {number}
 */
let safeCounter = 0;

/**
 * Handles the wanted level of the gang.
 *
 * Strategy:
 * Penalty too high -> Assign members to lower wanted level tasks
 * Penalty low -> Assign members to higher focus gain tasks even if they have higher wanted level gain
 */
function handleWantedLevel(ns) {
  const fname = "handleWantedLevel";
  const gangInformation = ns.gang.getGangInformation();

  if (shouldLowerWantedLevel(gangInformation)) {
    safeCounter = 0;
    myGang.isFocusOptimized = false;
    ns.print(`[${fname}] Lowering. ${getStatusMessage()}`);
    lowerWantedLevel(ns);
    return;
  }

  if (canRaiseWantedLevel(gangInformation)) {
    safeCounter = 0;
    if (myGang.isFocusOptimized) {
      // Gang members are already assigned to the best tasks for the current focus.
      return;
    }

    ns.print(`[${fname}] Raising. ${getStatusMessage()}`);
    raiseFocusGain(ns);
    return;
  }

  // Safe
  safeCounter++;
  if (safeCounter % 10 === 0) {
    safeCounter = 0;
    ns.print(`[${fname}] Safe. ${getStatusMessage()}`);
  }

  function getStatusMessage() {
    const penalty = ns.formatPercent(1 - gangInformation.wantedPenalty);
    const gainRate = formatGainRate(gangInformation.wantedLevelGainRate);
    return `Wanted Level penalty: ${penalty}, gain rate: ${gainRate}. Focus: ${myGang.focus}`;
  }
}

/** Lowers the wanted level gain
 *
 * Strategy:
 * Invoke the following in order until one succeeds:
 * - A member is training? -> Ethical Task
 * - Get the member with the highest wanted level gain among *working* members
 *    - Few ethical members -> Ethical Task
 *    - Assign member a task with lower wanted level gain
 *    - Assign member to Ethical Task
 */
function lowerWantedLevel(ns) {
  const fname = "lowerWantedLevel";

  // Training Task -> Ethical Task
  if (myGang.isMembersTraining) {
    myGang.assignFirstTrainingMemberToEthical();
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

  // Find member with highest wanted level gain and try to lower it

  /** @type {GangMemberInfo} */
  const member = findMemberMaxWantedLevel(ns, myGang.membersWorking);
  if (myGang.ethicalMembersCount() < normalEthicalMembers) {
    myGang.assignWorkingMemberToEthical(member);
    return;
  }

  /** @type {GangTaskStats} */
  const memberTask = getTaskFromMap(member.task);

  const relevantTasks = tasksByWantedLevel.filter(
    (task) => task.baseWanted < memberTask.baseWanted,
  );
  // Working Task -> Ethical Task
  if (relevantTasks.length === 0) {
    // Worker's task is already the task with the lowest wanted level, we cannot reduce more the wanted level gain.
    myGang.assignWorkingMemberToEthical(member);
    return;
  }

  // Working Task -> Working Task with lower wanted level gain

  // Get the best task with lower wanted level gain and higher focus gain (respect/money/combat/power).
  /** @type {GangTaskStats} */
  let nextTask = null;
  switch (myGang.focus) {
    case GangFocus.RECRUITING:
      // Respect Focus
      nextTask = relevantTasks.reduce((prev, current) => {
        return current.baseRespect > prev.baseRespect ? current : prev;
      });
      break;
    case GangFocus.MONEY:
      // Money Focus
      nextTask = relevantTasks.reduce((prev, current) => {
        return current.baseMoney > prev.baseMoney ? current : prev;
      });
      break;
    case GangFocus.COMBAT:
      nextTask = relevantTasks.reduce((prev, current) => {
        const prevCombat = getTaskCombat(prev);
        const currentCombat = getTaskCombat(current);
        return currentCombat > prevCombat ? current : prev;
      });
      break;

    default:
      throw new Error(`Unsupported gang focus ${myGang.focus}`);
  }

  if (isEthicalTask(nextTask.name)) {
    myGang.assignWorkingMemberToEthicalTask(member, memberTask, nextTask);
  } else {
    myGang.updateMemberTask(member, memberTask, nextTask);
  }
}

/**
 * Choose a task with better focus gain (money / respect) even if it means a higher wanted level gain.
 */
function raiseFocusGain(ns) {
  const fname = "raiseFocusGain";

  // Training -> Working
  if (myGang.isMembersTraining) {
    assignTrainingMemberWorkTask();
    return;
  }

  if (myGang.ethicalMembersCount() > normalEthicalMembers) {
    // More than 2 members are doing ethical hacking, we can assign one of them to a money task.
    assignEthicalMemberWorkTask(ns);
    return;
  }

  // Search among working members if someone can be assigned to a better money task.
  if (tryUpdateWorkingMemberTask(ns)) {
    return;
  }

  if (!myGang.isMembersEthical) {
    myGang.isFocusOptimized = true;

    const message = `All members are working on the best focus gaining task.`;
    ns.print(`[${fname}] ${toGreen(message)}`);
    return;
  }

  // Swap Ethical <-> Working
  // No member can be assigned to a better money task - swap ethical with lowest hacking-level member
  const worstWorkingMember = findMemberMinHackingLevel(
    ns,
    myGang.membersWorking,
  );
  const bestEthicalMember = findMemberMaxHackingLevel(
    ns,
    myGang.membersEthical,
  );
  if (worstWorkingMember.hack < bestEthicalMember.hack) {
    swapMembersTasks(ns, bestEthicalMember, worstWorkingMember);
    return;
  }

  // Ethical -> Working
  // There is no working member with lower hacking level than ethical members. Remove Ethical member
  assignEthicalMemberWorkTask(ns);
}

//#endregion Wanted Level

//#region Tasks

/**
 * Calculates the combat gain of a task based on its weights.
 *
 * NOTE: This is not the same as Power gain.
 *  calculatePower :
 *    return (this.hack + this.str + this.def + this.dex + this.agi + this.cha) / 95;
 *
 * @param {GangTaskStats} task
 * @returns {number} The combat gain of the task.
 */
function getTaskCombat(task) {
  return task.strWeight + task.defWeight + task.dexWeight + task.agiWeight;
}

/** Retrieves task information for a given task name.
 *
 * @param {string} taskName
 * @return {GangTaskStats}
 * @throws {Error} if task information cannot be found for the given task name.
 */
function getTaskFromMap(taskName) {
  const fname = "getTask";
  const task = tasksMap.get(taskName);
  if (task == null) {
    throw new Error(
      `[${fname}] Could not find task information for task '${taskName}'`,
    );
  }
  return task;
}

/**
 * Assign a member from training to the 'easiest' working task
 *
 * FIXME: take training member with best experience?
 **/
function assignTrainingMemberWorkTask() {
  let focusTasks = null;
  switch (myGang.focus) {
    case GangFocus.RECRUITING:
      focusTasks = tasksWithRespectGain;
      break;
    case GangFocus.MONEY:
      focusTasks = tasksWithMoneyGain;
      break;
    case GangFocus.COMBAT:
      focusTasks = powerTasks;
      break;
    default:
      throw new Error(`Unsupported gang focus ${myGang.focus}`);
  }

  // result task may either be a work or ethical task
  const easiestTask = focusTasks.reduce((prev, current) =>
    current.difficulty < prev.difficulty ? current : prev,
  );
  if (isEthicalTask(easiestTask.name)) {
    myGang.assignFirstTrainingMemberToEthical(easiestTask.name);
  } else {
    myGang.assignFirstTrainingMemberToWork(easiestTask.name);
  }
}

/**
 * Assign a member from ethical to the less 'wanted' working task
 * The 'ethical' member with the least wanted level gain is chosen to minimize the wanted level gain increase.
 */
function assignEthicalMemberWorkTask(ns) {
  const member = findMemberMinWantedLevel(ns, myGang.membersEthical);
  const currentTask = getTaskFromMap(member.task);

  // Tasks with higher focus
  let relevantTasks = null;
  switch (myGang.focus) {
    case GangFocus.RECRUITING:
      relevantTasks = tasksWithRespectGain.filter(
        (t) => currentTask.baseRespect < t.baseRespect,
      );
      break;
    case GangFocus.MONEY:
      relevantTasks = tasksWithMoneyGain.filter(
        (t) => currentTask.baseMoney < t.baseMoney,
      );
      break;
    case GangFocus.COMBAT:
      relevantTasks = powerTasks;
      break;
    default:
      throw new Error(`Unsupported gang focus ${myGang.focus}`);
  }
  if (relevantTasks.length === 0)
    // Ethical task should never have the highest money/respect gain.
    throw new Error(
      `Failed to find a relevant task for member '${member.name}' with Ethical task '${member.task}'. Focus: ${myGang.focus}`,
    );

  const lowestWantedTask = relevantTasks.reduce((prev, current) =>
    current.baseWanted < prev.baseWanted ? current : prev,
  );

  myGang.assignEthicalMemberToWork(member, lowestWantedTask.name);
}

/** Try to find a member another work task with better focus gain
 * @returns {boolean} false when all working members have the optimal task
 *    for focus gain
 */
function tryUpdateWorkingMemberTask(ns) {
  let sortedTaskList = null;
  switch (myGang.focus) {
    case GangFocus.RECRUITING:
      sortedTaskList = [...tasksByWantedLevel].sort(sortTasksByRespect);
      break;
    case GangFocus.MONEY:
      sortedTaskList = [...tasksByWantedLevel].sort(sortTasksByMoney);
      break;
    case GangFocus.COMBAT:
      // We only have one task that gains power
      return false;
    default:
      throw new Error(`Unsupported gang focus ${myGang.focus}`);
  }

  const { member, taskIdx } = findLeastProductiveMember(
    ns,
    myGang.membersWorking,
    sortedTaskList,
  );

  if (member == null) {
    return false;
  }

  // Update the member with the best focus-gain task
  const currentTask = sortedTaskList[taskIdx];
  const nextTask = sortedTaskList[taskIdx + 1];
  myGang.updateMemberTask(member, currentTask, nextTask);
  return true;
}

function swapMembersTasks(ns, ethicalMember, workingMember) {
  const fname = "swapMembersTasks";
  // Log message
  const worker = toGreen(workingMember.name);
  const ethical = toGreen(ethicalMember.name);
  const messageWorking = `'${worker}': hacking level ${ns.formatNumber(workingMember.hack)}`;
  const messageEthical = `'${ethical}': hacking level ${ns.formatNumber(ethicalMember.hack)}`;
  const message = `Swapping ${worker} with ${ethical} to increase ${toGreen(myGang.focus)} gain.`;
  ns.print(`[${fname}] ${message}\n\t${messageWorking}\n\t${messageEthical}`);

  const workingTask = workingMember.task;
  myGang.assignWorkingMemberToEthical(workingMember);
  myGang.assignEthicalMemberToWork(ethicalMember, workingTask);
}

//#endregion Tasks

//#region Members

function sortTasksByRespect(a, b) {
  if (a.baseRespect !== b.baseRespect) {
    return a.baseRespect - b.baseRespect;
  }
  return a.baseWanted - b.baseWanted;
}

function sortTasksByMoney(a, b) {
  if (a.baseMoney !== b.baseMoney) {
    return a.baseMoney - b.baseMoney;
  }
  return a.baseWanted - b.baseWanted;
}

function sortMemberByTask(ns, memberName) {
  const fname = "sortMemberByTask";
  const memberInfo = ns.gang.getMemberInformation(memberName);
  let taskName = memberInfo.task;

  if (taskName === unassignedTaskName) {
    const newTask = myGang.trainingTask;
    printWarn(
      ns,
      `[${fname}] '${memberName}' is unassigned. Assigning to '${newTask}'.`,
    );
    myGang.addMemberToTraining(memberName, newTask);
    return;
  }

  if (isTrainingTask(taskName)) {
    if (!TrainingTasks[myGang.type].includes(taskName)) {
      // NOTE: we still allow for "Train Charisma" for hacking gang with money focus
      printWarn(ns, strChangingTasks(taskName, myGang.trainingTask));
      taskName = myGang.trainingTask;
    }
    myGang.addMemberToTraining(memberName, taskName);
    return;
  }

  if (isEthicalTask(taskName)) {
    if (!EthicalTasks[myGang.type].includes(taskName)) {
      printWarn(ns, strChangingTasks(taskName, myGang.ethicalTask));
    }

    myGang.addMemberToEthical(memberName, myGang.ethicalTask);
    return;
  }

  if (taskName === powerTaskName) {
    // NOTE: we still let COMBAT focus have Territory Warfare
    if (myGang.type === GangFocus.MONEY) {
      printWarn(ns, strChangingTasks("Territory Warfare", myGang.trainingTask));
      myGang.addMemberToTraining(memberName, myGang.trainingTask);
      return;
    }
  }

  myGang.addMemberToWorking(memberName, taskName);

  function strChangingTasks(currentTask, newTask) {
    return `[${fname}] '${memberName}' is in a **Hacking Gang** but is doing '${currentTask}'. Changing to '${newTask}'.`;
  }
}

/**
 * For each working member, check whether there is a task with the same or lower
 * *wanted level* but better focus gain
 *
 * NOTE: Since the gang type hasn't changed, we only need to check the working members
 *
 * This function should be called either at the first run, or when the focus changed
 * For example: after stopped recruiting
 */
function handleMembersTaskFocus(ns) {
  myGang.membersWorking.forEach((memberName) => {
    const member = ns.gang.getMemberInformation(memberName);
    const currentTask = getTaskFromMap(member.task);

    const bestTask = getMemberBestTaskForWantedLevel(currentTask);

    if (currentTask.name === bestTask.name) {
      return;
    }

    // Resulted task may either be Ethical or Working.
    if (isEthicalTask(bestTask.name)) {
      myGang.assignWorkingMemberToEthicalTask(member, currentTask, bestTask);
    } else {
      myGang.updateMemberTask(member, currentTask, bestTask);
    }
  });
}

/** Searches for the best task with the highest focus gain for a working member
 * that is less or equal to the current task wanted level gain.
 *
 * @param {GangTaskStats} memberTask - Current member's task
 */
function getMemberBestTaskForWantedLevel(memberTask) {
  let bestTask = memberTask;

  if (myGang.focus === GangFocus.COMBAT) {
    // There is only one power task
    return powerTasks[0];
  }

  for (const task of tasksByWantedLevel) {
    if (task.baseWanted > memberTask.baseWanted) {
      return bestTask;
    }

    switch (myGang.focus) {
      case GangFocus.RECRUITING:
        if (task.baseRespect > bestTask.baseRespect) {
          bestTask = task;
        }
        break;
      case GangFocus.MONEY:
        if (task.baseMoney > bestTask.baseMoney) {
          bestTask = task;
        }
        break;
      default:
        throw new Error(`Unknown gang focus ${myGang.focus}`);
    }
  }
  return bestTask;
}

//#endregion Members

//#region Manage

async function manageGang(ns) {
  // Always check the focus at the first run
  myGang.checkFocus = true;

  while (true) {
    myGang.shouldWaitAscend = false;
    myGang.sanityCheckMembers();

    if (myGang.focus === GangFocus.COMBAT) {
      handleWarfare(ns);
    }

    if (myGang.focus === GangFocus.RECRUITING) {
      myGang.handleRecruitment();
    }

    myGang.ascendMembers();

    if (myGang.checkFocus) {
      // Happens on either when first starting or after focus change
      handleMembersTaskFocus(ns);
      myGang.checkFocus = false;
    }

    if (myGang.focus !== GangFocus.COMBAT) {
      // Only money & respect are influenced by wanted level.
      // Update members tasks according to wanted level
      handleWantedLevel(ns);
    }

    // Wait for the next gang update
    const duration = await ns.gang.nextUpdate();
  }
}

//#endregion Manage

//#region Initialize

function initializeTasks(ns, isHackingGang) {
  tasksByWantedLevel = readGangTasks(ns, isHackingGang);
  if (!tasksByWantedLevel) {
    printError(ns, "Failed to read gang tasks.");
    return false;
  }

  tasksByWantedLevel.sort((a, b) => a.baseWanted - b.baseWanted);

  tasksMap = new Map(tasksByWantedLevel.map((task) => [task.name, task]));
  tasksWithRespectGain = tasksByWantedLevel.filter(
    (task) => task.baseRespect > 0,
  );
  tasksWithMoneyGain = tasksByWantedLevel.filter((task) => task.baseMoney > 0);

  powerTasks = [getTaskFromMap(powerTaskName)];
  return true;
}

/**
 * Initializes MyGang and assigns members to their appropriate tasks.
 *
 * @param {NS} ns
 * @param {boolean} isHackingGang - Hacking / Combat gang
 * @param {string[]} gangMemberNames - Array of current gang member names.
 * @param {boolean} buyAugmentations - Whether to buy augmentations for gang members.
 * @param {boolean} buyEquipment - Whether to buy equipment for gang members.
 */
async function initializeGang(
  ns,
  isHackingGang,
  gangMemberNames,
  buyAugmentations,
  buyEquipment,
) {
  myGang = new MyGang(
    ns,
    isHackingGang,
    gangMemberNames,
    buyAugmentations,
    buyEquipment,
  );
  myGang.memberNames.forEach((memberName) => sortMemberByTask(ns, memberName));

  ns.print(myGang.toString());
}

//#endregion Initialize

//#region Main

function printUsage(ns) {
  const usageMessage = toGreen(`run ${ns.getScriptName()}`);
  const optionMembers = `${Color.Bold}MEMBER_NAMES${Color.Reset}`;
  const optionOptions = `${Color.Italic}OPTIONS${Color.Reset}`;
  ns.tprint(`Usage: ${usageMessage} [${optionMembers}] [${optionOptions}]`);
  ns.tprint("");
  ns.tprint("Hacking Gang Management");
  ns.tprint("=============================");
  ns.tprint("");
  ns.tprint("Manages a Hacking Gang members and their tasks.");
  ns.tprint(
    "Automatically recruits new members, ascends them when possible, and assigns them to the appropriate tasks.",
  );
  ns.tprint("");
  ns.tprint("Arguments:");
  ns.tprint(
    `  ${toGreen("MEMBER_NAMES")}: JSON stringified array of current gang member names.`,
  );
  ns.tprint("Options:");
  ns.tprint(
    `  ${toGreen("--buy-augmentations")}    - Buy augmentations for gang members. `,
  );
  ns.tprint(
    `  ${toGreen("--buy-equipment")}        - Buy equipment (and augmentations) for gang members.`,
  );
  ns.tprint(
    `  ${toGreen("--override-focus")}       - Override gang's type and focus (hacking->combat, combat->hacking).`,
  );
  ns.tprint("");
  ns.tprint(
    `${Color.FgYellow}⚠ Should be run by 'gangs/start.js' script${Color.Reset}`,
  );
}

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
  const defaultOptions = ["-h", "--help", "--tail"];
  const options = ["--buy-augmentations", "--buy-equipment"];
  const focusOptions = ["--override-focus"];

  return [...defaultOptions, ...options, ...focusOptions];
}

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([
    ["help", false],
    ["h", false],
    ["buy-augmentations", false],
    ["buy-equipment", false],
    ["override-focus", false],
  ]);
  if (args.help || args.h || args._.length !== 1) {
    printUsage(ns);
    return;
  }

  ns.disableLog("gang.setMemberTask");
  ns.disableLog("gang.setTerritoryWarfare");

  ns.ui.setTailTitle("Hacking Gang Management");
  ns.ui.openTail();

  let isHackingGang = ns.gang.getGangInformation().isHacking;
  // Initialize tasks from the json with gang's actual type (before potential override)
  if (!initializeTasks(ns, isHackingGang)) {
    return;
  }

  // Gang
  const gangMemberNames = JSON.parse(args._[0]);
  // Toggle gang type when the override flag is set
  isHackingGang = args["override-focus"] ? !isHackingGang : isHackingGang;
  const buyAugmentations = args["buy-augmentations"] || args["buy-equipment"];

  await initializeGang(
    ns,
    isHackingGang,
    gangMemberNames,
    buyAugmentations,
    args["buy-equipment"],
  );

  await manageGang(ns);
}

//#endregion Main
