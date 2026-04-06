import { AttackAction } from "/hack/attack_action.js";
import { printError, printWarn } from "/utils/print.js";

//#region Servers

/**
 * @param {MyServer} server
 * @returns {boolean} true if server was hacked
 */
function wasServerHacked(server) {
  return server.hasAdminRights || server.backdoorInstalled;
}

/** Returns a list of servers that can attack other servers.
 *
 * @param {Array<MyServer>} serverList - list of all servers in the game
 * @returns {Array<MyServer>} list of servers that can be used to run attack scripts
 */
export function getAttackingServers(serverList) {
  return serverList.filter((server) => {
    return (
      server.maxRam > 0 && (server.purchasedByPlayer || wasServerHacked(server))
    );
  });
}

/**
 * Returns a list of servers that can be targeted for hacking.
 *
 * @param {NS} ns
 * @param {Array<MyServer>} serverList - list of all servers in the game
 * @returns {Array<MyServer>} list of servers that can be targeted for hacking.
 *    sorted by max money, descending.
 */
export function getTargetServers(ns, serverList) {
  let maxHackingLevel = ns.getHackingLevel();
  if (maxHackingLevel > 1) {
    maxHackingLevel /= 2;
  }

  // Servers that can be hacked
  const targetServers = serverList
    .filter(
      (s) =>
        s.maxMoney > 0 &&
        wasServerHacked(s) &&
        s.requiredHackingLevel <= maxHackingLevel,
    )
    .sort((a, b) => b.maxMoney - a.maxMoney);
  return targetServers;
}

//#endregion Servers

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
  const growTime = hackTime * growTimeMultiplier;
  const weakenTime = hackTime * weakenTimeMultiplier;
  // const growTime = ns.getGrowTime(targetName);
  // const weakenTime = ns.getWeakenTime(targetName);

  return {
    hackTime: hackTime,
    growTime: growTime,
    weakenTime: weakenTime,
  };
}

export const distributionScripts = {
  hackScript: {
    loopScript: "do_hack.js",
    targetScript: "target_hack.js",
    ram: 1.7,
  },

  growScript: {
    loopScript: "do_grow.js",
    targetScript: "target_grow.js",
    ram: 1.75,
  },

  weakenScript: {
    loopScript: "do_weaken.js",
    targetScript: "target_weaken.js",
    ram: 1.75,
  },
};

//#region HGW

/**
 * @param {number} threads - number of threads
 * @returns {number} - security increase from the 'grow' action
 */
export function getGrowSecurityIncrease(threads) {
  // Amount by which server's security increases when its grown
  const serverFortifyAmount = 0.002;
  return 2 * threads * serverFortifyAmount;
}

/**
 * @param {number} threads - number of threads
 * @returns {number} - security increase from the 'hack' action
 */
export function getHackSecurityIncrease(threads) {
  // Amount by which server's security increases when its hacked
  const serverFortifyAmount = 0.002;
  return threads * serverFortifyAmount;
}

export function processHack(ns, targetObject) {
  const fname = "processHack";
  const targetName = targetObject.hostname;

  // Sanity check
  if (targetObject.hackDifficulty !== targetObject.minDifficulty) {
    const message = `Server ${targetName} difficulty is not minimum. ${targetObject.hackDifficulty} != ${targetObject.minDifficulty}`;
    // TODO: logger
    printWarn(ns, `[${fname}] ${message}`);
    throw new Error(message);
  }

  let threads = ns.hackAnalyzeThreads(targetName, targetObject.moneyMax);
  threads = Math.ceil(threads);
  if (threads <= 0) {
    return 0;
  }

  targetObject.moneyAvailable = 0;
  targetObject.hackDifficulty += getHackSecurityIncrease(threads);
  return threads;
}

/**
 * Uses Formulas to calculate the number of required threads to maximize money on target server.
 *
 * @param {NS} ns - NS object
 * @param {number} cpuCores - number of CPU cores of the attacking machine
 * @param {Server} targetObject - the server object to grow
 * @returns {number} - number of threads
 */
function getGrowThreadsFormulas(ns, cpuCores, targetObject) {
  const player = ns.getPlayer();

  const threads = ns.formulas.hacking.growThreads(
    targetObject,
    player,
    targetObject.moneyMax,
    cpuCores,
  );

  return threads;
}

/**
 * Without using Formulas, calculates the number of required threads to maximize money on target server
 *
 * @param {NS} ns - NS object
 * @param {number} cpuCores - number of CPU cores of the attacking machine
 * @param {Server} targetObject - the server object to grow
 * @returns {number} - number of threads
 */
