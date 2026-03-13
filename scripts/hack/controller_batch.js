import {
  printError,
  printWarn,
  printInfo,
  printLogInfo,
  print,
  formatMoney,
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
 * @param {AttackBatch} attackBatch
 * @returns {bool} false when target server is already prepped
 */
export function getPrepParameters(ns, attackBatch) {
  const fname = "getPrepParameters";
  const targetName = attackBatch.targetName;
  const targetObject = ns.getServer(targetName);

  const player = ns.getPlayer();
  const executionTimes = calculateServerExecutionTimes(ns, targetName);

  // Must run BEFORE process Weaken. Updates targetObject security level
  const growThreads = processGrow(
    ns,
    player,
    attackBatch.cpuCores,
    targetObject,
  );
  const weakenThreads = processWeaken(ns, attackBatch.cpuCores, targetObject);

  if (weakenThreads == 0 && growThreads == 0) {
    ns.print(`[${fname}] Server is already prepped.`);
    return false;
  }

  attackBatch.setPrepActions(growThreads, weakenThreads, executionTimes);
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
 * @param {AttackBatch} attackBatch
 */
function getAttackParameters(ns, attackBatch) {
  const player = ns.getPlayer();
  const targetObject = ns.getServer(attackBatch.targetName);
  const cpuCores = attackBatch.cpuCores;
  const executionTimes = calculateServerExecutionTimes(
    ns,
    targetObject.hostname,
  );

  const hackingThreads = processHack(ns, targetObject);
  const growThreads = processGrow(ns, player, cpuCores, targetObject);
  const weakenThreads = processWeaken(ns, cpuCores, targetObject);

  attackBatch.setAttackActions(
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
 * @param {AttackBatch} attackBatch
 * @returns
 */
function handleAttackParameters(ns, attackBatch) {
  const fname = "handleAttackParameters";

  ns.print(`[${fname}] Attacking server ${attackBatch.targetName}`);
  if (attackBatch.getState() == BatchState.INIT) {
    const prepResult = getPrepParameters(ns, attackBatch);
    if (prepResult) return;
  }

  // Server is already prepped
  getAttackParameters(ns, attackBatch);
}

//#endregion Parameters

//#region Sanity Checks

function doSanityTests(ns, attackBatch) {
  if (attackBatch.getState() !== BatchState.ATTACK_PARAMS) return true;

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

  if (badScripts.length == 0) return true;

  printError(
    ns,
    `[${fname}] ${targetName} scripts are running after expected time: ${badScripts.join(", ")}. Current ${Date.now()}`,
  );
  return false;
}

//#endregion Sanity Checks

//#region Attack

/** @type {AttackBatch} */
function performAttack(ns, attackingServers, attackBatch) {
  const fname = "performAttack";
  const targetName = attackBatch.targetName;
  // TODO: adjust according to distributing server cpuCores

  const timeToWait = attackBatch.getDelayForNextAttack();
  if (timeToWait != 0) {
    return timeToWait;
  }

  if (!doSanityTests(ns, attackBatch)) return 0;
  // throw "Unexpected state before attack";

  handleAttackParameters(ns, attackBatch);
  ns.print(`[${fname}] ${attackBatch.toString()}`);

  const requiredRam = attackBatch.getRequiredRam();

  // TODO: we still need to put limitation on *home* server RAM usage
  for (const serverName of attackingServers) {
    // Check available RAM
    const serverObject = ns.getServer(serverName);
    const availableRam = serverObject.maxRam - serverObject.ramUsed;
    let ramString = `RAM(required ${formatRam(requiredRam)}, available ${formatRam(availableRam)})`;
    if (requiredRam > availableRam) {
      ns.print(
        `[${fname}] Cannot attack from ${serverName}. Not enough RAM. ${ramString}`,
      );
      continue;
    }

    printLogInfo(
      ns,
      `[${fname}] Attacking ${targetName} from ${serverName}. ${ramString}. Time: ${Date.now()}`,
    );

    attackBatch
      .getActions()
      .forEach((action) => runAttackAction(ns, serverName, targetName, action));

    attackBatch.setEndTime();
    return attackBatch.getAttackDuration();
  }

  printError(
    ns,
    `[${fname}] Failed to find server to run attack on ${targetName}`,
  );

  return 0;
}

//#endregion Attack

/**
 * Do batch attack in a loop.
 * For each attack, loop through the list of attacking servers and try to run the attack scripts.
 * If no server has enough RAM, wait for some time and try again.
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

  let attackList = [];
  targetServers.forEach((targetName) => {
    const attackBatch = new AttackBatch(ns, 1, targetName, distributionScripts);
    attackList.push(attackBatch);
  });

  let round = 1;
  while (true) {
    let minTime = Infinity;
    let attackedServers = 0;
    attackList.forEach((attackBatch) => {
      const duration = performAttack(ns, attackingServers, attackBatch);
      if (duration < 0) throw `Got an invalid duration ${duration}`;
      if (duration > 0 && duration < minTime) {
        minTime = duration;
        attackedServers += 1;
      }
    });

    if (attackedServers > 0) {
      printLogInfo(
        ns,
        `Finished Attack-Round #${round}. Attacked servers: ${attackedServers}`,
      );
      if (minTime == 0) {
        throw "Min Time is 0";
      }
    } else {
      // Bad flow. we shouldn't get here
      printWarn(
        ns,
        `Finished Attack-Round #${round}. with no attacked servers.`,
      );
      minTime = 600;
    }

    minTime = Math.ceil(minTime) + delayIncrease;
    // minTime = Math.max(minTime, 600);
    await ns.sleep(minTime);
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
