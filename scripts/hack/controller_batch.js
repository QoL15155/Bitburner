import {
  printError,
  printWarn,
  printInfo,
  printLogInfo,
  print,
  formatMoney,
  printLogWarn,
} from "/utils/print";
import { formatRam } from "/utils/formatters";
import { AttackBatch, BatchState, delayIncrease } from "/hack/attack_batch";
import {
  calculateServerExecutionTimes,
  distributionScripts,
  processGrow,
  processWeaken,
  processHack,
  runAttackAction,
} from "/hack/utils";

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

  const player = ns.getPlayer();
  // FIXME: do we need ALL execution times here? we only need weaken
  const executionTimes = calculateServerExecutionTimes(ns, targetName);

  // Must run BEFORE process Weaken. Updates targetObject security level
  const growThreads = processGrow(ns, player, cpuCores, targetObject);
  const weakenThreads = processWeaken(ns, cpuCores, targetObject);

  if (weakenThreads == 0 && growThreads == 0) {
    ns.print(`[${fname}] Server is already prepped.`);
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
  const player = ns.getPlayer();
  const targetObject = ns.getServer(attackBatch.targetName);
  const executionTimes = calculateServerExecutionTimes(
    ns,
    targetObject.hostname,
  );

  const hackingThreads = processHack(ns, targetObject);
  const growThreads = processGrow(ns, player, cpuCores, targetObject);
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

  if (attackBatch.cpuCores == cpuCores) {
    // Parameters are already set
    return;
  }

  if (attackBatch.getState() === BatchState.INIT) {
    const prepResult = getPrepParameters(ns, cpuCores, attackBatch);
    if (prepResult) {
      return;
    }

    ns.print(
      `[${fname}] Server is already prepped. Gathering attack parameters`,
    );
  }

  // Server is already prepped
  getAttackParameters(ns, cpuCores, attackBatch);
}

//#endregion Parameters

//#region Sanity Checks

function doSanityTests(ns, attackBatch) {
  if (attackBatch.getState() === BatchState.INIT) return true;

  const result = testScriptsNotRunning(ns, attackBatch);
  if (!result) return false;

  // Don't update result. (DO NOT SKIP Target)
  // If the scripts are not running, these values won't change.
  testTargetServerValues(ns, attackBatch.targetName);

  return true;
}

function sanitizeServerMaxMoney(ns, serverObject) {
  const fname = "sanitizeServerMaxMoney";
  const moneyMax = formatMoney(serverObject.moneyMax);
  const moneyAvailable = formatMoney(serverObject.moneyAvailable);
  // Due to floating point crap, sometime we get to 99% percent of the max money
  if (moneyMax == moneyAvailable) return true;

  printError(
    ns,
    `[${fname}] Server ${serverObject.hostname} Money is not at max. ${moneyAvailable} != ${moneyMax}`,
  );
  return false;
}

function testTargetServerValues(ns, targetName) {
  const fname = "testTargetServerValues";
  const hackedObject = ns.getServer(targetName);
  let success = true;

  // Hack difficulty
  if (hackedObject.hackDifficulty != hackedObject.minDifficulty) {
    printError(
      ns,
      `[${fname}] Target '${targetName}' with unexpected Hack difficulty: ${hackedObject.hackDifficulty}, expected ${hackedObject.minDifficulty}`,
    );
    success = false;
  }

  // Money
  success |= sanitizeServerMaxMoney(ns, hackedObject);

  return success;
}

/**
 * Tests that the attack scripts are not running.
 *
 * Resets the attack action pid for the scripts that are not running..
 *
 * @param {NS} ns
 * @param {AttackBatch} attackBatch
 * @returns {boolean} true if all attack scripts are not running, false otherwise
 */
