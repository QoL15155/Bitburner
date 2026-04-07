import {
  maxAugmentationsCostPercent,
  maxEquipmentCostPercent,
  minAugmentationsCostPercent,
  minEquipmentCostPercent,
  normalEthicalMembers,
} from "./constants.js";
import { MyGang } from "./my_gang.js";
import {
  findLeastProductiveMember,
  findMemberMaxHackingLevel,
  findMemberMaxWantedLevel,
  findMemberMinHackingLevel,
  findMemberMinWantedLevel,
  readGangEquipment,
  readGangTasks,
} from "./utils.js";
import {
  ascendGangMembers,
  EthicalTasks,
  GangFocus,
  getWantedLevelStatus,
  handleRecruitmentStatus,
  isEthicalTask,
  isTrainingTask,
  recruitGangMembers,
  TrainingTasks,
  WantedLevelStatus,
} from "/gangs/manage.js";
import { formatGainRate } from "/utils/formatters.js";
import {
  printError,
  printInfo,
  printLogInfo,
  printLogWarn,
  printWarn,
} from "/utils/print.js";

// Tasks
// =====================
const unassignedTask = "Unassigned";
// All charisma tasks are also 'hacking tasks'
// const charismaTasks = ["Phishing", "Identity Theft", "Fraud & Counterfeiting", "Money Laundering", "Cyberterrorism"];
// const hackingTasks = ["Ransomware", "DDoS Attacks", "Plant Virus"];
const territoryTask = "Territory Warfare";

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

let equipmentByType = null;

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
 */
function handleWantedLevel(ns) {
  const fname = "handleWantedLevel";
  const focusString = myGang.isRecruiting ? "Respect" : "Money";

  const gangInformation = ns.gang.getGangInformation();

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
  const memberTask = getTask(member.task);

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

  // Get the best task with lower wanted level gain and higher respect or money gain depending on the focus.
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
    printLogInfo(
      ns,
      `[${fname}] All members are working on the best focus gaining task`,
    );
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
    swapMembersTasks(bestEthicalMember, worstWorkingMember);
    printLogInfo(
      ns,
      `[${fname}] Swapped member ${worstWorkingMember.name} with ${bestEthicalMember.name} tasks.`,
    );
    return;
  }

  // Ethical -> Working
  // There is no working member with lower hacking level than ethical members. Remove Ethical member
  assignEthicalMemberWorkTask(ns);
}

//#endregion Wanted Level

//#region Tasks

/** Retrieves task information for a given task name.
 *
 * @param {string} taskName
 * @return {GangTaskStats}
 * @throws {Error} if task information cannot be found for the given task name.
 */
