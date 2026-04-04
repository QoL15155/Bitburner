import {
  AttackFailReason,
  AttackFailure,
  AttackResult,
  AttackSuccess,
} from "./attack_result.js";
import { AttackBatch, delayIncrease } from "/hack/attack_batch.js";
import { AttackMeasurements } from "/hack/attack_measurements.js";
import {
  calculateServerExecutionTimes,
  canAttackFromServer,
  distributionScripts,
  getGrowSecurityIncrease,
  getGrowThreads,
  getWeakenThreads,
  processHack,
  runAttackAction,
} from "/hack/utils.js";
import { formatMoney } from "/utils/formatters.js";
import { FileLogger } from "/utils/logger.js";

/**
 * Controller script for batch attacking with sleep.
 */

const logFile = "/logs/controller_batch.txt";
/** @type {FileLogger} */
let logger = null;

let useFormulas = false;

/** @type {NS} */
let ns = null;

//#region Perform Attack

function getStrAttackFail(targetName, attackAction) {
  return `Failed to attack ${targetName}. ${attackAction.toString()}`;
}

//TODO: docstring
function performHackAttack(
  attackingServers,
  targetObject,
  attackBatch,
  executionTime,
) {
  const fname = "performHackAttack";
  const hackingThreads = processHack(ns, targetObject, attackBatch.isFirstRun);
  if (hackingThreads === 0) {
    return true;
  }

  const hackAction = attackBatch.updateHackAction(
    hackingThreads,
    executionTime,
  );

  for (const serverName of attackingServers) {
    const serverObject = ns.getServer(serverName);
    if (!canAttackFromServer(serverObject, hackAction)) {
      continue;
    }
    runAttackAction(ns, serverName, targetObject.hostname, hackAction);
    return true;
  }

  logger.warn(fname, getStrAttackFail(targetObject.hostname, hackAction));
  return false;
}

function performGrowAttack(
  attackingServers,
  targetObject,
  attackBatch,
  executionTime,
) {
  const fname = "performGrowAttack";

  let cpuCores = -1;
  let growThreads = null;
  let growAction = null;
  for (const serverName of attackingServers) {
    const serverObject = ns.getServer(serverName);

    // CPU cores
    if (cpuCores !== serverObject.cpuCores) {
      // Only calculate threads if cpu cores changed.
      cpuCores = serverObject.cpuCores;
      growThreads = getGrowThreads(ns, cpuCores, targetObject, useFormulas);
      if (growThreads === 0) {
        return true;
      }
    }

    growAction = attackBatch.updateGrowAction(
      growThreads,
      executionTime,
      cpuCores,
    );

    if (!canAttackFromServer(serverObject, growAction)) {
      logger.info(fname, `Cannot attack from server ${serverName}`);
      continue;
    }
    runAttackAction(ns, serverName, targetObject.hostname, growAction);
    targetObject.moneyAvailable = targetObject.moneyMax;
    targetObject.hackDifficulty += getGrowSecurityIncrease(growThreads);
    return true;
  }

  logger.warn(fname, getStrAttackFail(targetObject.hostname, growAction));
  return false;
}

function performWeakenAttack(
  attackingServers,
  targetObject,
  attackBatch,
  executionTime,
) {
  const fname = "performWeakenAttack";
  let cpuCores = -1;
  let weakenThreads = null;

  let weakenAction = null;

  for (const serverName of attackingServers) {
    const serverObject = ns.getServer(serverName);

    // CPU cores
    if (cpuCores !== serverObject.cpuCores) {
      // Only calculate threads if cpu cores changed.
      cpuCores = serverObject.cpuCores;
      weakenThreads = getWeakenThreads(cpuCores, targetObject);
      if (weakenThreads === 0) {
        return true;
      }
    }

    weakenAction = attackBatch.updateWeakenAction(
      weakenThreads,
      executionTime,
      cpuCores,
    );

    if (!canAttackFromServer(serverObject, weakenAction)) {
      logger.info(fname, `Cannot attack from server ${serverName}`);
      continue;
    }
    runAttackAction(ns, serverName, targetObject.hostname, weakenAction);
    targetObject.hackDifficulty = targetObject.minDifficulty;
    return true;
  }

  logger.warn(fname, getStrAttackFail(targetObject.hostname, weakenAction));
  return false;
}

//#endregion Perform Attack

//#region Sanity Checks

function doSanityTests(ns, attackBatch, errorMessages) {
  if (attackBatch.isFirstRun) return true;

  const result = testScriptsNotRunning(ns, attackBatch, errorMessages);
  if (!result) return false;

  // Don't update result. (DO NOT SKIP Target)
  // If the scripts are not running, these values won't change.
  testTargetServerValues(ns, attackBatch.targetName, errorMessages);

  return true;
}

