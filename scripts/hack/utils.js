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
  const weakenTimeMultipier = 4;

  const hackTime = ns.getHackTime(targetName);
  const growTime = hackTime * growTimeMultiplier;
  const weakenTime = hackTime * weakenTimeMultipier;
  // const growTime = ns.getGrowTime(targetName);
  // const weakenTime = ns.getWeakenTime(targetName);

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
  const hostname = targetObject.hostname;

  if (targetObject.hackDifficulty != targetObject.minDifficulty) {
    printWarn(
      ns,
      `[${fname}] Server ${hostname} difficulty is not minimum. ${targetObject.hackDifficulty} != ${targetObject.minDifficulty}`,
    );
  }

  const threads = ns.hackAnalyzeThreads(
    targetObject.hostname,
    targetObject.moneyMax,
  );
  const securityIncrease = ns.hackAnalyzeSecurity(
    threads,
    targetObject.hostname,
  );

  targetObject.moneyAvailable = 0;
  targetObject.hackDifficulty += securityIncrease;
  return Math.ceil(threads);
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
  const growThreads = ns.formulas.hacking.growThreads(
    targetObject,
    player,
    targetObject.moneyMax,
    cpuCores,
  );

  const securityIncrease = ns.growthAnalyzeSecurity(
    growThreads,
    targetObject.name,
    cpuCores,
  );
  targetObject.hackDifficulty += securityIncrease;
  targetObject.moneyAvailable = targetObject.moneyMax;
  return growThreads;
}

// FIXME: works for one core. Bad results for several.
function calculateWeakenThreads(ns, cpuCores, targetObject) {
  const fname = "calculateWeakenThreads";

  let threads =
    (targetObject.hackDifficulty - targetObject.minDifficulty) / 0.05;
  // let initialWeakenThreads = (targetObject.hackDifficulty - targetObject.minDifficulty) / (0.05 * cpuCores);
  // initialWeakenThreads /= cpuCores;
  threads = Math.ceil(threads);

  const securityDecrease = ns.weakenAnalyze(threads, cpuCores);
  ns.print(
    `[${fname}] Difficulty: current ${targetObject.hackDifficulty}, min: ${targetObject.minDifficulty}`,
  );

  const newDifficulty = targetObject.hackDifficulty - securityDecrease;
  let msg = `\tweaken threads: ${threads}, expected security decrease: ${securityDecrease}. New difficulty: ${newDifficulty}`;
  if (
    Math.round(newDifficulty) != targetObject.minDifficulty ||
    newDifficulty > targetObject.minDifficulty
  ) {
    // if (newDifficulty != targetObject.minDifficulty) {
    printWarn(ns, msg);
  } else {
    ns.print(msg);
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
    ns.print(
      `[${fname}] Skipping ${attackAction.scriptName}. (${attackAction.threads} threads)`,
    );
    return EnumAttackActionResult.NO_THREADS_NEEDED;
  }

  if (
    !checkServerAvailableRam(
      ns,
      hostname,
      attackAction.threads,
      attackAction.scriptRam,
    )
  ) {
    ns.alert(
      `[${fname}] Not enough RAM. Cannot run script on server ${hostname}. Action: ${attackAction.type}`,
    );
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