function getGrowThreadsClean(ns, cpuCores, targetObject) {
  let moneyMax = targetObject.moneyMax;
  const moneyAvailable = targetObject.moneyAvailable;
  const moneyMultiplier = moneyMax / Math.max(moneyAvailable, 1);

  let threads = ns.growthAnalyze(
    targetObject.hostname,
    moneyMultiplier,
    cpuCores,
  );

  // Heuristic adjustment to grow threads for performance sake.

  if (targetObject.hostname === "n00dles") {
    // n00dles needs a few threads as it is.
    // The heuristic adjustment seems to be too much for it, causing it to be undergrown.
    return threads;
  }

  // FIXME: performance
  if (targetObject.moneyAvailable === 0) {
    // threads *= 2 / 3;
    threads *= 3 / 4;
  }

  return threads;
}

/**
 * Calculates the number of required threads to maximize money on target server.
 * Can use Formulas or not, based on the 'useFormulas' flag.
 *
 * @param {NS} ns
 * @param {number} cpuCores
 * @param {Server} targetObject - the server object to grow
 * @param {boolean} useFormulas - whether to use Formulas for the calculation or not
 * @returns {number} - number of threads
 */
export function getGrowThreads(
  ns,
  cpuCores,
  targetObject,
  useFormulas = false,
) {
  const moneyMax = targetObject.moneyMax;
  if (moneyMax === 0) {
    throw new Error("Target server has no money to grow.");
  }
  if (targetObject.moneyAvailable === moneyMax) {
    return 0;
  }

  let threads = 0;
  if (useFormulas) {
    threads = getGrowThreadsFormulas(ns, cpuCores, targetObject);
  } else {
    threads = getGrowThreadsClean(ns, cpuCores, targetObject);
  }

  threads = Math.ceil(threads);
  if (threads <= 0) {
    return 0;
  }
  return threads;
}

/**
 * Calculates number of threads needed to weaken the server back to minimum difficulty.
 *
 * @param {number} cpuCores - number of CPU cores of the attacking machine
 * @param {Server} targetObject - the server object to weaken
 * @returns {number} - number of threads required for the action
 */
export function getWeakenThreads(cpuCores, targetObject) {
  // Amount by which server's security decreases when weakened
  const serverWeakenAmount = 0.05;

  let coreBonus = (cpuCores - 1) / 16;
  coreBonus = 1 + coreBonus;

  const difficultyIncrease =
    targetObject.hackDifficulty - targetObject.minDifficulty;

  let threads = difficultyIncrease / (serverWeakenAmount * coreBonus);
  threads = Math.ceil(threads);

  return threads;
}

/**
 * Calculates number of threads needed to weaken the server back to minimum difficulty.
 * Does sanity checks on the received thread count.
 *
 * @param {NS} ns - NS object
 * @param {number} cpuCores - number of CPU cores of the attacking machine
 * @param {Server} targetObject - the server object to weaken
 * @returns {number} - number of threads required for the action
 */
export function getWeakenThreadsSanity(ns, cpuCores, targetObject) {
  const fname = "getWeakenThreadsSanity";
  const threads = getWeakenThreads(cpuCores, targetObject);

  // Sanity check
  const securityDecrease = ns.weakenAnalyze(threads, cpuCores);
  const newDifficulty = targetObject.hackDifficulty - securityDecrease;
  if (
    Math.round(newDifficulty) !== targetObject.minDifficulty ||
    newDifficulty > targetObject.minDifficulty
  ) {
    let msg = `[${fname}] Hack difficulty: ${targetObject.hackDifficulty}, minimum: ${targetObject.minDifficulty}`;
    msg += `\tweaken threads: ${threads}, expected security decrease: ${securityDecrease}. New difficulty: ${newDifficulty}`;
    printError(ns, msg);
    throw new Error(msg);
  }

  return threads;
}

//#endregion HGW

//#region Run Actions

/**
 * @param {Server} serverObject : server to run the attack from
 * @param {AttackAction} attackAction : parameters for the attack
 */
export function canAttackFromServer(serverObject, attackAction) {
  const availableRam = serverObject.maxRam - serverObject.ramUsed;
  return attackAction.getRequiredRam() <= availableRam;
}

/**
 * Runs one attack action.
 *
 * Assumes that there is enough RAM to run the action, and more than 1 thread is required.
 *
 * @param {NS} ns
 * @param {string} hostname : where the script will be running
 * @param {string} targetName : Name of server to attack
 * @param {AttackAction} attackAction : parameters for the attack
 * @throws {Error} if ns.exec fails to run the script for any reason
 *    (e.g. not enough RAM, thread count is 0, etc.)
 */
export function runAttackAction(ns, hostname, targetName, attackAction) {
  const fname = "runAttackAction";

  const pid = ns.exec(
    attackAction.scriptName,
    hostname,
    attackAction.threads,
    targetName,
  );

  if (pid == 0) {
    throw new Error(
      `[${fname}] Failed to run on ${hostname}. ${attackAction.toString()}`,
    );
  }
  attackAction.setAction(hostname, pid);
}

//#endregion Run Actions
