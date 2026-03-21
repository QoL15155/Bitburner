import { FileLogger } from "/utils/logger.js";
import { AttackMeasurements } from "/hack/attack_measurements.js";
import { formatRam, formatMoney } from "/utils/formatters.js";
import { AttackBatch, BatchState, delayIncrease } from "/hack/attack_batch.js";
import {
  calculateServerExecutionTimes,
  distributionScripts,
  processGrow,
  processWeaken,
  processHack,
  runAttackAction,
} from "/hack/utils.js";

/**
 * Controller script for batch attacking with sleep.
 */

const logFile = "/logs/controller_batch.txt";
/** @type {FileLogger} */
let logger = null;

let useFormulas = false;

//#region Parameters

/**
 * Prep the target server for attack.
 * At the end of the prep phase the targe server would have maximum money and minimum security
 *
 * [------ weaken ------]
 * [---- grow ----]
 *
 * @param {NS} ns
 * @param {number} cpuCores
 * @param {AttackBatch} attackBatch
 * @returns {bool} false when target server is already prepped
 */
export function getPrepParameters(ns, cpuCores, attackBatch) {
  const fname = "getPrepParameters";
  const targetName = attackBatch.targetName;
  const targetObject = ns.getServer(targetName);

  // FIXME: do we need ALL execution times here? we only need weaken
  const executionTimes = calculateServerExecutionTimes(ns, targetName);

  // Grow must run BEFORE process Weaken. Updates targetObject security level
  const growThreads = processGrow(ns, cpuCores, targetObject, useFormulas);
  const weakenThreads = processWeaken(ns, cpuCores, targetObject);

  if (weakenThreads === 0 && growThreads === 0) {
    logger.info(fname, "Server is already prepped.");
    return false;
  }

  attackBatch.setPrepActions(
    cpuCores,
    growThreads,
    weakenThreads,
    executionTimes,
  );

  return true;
}

/**
 * Gathers attack parameters
 *
 * HGW strategy
 * [------- weaken -------]
 * [----- grow -----]
 * [- hack -]
 *
 * @param {NS} ns
 * @param {number} cpuCores
 * @param {AttackBatch} attackBatch
 */
function getAttackParameters(ns, cpuCores, attackBatch) {
  const targetObject = ns.getServer(attackBatch.targetName);
  const executionTimes = calculateServerExecutionTimes(
    ns,
    targetObject.hostname,
  );

  const hackingThreads = processHack(ns, targetObject);
  const growThreads = processGrow(ns, cpuCores, targetObject, useFormulas);
  const weakenThreads = processWeaken(ns, cpuCores, targetObject);

  attackBatch.setAttackActions(
    cpuCores,
    hackingThreads,
    growThreads,
    weakenThreads,
    executionTimes,
  );
}

/**
 * Retrieves attack parameters. (either prep or actual hack)
 *
 * @param {NS} ns
 * @param {number} cpuCores
 * @param {AttackBatch} attackBatch
 * @returns
 */
function handleAttackParameters(ns, cpuCores, attackBatch) {
  const fname = "handleAttackParameters";

  if (attackBatch.cpuCores === cpuCores) {
    // Parameters are already set
    return;
  }

  if (attackBatch.getState() === BatchState.INIT) {
    const prepResult = getPrepParameters(ns, cpuCores, attackBatch);
    if (prepResult) {
      return;
    }

    logger.info(
      fname,
      "Server is already prepped. Gathering attack parameters",
    );
  }

  // Server is already prepped
  getAttackParameters(ns, cpuCores, attackBatch);
}

//#endregion Parameters

//#region Sanity Checks

