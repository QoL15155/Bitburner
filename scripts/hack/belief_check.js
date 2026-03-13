/**
 * Checks the beliefs of the various scripts
 */

import { printError, printInfo } from "/utils/print";
import { calculateServerExecutionTimes, distributionScripts } from "./utils";

function calculateServerExecutionTimesTest(ns, serverName) {
  const fname = "calculateServerExecutionTimesTest";

  // Act
  const times = calculateServerExecutionTimes(ns, serverName);

  // Assert
  const actualHackTime = ns.getHackTime(serverName);
  if (times.hack != actualHackTime)
    printError(
      ns,
      `[${fname}] Unexpected hack time. Expected: ${times.hack}, got: ${actualWeakenTime}`,
    );

  const actualWeakenTime = ns.getWeakenTime(serverName);
  if (times.weaken != actualWeakenTime)
    printError(
      ns,
      `[${fname}] Unexpected weaken time. Expected: ${times.weaken}, got: ${actualWeakenTime}`,
    );

  // FIXME: see if this difference is an issue. if not, make sure no error
  const actualGrowTime = ns.getGrowTime(serverName);
  if (times.grow != actualGrowTime)
    printError(
      ns,
      `[${fname}] Unexpected grow time. Expected: ${times.grow}, got: ${actualGrowTime}`,
    );

  // Final
  ns.tprint(`[${fname}] Finished execution`);
}

function distributionScriptsTest(ns) {
  const fname = "distributionScriptsTest";

  for (const key in distributionScripts) {
    const catgeory = distributionScripts[key];

    let scriptRam = ns.getScriptRam(catgeory.loopScript);
    if (catgeory.ram != scriptRam)
      printError(
        ns,
        `[${fname}] Unexpected RAM for '${catgeory.loopScript}': ${catgeory.ram}!=${scriptRam}`,
      );
    scriptRam = ns.getScriptRam(catgeory.targetScript);
    if (catgeory.ram != scriptRam)
      printError(
        ns,
        `[${fname}] Unexpected RAM for '${catgeory.targetScript}': ${catgeory.ram}!=${scriptRam}`,
      );
  }
  ns.tprint(`[${fname}] Finished execution`);
}

function checkBeliefs(ns) {
  const serverName = "ecorp";
  calculateServerExecutionTimesTest(ns, serverName);
  distributionScriptsTest(ns);

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
