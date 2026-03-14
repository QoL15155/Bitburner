/**
 * Checks the beliefs of the various scripts
 */

import { printError, printWarn, printInfo } from "/utils/print";
import { calculateServerExecutionTimes, distributionScripts } from "./utils";

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
  testTimes("hack", times.hack, actualHackTime);

  const actualWeakenTime = ns.getWeakenTime(serverName);
  testTimes("weaken", times.weaken, actualWeakenTime);

  // FIXME: see if this difference is an issue. if not, make sure no error
  const actualGrowTime = ns.getGrowTime(serverName);
  testTimes("grow", times.grow, actualGrowTime);

  ns.tprint(`[${fname}] Finished execution`);
  return success;

  // Logger
  function testTimes(type, expected, actual) {
    if (expected == actual) return;
    success = false;

    const msg = `[${fname}] Server '${serverName}' - unexpected ${type} time: ${expected} != ${actual}`;
    if (Math.abs(expected - actual) < 1) {
      printWarn(ns, msg);
    } else {
      printError(ns, msg);
    }
  }
}

/**
 * Tests that the RAM on the distribution scripts is as expected.
 */
function distributionScriptsTest(ns) {
  const fname = "distributionScriptsTest";

  for (const key in distributionScripts) {
    const category = distributionScripts[key];

    let scriptRam = ns.getScriptRam(category.loopScript);
    if (category.ram != scriptRam)
      printError(
        ns,
        `[${fname}] Unexpected RAM for '${category.loopScript}': ${category.ram}!=${scriptRam}`,
      );
    scriptRam = ns.getScriptRam(category.targetScript);
    if (category.ram != scriptRam)
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
