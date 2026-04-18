import {
  AttackFailReason,
  AttackFailure,
  AttackResult,
  AttackSuccess,
} from "./attack_result.js";
import { AttackBatch, delayIncrease } from "/hack/attack_batch.js";
import { AttackMeasurements } from "/hack/attack_measurements.js";
import { distributionScripts } from "/hack/utils.js";
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

function removeItemFromArray(array, item) {
  const index = array.indexOf(item);
  if (index > -1) {
    array.splice(index, 1);
  }
}

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

  if (!attackBatch.doAttack()) {
    return new AttackFailure(
      AttackFailReason.NOT_ENOUGH_RAM,
      0,
      attackBatch.errorMessages,
    );
  }

  attackBatch.setEndTime();
  logger.info(fname, attackBatch.toString());

  return new AttackSuccess(
    attackBatch.getAttackDuration(),
    attackBatch.getTotalThreads(),
    attackBatch.errorMessages,
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
    const attackBatch = new AttackBatch(
      ns,
      logger,
      distributionScripts,
      attackingServers,
      useFormulas,
      targetName,
    );
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
    /** Servers to remove due to insufficient RAM
     * @type {Array<AttackBatch>}
     */
    let targetsToRemove = [];

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
          // Not enough RAM to attack server
          targetsToRemove.push(attackBatch);
        }
      }
    }

    // Remove batches that couldn't be executed due to insufficient RAM
    for (const targetBatch of targetsToRemove) {
      logger.warn(
        fname,
        `Removing target '${targetBatch.targetName}' due to insufficient RAM`,
      );
      removeItemFromArray(targetList, targetBatch);
    }

    // Log results and wait for the next attack round
    // We haven't updated measurements.rounds yet
    const currentRound = measurements.rounds + 1;

    if (targetList.length === 0) {
      ns.tprint("ERROR: Insufficient RAM to perform any attacks. Exiting.");
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
      targetList.length,
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