function testTargetServerValues(ns, targetName, errorMessages) {
  const fname = "testTargetServerValues";
  const hackedObject = ns.getServer(targetName);
  let success = true;

  // Hack difficulty
  if (hackedObject.hackDifficulty !== hackedObject.minDifficulty) {
    const message = `Target '${targetName}' with unexpected Hack difficulty: ${hackedObject.hackDifficulty}, expected ${hackedObject.minDifficulty}`;
    logger.error(fname, message);
    errorMessages.push(message);
    success = false;
  }

  // Money
  const moneyMax = formatMoney(hackedObject.moneyMax);
  const moneyAvailable = formatMoney(hackedObject.moneyAvailable);
  // Due to floating point crap, sometime we get to 99% percent of the max money
  if (moneyMax === moneyAvailable) {
    return success;
  }
  const message = `Server ${hackedObject.hostname} Money is not at max. ${moneyAvailable} != ${moneyMax}`;
  logger.error(fname, message);
  errorMessages.push(message);
  return false;
}

/**
 * Tests that the attack scripts are not running.
 *
 * Resets the attack action pid for the scripts that are not running.
 *
 * @param {NS} ns
 * @param {AttackBatch} attackBatch
 * @param {Array<string>} errorMessages - array to push error messages to.
 *    Would later be used to display in the dashboard and log in case of attack failure.
 * @returns {boolean} true if all attack scripts are not running, false otherwise
 */
function testScriptsNotRunning(ns, attackBatch, errorMessages) {
  const fname = "testScriptsNotRunning";
  const targetName = attackBatch.targetName;

  let badScripts = [];

  attackBatch.getActions().forEach((action) => {
    if (!action.isSet()) return;

    if (ns.isRunning(action.pid, action.hostname, targetName)) {
      badScripts.push(action.scriptName);
    } else {
      action.reset();
    }
  });

  if (badScripts.length === 0) {
    // Success
    return true;
  }

  const message = `server:${targetName}, running scripts: ${badScripts.join(", ")}. Current time: ${Date.now()}`;
  logger.error(fname, message);
  errorMessages.push(message);

  return false;
}

//#endregion Sanity Checks

//#region Attack

/**
 * Performs an attack on the target server (@see attackBatch.targetName)
 *
 * Updates the attack batch with the attack parameters.
 *
 * HGW strategy
 * [------- weaken -------]
 * [----- grow -----]
 * [- hack -]
 *
 * @param {NS} ns : NS object
 * @param {Array<string>} attackingServers : list of servers to attack from
 * @param {AttackBatch} attackBatch : attack parameters
 * @return {AttackResult} the result of the attack attempt,
 */
function performAttack(ns, attackingServers, attackBatch) {
  const fname = "performAttack";
  const targetName = attackBatch.targetName;

  // Sanity Tests
  const timeToWait = attackBatch.getDelayForNextAttack();
  if (timeToWait < 0)
    throw new Error(`[${fname}] Invalid attack delay: ${timeToWait} < 0`);
  if (timeToWait > 0) {
    return new AttackFailure(AttackFailReason.SCRIPT_RUNNING, timeToWait);
  }

  /** @type {Array<string>} */
  let errorMessages = [];
  if (!doSanityTests(ns, attackBatch, errorMessages)) {
    return new AttackFailure(AttackFailReason.SANITY_FAIL, 0, errorMessages);
  }

  attackBatch.reset();

  // Attack

  logger.info(fname, `Attacking ${targetName}`);
  const targetObject = ns.getServer(targetName);
  // FIXME: do we need ALL execution times here? we only need weaken
  const executionTimes = calculateServerExecutionTimes(ns, targetName);

  // Hack
  let result = performHackAttack(
    attackingServers,
    targetObject,
    attackBatch,
    executionTimes.hackTime,
    // TODO: error Messages
  );
  if (!result) {
    const message = `Failed to find server to run hack attack on ${targetName}`;
    logger.error(fname, message);
    errorMessages.push(message);

    return new AttackFailure(AttackFailReason.NOT_ENOUGH_RAM, 0, errorMessages);
  }

  result = performGrowAttack(
    attackingServers,
    targetObject,
    attackBatch,
    executionTimes.growTime,
  );
  if (!result) {
    const message = `Failed to find server to run grow attack on ${targetName}`;
    logger.error(fname, message);
    errorMessages.push(message);
    return new AttackFailure(AttackFailReason.NOT_ENOUGH_RAM, 0, errorMessages);
  }

  result = performWeakenAttack(
    attackingServers,
    targetObject,
    attackBatch,
    executionTimes.weakenTime,
  );
  if (!result) {
    const message = `Failed to find server to run weaken attack on ${targetName}`;
    logger.error(fname, message);
    errorMessages.push(message);
    return new AttackFailure(AttackFailReason.NOT_ENOUGH_RAM, 0, errorMessages);
  }

  attackBatch.setEndTime();
  logger.info(fname, attackBatch.toString());

  return new AttackSuccess(
    attackBatch.getAttackDuration(),
    attackBatch.getTotalThreads(),
  );
}