function testScriptsNotRunning(ns, attackBatch) {
  const fname = "testScriptsNotRunning";
  const targetName = attackBatch.targetName;

  let badScripts = [];

  attackBatch.getActions().forEach((action) => {
    if (action.pid == 0) return;

    if (ns.isRunning(action.pid, action.hostname, targetName)) {
      badScripts.push(action.scriptName);
    } else {
      action.pid = 0;
    }
  });

  if (badScripts.length == 0) {
    // Success
    return true;
  }

  const message = `[${fname}] server:${targetName}, running scripts: ${badScripts.join(", ")}. Current time: ${Date.now()}`;
  printError(ns, message);

  return false;
}

//#endregion Sanity Checks

//#region Attack

class AttackResult {
  constructor(success, delayTime) {
    this.success = success;
    this.duration = delayTime;
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

  if (!doSanityTests(ns, attackBatch)) {
    return new AttackResult(false, 0);
    // throw "Unexpected state before attack";
  }

  attackBatch.reset();

  ns.print(`[${fname}] Attacking ${targetName}`);

  for (const serverName of attackingServers) {
    const serverObject = ns.getServer(serverName);

    handleAttackParameters(ns, serverObject.cpuCores, attackBatch);

    // Check available RAM
    const requiredRam = attackBatch.getRequiredRam();
    const availableRam = serverObject.maxRam - serverObject.ramUsed;
    let ramString = `RAM(required ${formatRam(requiredRam)}, available ${formatRam(availableRam)})`;
    if (requiredRam > availableRam) {
      ns.print(
        `[${fname}] Cannot attack from ${serverName} - not enough RAM. ${ramString}`,
      );
      continue;
    }

    printLogInfo(
      ns,
      `[${fname}] Attacking ${targetName} from ${serverName}. ${ramString}. Time: ${Date.now()}`,
    );
    ns.print(`[${fname}] ${attackBatch.toString()}`);

    attackBatch
      .getActions()
      .forEach((action) => runAttackAction(ns, serverName, targetName, action));

    attackBatch.setEndTime();
    return new AttackResult(true, attackBatch.getAttackDuration());
  }

  printError(
    ns,
    `[${fname}] Failed to find server to run attack on ${targetName}`,
  );

  return new AttackBatchResult(false, 0);
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
  // TODO:
  // Without formulas, a common de facto algorithm for finding the best server to target is to parse the list down
  // to only servers with a hacking requirement of half your level,
  // then divide their max money by the minimum security level.
  // Pick whichever server scores highest.
  // (For a fully functional batcher, you don't need to do that division)

  // Initialize attack batch for each target server
  let attackList = [];
  targetServers.forEach((targetName) => {
    const attackBatch = new AttackBatch(ns, targetName, distributionScripts);
    attackList.push(attackBatch);
  });

  let round = 1;
  while (true) {
    let sleepTime = Infinity;
    let attackedServers = 0;

    // Perform attack on each target server.
    attackList.forEach((attackBatch) => {
      /** @type {AttackResult} */
      const result = performAttack(ns, attackingServers, attackBatch);
      if (result.duration < 0) {
        throw `Got an invalid duration ${duration}`;
      }
      if (result.duration > 0 && result.duration < sleepTime) {
        sleepTime = result.duration;
      }
      if (result.success) {
        attackedServers += 1;
      }
    });

    // Log results and wait for the next attack round
    const message = `Finished Attack-Round ${round} -`;
    if (attackedServers > 0) {
      printLogInfo(ns, `${message} Attacked servers: ${attackedServers}`);
      if (sleepTime == 0) {
        throw "Sleep Time is 0";
      }
    } else {
      // Bad flow. we shouldn't get here
      sleepTime = delayIncrease;
      printWarn(
        ns,
        `${message} No attacked servers sleeping for ${sleepTime}ms`,
      );
    }

    sleepTime = Math.max(sleepTime, delayIncrease);
    await ns.sleep(sleepTime);
    round++;
  }
}

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([
    ["help", false],
    ["h", false],
  ]);
  if (args.help || args.h || args._.length != 2) {
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
    return;
  }

  const attackingServers = JSON.parse(args._[0]);
  const targetServers = JSON.parse(args._[1]);

  ns.disableLog("exec");
  ns.disableLog("sleep");

  ns.ui.openTail();

  await doBatchAttack(ns, attackingServers, targetServers);
}
