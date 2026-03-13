import {
  printError,
  printWarn,
  printInfo,
  print,
  formatMoney,
} from "/utils/print";
import { AttackAction, EnumAttackActionResult } from "./attack_action";

/**
 * Calculates the server execution times
 *
 * @param {NS} ns
 * @param {string} targetName : Target server name
 **/
export function calculateServerExecutionTimes(ns, targetName) {
  const growTimeMultiplier = 3.2;
  const weakenTimeMultiplier = 4;

  const hackTime = ns.getHackTime(targetName);
  // const growTime = hackTime * growTimeMultiplier;
  // const weakenTime = hackTime * weakenTimeMultiplier;
  const growTime = ns.getGrowTime(targetName);
  const weakenTime = ns.getWeakenTime(targetName);

  return {
    hack: hackTime,
    grow: growTime,
    weaken: weakenTime,
  };
}

export const distributionScripts = {
  hack: {
    loopScript: "do_hack.js",
    targetScript: "target_hack.js",
    ram: 1.7,
  },

  grow: {
    loopScript: "do_grow.js",
    targetScript: "target_grow.js",
    ram: 1.75,
  },

  weaken: {
    loopScript: "do_weaken.js",
    targetScript: "target_weaken.js",
    ram: 1.75,
  },
};

//#region HGW

export function processHack(ns, targetObject) {
  const fname = "processHack";
  const targetName = targetObject.hostname;

  if (targetObject.hackDifficulty != targetObject.minDifficulty) {
    printWarn(
      ns,
      `[${fname}] Server ${targetName} difficulty is not minimum. ${targetObject.hackDifficulty} != ${targetObject.minDifficulty}`,
    );
    throw `Server ${targetName} difficulty is not minimum. ${targetObject.hackDifficulty} != ${targetObject.minDifficulty}`;
  }

  let threads = ns.hackAnalyzeThreads(targetName, targetObject.moneyMax);
  threads = Math.ceil(threads);
  const securityIncrease = ns.hackAnalyzeSecurity(threads, targetName);

  targetObject.moneyAvailable = 0;
  targetObject.hackDifficulty += securityIncrease;
  return threads;
}

/**
 * Calculates the number of required threads to maximize money on target server.
 * Updates the server's object accordingly.
 *
 * @param {NS} ns - NS object
 * @param {Person} player - the player object
 * @param {number} cpuCores - number of CPU cores of the attacking machine
 * @param {Server} targetObject - the server object to grow
 * @returns {number} - number of threads
 */
export function processGrow(ns, player, cpuCores, targetObject) {
  targetObject.moneyAvailable = 0;

  let threads = ns.formulas.hacking.growThreads(
    targetObject,
    player,
    targetObject.moneyMax,
    cpuCores,
  );
  threads = Math.ceil(threads);

  if (threads == 0) {
    return threads;
  }

  const securityIncrease = ns.growthAnalyzeSecurity(
    threads,
    targetObject.name,
    cpuCores,
  );
  targetObject.hackDifficulty += securityIncrease;
  targetObject.moneyAvailable = targetObject.moneyMax;
  return threads;
}

function calculateWeakenThreads(ns, cpuCores, targetObject) {
  const fname = "calculateWeakenThreads";
  // FIXME: probably not needed
  const bogusIncrease = 5;

  // Amount by which server's security decreases when weakened
  const serverWeakenAmount = 0.05;
  let coreBonus = (cpuCores - 1) / 16;
  coreBonus = 1 + coreBonus;

  let threads =
    (targetObject.hackDifficulty - targetObject.minDifficulty) /
    (serverWeakenAmount * coreBonus);
  threads = Math.ceil(threads) + bogusIncrease;

  // Sanity check
  const securityDecrease = ns.weakenAnalyze(threads, cpuCores);
  const newDifficulty = targetObject.hackDifficulty - securityDecrease;
  if (
    Math.round(newDifficulty) != targetObject.minDifficulty ||
    newDifficulty > targetObject.minDifficulty
  ) {
    let msg = `[${fname}] Hack difficulty: ${targetObject.hackDifficulty}, minimum: ${targetObject.minDifficulty}`;
    msg += `\tweaken threads: ${threads}, expected security decrease: ${securityDecrease}. New difficulty: ${newDifficulty}`;
    printError(ns, msg);
  }

  return threads;
}

/**
 * Calculates number of threads needed to weaken the server back to minimum difficulty.
 * Updates the target object accordingly.
 *
 * @param {NS} ns - NS object
 * @param {number} cpuCores - number of CPU cores of the attacking machine
 * @param {Server} targetObject - the server object to weaken
 * @returns {number} - number of threads required for the action
 */
export function processWeaken(ns, cpuCores, targetObject) {
  const weakenThreads = calculateWeakenThreads(ns, cpuCores, targetObject);
  targetObject.hackDifficulty = targetObject.minDifficulty;
  return weakenThreads;
}

//#endregion HGW

//#region Run Actions

/**
 *
 * @param {NS} ns
 * @param {string} serverName
 * @param {number} threads : Number of threads to run
 * @param {number} scriptRam required for one thread
 */
function checkServerAvailableRam(ns, serverName, threads, scriptRam) {
  const serverObject = ns.getServer(serverName);
  const availableRam = serverObject.maxRam - serverObject.ramUsed;

  const requiredRam = threads * scriptRam;
  return requiredRam <= availableRam;
}

/**
 * Run one attack action
 *
 * @param {NS} ns
 * @param {string} hostname : where the script will be running
 * @param {string} targetName : Name of server to attack
 * @param {AttackAction} attackAction : parameters for the attack
 * @returns {EnumAttackActionResult} Result of attack action
 */
export function runAttackAction(ns, hostname, targetName, attackAction) {
  const fname = "runAttackAction";

  if (attackAction.threads <= 0) {
    const message = `[${fname}] Skipping ${attackAction.scriptName} for '${targetName}' - no threads`;
    printWarn(ns, message);
    return EnumAttackActionResult.NO_THREADS_NEEDED;
  }

  const availableRam = checkServerAvailableRam(
    ns,
    hostname,
    attackAction.threads,
    attackAction.scriptRam,
  );

  if (!availableRam) {
    ns.alert(`[${fname}] Not enough RAM to run script on ${hostname}}`);
    return EnumAttackActionResult.NOT_ENOUGH_RAM;
  }

  const pid = ns.exec(
    attackAction.scriptName,
    hostname,
    attackAction.threads,
    targetName,
  );
  attackAction.pid = pid;
  attackAction.hostname = hostname;
  return EnumAttackActionResult.SCRIPT_RUN;
}

//#endregion Run Actions