function doSanityTests(ns, attackBatch, errorMessages) {
  if (attackBatch.getState() === BatchState.INIT) return true;

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
 *  Would later be used to display in the dashboard and log in case of attack failure.
 * @returns {boolean} true if all attack scripts are not running, false otherwise
 */
function testScriptsNotRunning(ns, attackBatch, errorMessages) {
  const fname = "testScriptsNotRunning";
  const targetName = attackBatch.targetName;

  let badScripts = [];

  attackBatch.getActions().forEach((action) => {
    if (action.pid === 0) return;

    if (ns.isRunning(action.pid, action.hostname, targetName)) {
      badScripts.push(action.scriptName);
    } else {
      action.pid = 0;
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

class AttackResult {
  constructor(success, delayTime, threads = 0, errorMessages = []) {
    this.success = success;
    this.duration = delayTime;
    this.threads = threads;
    /** @type {Array<string>} */
    this.errorMessages = errorMessages;
  }
}

/**
 * Performs an attack on the target server from the attack batch
 * @param {NS} ns : NS object
 * @param {Array<string>} attackingServers : list of servers to attack from
 * @param {AttackBatch} attackBatch : attack parameters
 */
function performAttack(ns, attackingServers, attackBatch) {
  const fname = "performAttack";
  const targetName = attackBatch.targetName;

  const timeToWait = attackBatch.getDelayForNextAttack();
  if (timeToWait < 0)
    throw `[${fname}] Got invalid attack delay: ${timeToWait} < 0`;
  if (timeToWait > 0) {
    return new AttackResult(false, timeToWait);
  }

  /** @type {Array<string>} */
  let errorMessages = [];
  if (!doSanityTests(ns, attackBatch, errorMessages)) {
    return new AttackResult(false, 0, 0, errorMessages);
    // throw "Unexpected state before attack";
  }

  attackBatch.reset();

  logger.info(fname, `Attacking ${targetName}`);

  for (const serverName of attackingServers) {
    const serverObject = ns.getServer(serverName);

    handleAttackParameters(ns, serverObject.cpuCores, attackBatch);

    // Check available RAM
    const requiredRam = attackBatch.getRequiredRam();
    const availableRam = serverObject.maxRam - serverObject.ramUsed;
    let ramString = `RAM(required ${formatRam(requiredRam)}, available ${formatRam(availableRam)})`;
    if (requiredRam > availableRam) {
      logger.warn(
        fname,
        `Cannot attack from ${serverName} - not enough RAM. ${ramString}`,
      );
      continue;
    }

    logger.info(
      fname,
      `Attacking ${targetName} from ${serverName}. ${ramString}. Time: ${Date.now()}`,
    );
    logger.info(fname, attackBatch.toString());

    attackBatch
      .getActions()
      .forEach((action) => runAttackAction(ns, serverName, targetName, action));

    attackBatch.setEndTime();
    return new AttackResult(
      true,
      attackBatch.getAttackDuration(),
      attackBatch.getTotalThreads(),
    );
  }

  const message = `Failed to find server to run attack on ${targetName}`;
  logger.error(fname, message);
  errorMessages.push(message);

  return new AttackResult(false, 0, 0, errorMessages);
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
  // TODO:
  // Without formulas, a common de facto algorithm for finding the best server to target is to parse the list down
  // to only servers with a hacking requirement of half your level,
  // then divide their max money by the minimum security level.
  // Pick whichever server scores highest.
  // (For a fully functional batcher, you don't need to do that division)

  // Initialize attack batch for each target server
  let attackList = [];
  targetServers.forEach((targetName) => {
    const attackBatch = new AttackBatch(targetName, distributionScripts);
    attackList.push(attackBatch);
  });

  const measurements = new AttackMeasurements(useFormulas);
  while (true) {
    let delayTime = Infinity;
    let attackedServers = 0;
    let totalThreads = 0;
    /** @type {Array<string>} */
    let errorMessages = [];

    // Perform attack on each target server.
    attackList.forEach((attackBatch) => {
      /** @type {AttackResult} */
      const attackResult = performAttack(ns, attackingServers, attackBatch);
      if (attackResult.duration < 0) {
        throw `performAttack returned an invalid duration: ${attackResult.duration}`;
      }
      if (attackResult.duration > 0 && attackResult.duration < delayTime) {
        delayTime = attackResult.duration;
      }

      errorMessages.push(...attackResult.errorMessages);

      if (attackResult.success) {
        attackedServers += 1;
        totalThreads += attackResult.threads;
      }
    });

    // Log results and wait for the next attack round
    // We haven't updated measurements.rounds yet
    const currentRound = measurements.rounds + 1;
    const roundLabel = `Attack-Round ${currentRound}`;
    if (attackedServers > 0) {
      logger.info(
        fname,
        `Finished ${roundLabel} - Attacked servers: ${attackedServers}, Total threads: ${totalThreads}`,
      );
      if (delayTime === 0) {
        throw "Sleep Time is 0";
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

/** @param {NS} ns */
export async function main(ns) {
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
      "  -k, --kill          Kill running controller/attack scripts before starting.",
    );
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