//#endregion Attack

/**
 * Do batch attack in a loop.
 * For each attack, loop through the list of attacking servers and try to run the attack scripts.
 *
 * @param {NS} ns
 * @param {Array<string>} attackingServers
 * @param {Array<string>} targetServers
 */
async function doBatchAttack(ns, attackingServers, targetServers) {
  const fname = "doBatchAttack";

  // Initialize attack batch for each target server
  let targetList = [];
  targetServers.forEach((targetName) => {
    const attackBatch = new AttackBatch(targetName, distributionScripts);
    targetList.push(attackBatch);
  });

  logger.info(fname, `Attacking Servers: ${attackingServers.join(", ")}`);
  logger.info(fname, `Target Servers: ${targetServers.join(", ")}`);

  const measurements = new AttackMeasurements(useFormulas);

  while (true) {
    let delayTime = Infinity;
    // Variable for measurements
    //
    // Count of servers being attacked during this round.
    let attackedServers = 0;
    let totalThreads = 0;
    /** @type {Array<string>} */
    let errorMessages = [];

    // Perform attack on each target server.
    for (const attackBatch of targetList) {
      /** @type {AttackResult} */
      const attackResult = performAttack(ns, attackingServers, attackBatch);
      if (attackResult.duration < 0) {
        throw new Error(
          `performAttack returned an invalid duration: ${attackResult.duration}`,
        );
      }
      if (attackResult.duration > 0 && attackResult.duration < delayTime) {
        delayTime = attackResult.duration;
      }

      errorMessages.push(...attackResult.errorMessages);

      if (attackResult.success) {
        attackedServers += 1;
        totalThreads += attackResult.threads;
      } else {
        if (attackResult.reason === AttackFailReason.NOT_ENOUGH_RAM) {
          break;
        }
      }
    }

    // Log results and wait for the next attack round
    // We haven't updated measurements.rounds yet
    const currentRound = measurements.rounds + 1;

    if (currentRound === 1 && attackedServers === 0) {
      ns.tprint(
        `ERROR: No servers were attacked in the first round. ` +
          `This may indicate insufficient RAM on attacking servers.`,
      );
      ns.ui.closeTail();
      return;
    }
    const roundLabel = `Attack-Round ${currentRound}`;
    if (attackedServers > 0) {
      logger.info(
        fname,
        `Finished ${roundLabel} - Attacked servers: ${attackedServers}, Total threads: ${totalThreads}`,
      );
      if (delayTime === 0) {
        throw new Error("Sleep Time is 0");
      }
    } else {
      // Bad flow. we shouldn't get here
      delayTime = delayIncrease;
      const message = `Finished ${roundLabel} - No attacked servers. Sleeping for ${delayTime}ms.`;
      logger.warn(fname, message);
      errorMessages.push(message);
    }

    measurements.addRound(
      attackedServers,
      totalThreads,
      delayTime,
      errorMessages,
    );

    const sleepTime = Math.max(delayTime, delayIncrease);
    measurements.display(ns, attackedServers, totalThreads, sleepTime);

    await ns.sleep(sleepTime);
  }
}

/** @param {NS} netScript */
export async function main(netScript) {
  ns = netScript;
  const args = ns.flags([
    ["help", false],
    ["h", false],
    ["use-formulas", false],
  ]);
  if (args.help || args.h || args._.length !== 2) {
    ns.tprint(
      `Usage: run ${ns.getScriptName()} [ATTACKING_SERVERS] [TARGET_SERVERS]`,
    );
    ns.tprint("");
    ns.tprint("Controller Batch");
    ns.tprint("=====================");
    ns.tprint("");
    ns.tprint("Controller script for batch attacking.");
    ns.tprint(
      "Should be called from the distribute script with the list of attacking and target servers.",
    );
    ns.tprint(
      "- Activate the grow...hack...weaken scripts on attacking servers to target servers.",
    );
    ns.tprint("");
    ns.tprint("Options:");
    ns.tprint(
      "  --use-formulas       Run with Formulas.exe to calculate the optimal number of threads for each attack action.",
    );
    ns.tprint(
      "     If not set, uses a simpler algorithm that may result in suboptimal attacks.",
    );
    ns.tprint("     Doesn't validate whether formulas.exe actually exists.");
    return;
  }

  const attackingServers = JSON.parse(args._[0]);
  const targetServers = JSON.parse(args._[1]);
  useFormulas = args["use-formulas"] === true;

  ns.disableLog("exec");
  ns.disableLog("sleep");

  logger = new FileLogger(ns, { logFile: logFile });

  ns.ui.openTail();
  ns.ui.moveTail(20, 20);
  ns.ui.resizeTail(1280, 750);
  ns.ui.setTailTitle("Batch Attack Controller");

  await doBatchAttack(ns, attackingServers, targetServers);
}
