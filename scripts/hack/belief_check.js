/**
 * Checks the beliefs of the various scripts
 */

import { printError, printWarn, printInfo } from "/utils/print.js";
import {
  calculateServerExecutionTimes,
  distributionScripts,
  getGrowSecurityIncrease,
  getHackSecurityIncrease,
} from "./utils.js";

/**
 * Tests that the server execution times are calculated as expected.
 * @param {NS} ns
 * @param {string} serverName
 * @return {bool} true if the times are as expected, false otherwise
 */
function calculateServerExecutionTimesTest(ns, serverName) {
  const fname = "calculateServerExecutionTimesTest";
  let success = true;

  // Act
  const times = calculateServerExecutionTimes(ns, serverName);

  // Assert
  const actualHackTime = ns.getHackTime(serverName);
  testTimes("hack", times.hackTime, actualHackTime);

  const actualWeakenTime = ns.getWeakenTime(serverName);
  testTimes("weaken", times.weakenTime, actualWeakenTime);

  // FIXME: see if this difference is an issue. if not, make sure no error
  const actualGrowTime = ns.getGrowTime(serverName);
  testTimes("grow", times.growTime, actualGrowTime);

  ns.tprint(`[${fname}] Finished execution`);
  return success;

  function testTimes(type, expected, actual) {
    if (expected === actual) return;
    success = false;

    const msg = `[${fname}] Server '${serverName}' - unexpected ${type} time: ${expected} != ${actual}`;
    if (Math.abs(expected - actual) < 1) {
      printWarn(ns, msg);
    } else {
      printError(ns, msg);
    }
  }
}

//#region SecurityIncrease

function testGrowthSecurityIncrease(
  ns,
  serverObject,
  cpuCores,
  toRound = true,
) {
  const fname = "testGrowthSecurityIncrease";
  const allowMinusThreads = true;

  const player = ns.getPlayer();
  const hostname = serverObject.hostname;

  let threads = ns.formulas.hacking.growThreads(
    serverObject,
    player,
    serverObject.moneyMax,
    cpuCores,
  );
  if (toRound) {
    threads = Math.ceil(threads);
  }

  if (!allowMinusThreads && threads <= 0) {
    ns.tprint(
      `[${fname}] '${hostname}' has no grow threads: ${threads}. Skipping test.`,
    );
    return;
  }

  const expectedIncrease = ns.growthAnalyzeSecurity(
    threads,
    hostname,
    cpuCores,
  );

  // Act
  const increase = getGrowSecurityIncrease(threads);

  // Assert
  if (increase !== expectedIncrease) {
    printError(
      ns,
      `[${fname}] Unexpected security increase: ${increase} != ${expectedIncrease}. Threads: ${threads}, rounded? ${toRound}`,
    );
  }
}

function testHackSecurityIncrease(ns, serverObject, toRound = true) {
  const fname = "testHackSecurityIncrease";
  const allowMinusThreads = true;

  const hostname = serverObject.hostname;

  // Arrange
  let threads = ns.hackAnalyzeThreads(hostname, serverObject.moneyMax);
  if (toRound) {
    threads = Math.ceil(threads);
  }

  if (!allowMinusThreads && threads <= 0) {
    ns.tprint(
      `[${fname}] '${hostname}' has no hack threads: ${threads}. Skipping test.`,
    );
    return;
  }

  const expectedIncrease = ns.hackAnalyzeSecurity(threads, hostname);

  // Act
  const increase = getHackSecurityIncrease(threads);

  // Assert
  if (increase !== expectedIncrease) {
    printError(
      ns,
      `[${fname}] Unexpected security increase: ${increase} != ${expectedIncrease}. Threads: ${threads}, rounded? ${toRound}`,
    );
  }
}

/**
 * Tests security increase from grow/hack actions.
 */
function getSecurityIncreaseTest(ns, serverName) {
  const fname = "getSecurityIncreaseTest";
  const serverObject = ns.getServer(serverName);

  const cpuCores = [1, 2, 4, 8];

  // Test Hack
  testHackSecurityIncrease(ns, serverObject, true);
  testHackSecurityIncrease(ns, serverObject, false);

  // Test Grow
  cpuCores.forEach((cores) => {
    testGrowthSecurityIncrease(ns, serverObject, cores, true);
    testGrowthSecurityIncrease(ns, serverObject, cores, false);
  });

  ns.tprint(`[${fname}] Finished execution`);
}

//#endregion SecurityIncrease

/**
 * Tests that the RAM on the distribution scripts is as expected.
 */
function distributionScriptsTest(ns) {
  const fname = "distributionScriptsTest";

  for (const key in distributionScripts) {
    const category = distributionScripts[key];

    // Loop script
    let scriptRam = ns.getScriptRam(category.loopScript);
    if (category.ram !== scriptRam)
      printError(
        ns,
        `[${fname}] Unexpected RAM for '${category.loopScript}': ${category.ram}!=${scriptRam}`,
      );

    // Target script
    scriptRam = ns.getScriptRam(category.targetScript);
    if (category.ram !== scriptRam)
      printError(
        ns,
        `[${fname}] Unexpected RAM for '${category.targetScript}': ${category.ram}!=${scriptRam}`,
      );
  }
  ns.tprint(`[${fname}] Finished execution`);
}

function checkBeliefs(ns) {
  const serverName = "ecorp";

  distributionScriptsTest(ns);
  getSecurityIncreaseTest(ns, serverName);
  calculateServerExecutionTimesTest(ns, serverName);

  printInfo(ns, "=> Check completed");
}

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
  const defaultOptions = ["-h", "--help", "--tail"];

  return [...defaultOptions];
}

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([
    ["help", false],
    ["h", false],
  ]);
  if (args.help || args.h) {
    ns.tprint(`Usage: run ${ns.getScriptName()}`);
    ns.tprint("");
    ns.tprint("Checks some of the axiom the various scripts depend on");
    return;
  }

  checkBeliefs(ns);
}