function getTask(taskName) {
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
  const currentTask = getTask(member.task);

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

/** Try to find member another work task with better focus gain
 * @returns {boolean} false - when all working members have the optimal task
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

function swapMembersTasks(ethicalMember, workingMember) {
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

  if (taskName === unassignedTask) {
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
      // NOTE: we still allow for "Train Charisma" for hacking gang.
      printWarn(ns, getMessage(taskName, myGang.trainingTask));
      taskName = myGang.trainingTask;
    }
    myGang.addMemberToTraining(memberName, taskName);
    return;
  }

  if (isEthicalTask(taskName)) {
    if (!EthicalTasks[myGang.type].includes(taskName)) {
      printWarn(ns, getMessage(taskName, myGang.ethicalTask));
    }

    myGang.addMemberToEthical(memberName, myGang.ethicalTask);
    return;
  }

  if (taskName === territoryTask) {
    if (myGang.type === GangFocus.MONEY) {
      printWarn(ns, getMessage("Territory Warfare", myGang.trainingTask));
      myGang.addMemberToTraining(memberName, myGang.trainingTask);
      return;
    }
    // TODO: Adapt for combat gang
  }

  myGang.addMemberToWorking(memberName, taskName);

  function getMessage(currentTask, newTask) {
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
    const currentTask = getTask(member.task);

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

    if (myGang.isRecruiting) {
      recruitGangMembers(ns, myGang);
      handleRecruitmentStatus(ns, myGang);
    }

    if (!myGang.shouldWaitAscend) {
      ascendGangMembers(ns, myGang.memberNames);
    }

    if (myGang.checkFocus) {
      // Happens on either when first starting or on focus change
      handleMembersTaskFocus(ns);
      myGang.checkFocus = false;
    }

    // Update members tasks according to wanted level
    handleWantedLevel(ns);

    // Wait for the next gang update
    const duration = await ns.gang.nextUpdate();
  }
}

//#endregion Manage

//#region Initialize

function initializeTasks(ns) {
  tasksByWantedLevel = readGangTasks(ns, true).sort(
    (a, b) => a.baseWanted - b.baseWanted,
  );
  if (tasksByWantedLevel.length === 0) {
    printError(ns, "Failed to read gang tasks.");
    return false;
  }

  tasksMap = new Map(tasksByWantedLevel.map((task) => [task.name, task]));
  tasksWithRespectGain = tasksByWantedLevel.filter(
    (task) => task.baseRespect > 0,
  );
  tasksWithMoneyGain = tasksByWantedLevel.filter((task) => task.baseMoney > 0);
  return true;
}

function shouldBuyAugmentation(ns, isHackingGang, buyArgument, playerMoney) {
  const augmentationCost = isHackingGang
    ? equipmentByType.augmentationsCosts.hacking
    : equipmentByType.augmentationsCosts.combat;
  const augmentationCostPercent = augmentationCost / playerMoney;

  if (buyArgument) {
    if (augmentationCostPercent < maxAugmentationsCostPercent) return true;
    const formattedCostPercent = ns.formatPercent(augmentationCostPercent);
    const formattedThreshold = ns.formatPercent(maxAugmentationsCostPercent);
    // TODO: prompt the user
    printWarn(
      ns,
      `Augmentations cost (${formattedCostPercent}) is above the threshold (${formattedThreshold}). Not buying augmentations for gang members.`,
    );
    return false;
  }

  // User didn't ask for augmentation
  if (augmentationCostPercent < minAugmentationsCostPercent) {
    const formattedCostPercent = ns.formatPercent(augmentationCostPercent, 5);
    const formattedThreshold = ns.formatPercent(minAugmentationsCostPercent);
    printInfo(
      ns,
      `Augmentations cost (${formattedCostPercent}) is below the threshold (${formattedThreshold}). Buying augmentations for gang members.`,
    );
    return true;
  }

  return false;
}

function shouldBuyEquipment(ns, isHackingGang, buyArgument, playerMoney) {
  const regularCost = isHackingGang
    ? equipmentByType.regularCosts.hacking
    : equipmentByType.regularCosts.combat;
  const regularCostPercent = regularCost / playerMoney;

  if (buyArgument) {
    if (regularCostPercent < maxEquipmentCostPercent) {
      return true;
    }
    const formattedCostPercent = ns.formatPercent(regularCostPercent);
    const formattedThreshold = ns.formatPercent(maxEquipmentCostPercent);
    // TODO: prompt the user
    printWarn(
      ns,
      `Equipment cost (${formattedCostPercent}) is above the threshold (${formattedThreshold}). Not buying equipment for gang members.`,
    );
    return false;
  }

  // User didn't ask for equipment
  if (regularCostPercent < minEquipmentCostPercent) {
    const formattedCostPercent = ns.formatPercent(regularCostPercent, 5);
    const formattedThreshold = ns.formatPercent(minEquipmentCostPercent);
    // TODO: prompt user?
    printInfo(
      ns,
      `Equipment cost (${formattedCostPercent}) is below the threshold (${formattedThreshold}). Buying equipment for gang members.`,
    );
    return true;
  }

  return false;
}

function initializeGang(
  ns,
  isHackingGang,
  gangMemberNames,
  buyAugmentations,
  buyEquipment,
) {
  const playerMoney = ns.getPlayer().money;

  // Equipment
  buyAugmentations = shouldBuyAugmentation(
    ns,
    isHackingGang,
    buyAugmentations,
    playerMoney,
  );
  buyEquipment = shouldBuyEquipment(
    ns,
    isHackingGang,
    buyEquipment,
    playerMoney,
  );

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
  ns.tprint("Options:");
  ns.tprint("  --buy-augmentations    - Buy augmentations for gang members. ");
  ns.tprint(
    "  --buy-equipment        - Buy equipment (and augmentations) for gang members.",
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
  const options = ["--buy-augmentations", "--buy-equipment"];

  return [...defaultOptions, ...options];
}

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([
    ["help", false],
    ["h", false],
    ["buy-augmentations", false],
    ["buy-equipment", false],
  ]);
  if (args.help || args.h || args._.length !== 1) {
    printUsage(ns);
    return;
  }

  ns.disableLog("gang.setMemberTask");
  ns.disableLog("gang.purchaseEquipment");

  ns.ui.setTailTitle("Hacking Gang Management");
  ns.ui.openTail();

  if (!initializeTasks(ns)) {
    return;
  }
  equipmentByType = readGangEquipment(ns);
  if (equipmentByType == null) {
    return;
  }

  // Gang
  const gangMemberNames = JSON.parse(args._[0]);
  const buyAugmentations = args["buy-augmentations"] || args["buy-equipment"];
  initializeGang(
    ns,
    true,
    gangMemberNames,
    buyAugmentations,
    args["buy-equipment"],
  );

  await manageGang(ns);
}

//#endregion Main
