import { writeGangTasks, scriptHackingGang } from "./utils.js";
import { printInfo, printError, print } from "utils/print.js";

/**
 * Handles joining a new gang, or starting gang management after restart
 *
 * - Tasks :
 *          Write tasks info to a json file.
 *          Can be used by other scripts to assign tasks to gang members.
 * - Gang Members :
 *          Calls ongoing script to manage gang members' tasks and wanted level,
 *          and recruit new members when possible.
 */

/**
 * Calls appropriate gang management script.
 * Should only be called after a gang has been formed
 *
 * @param {NS} ns - Netscript API object
 * @param {boolean} toKill - whether to kill currently running gang management script. Default: false
 * @return {boolean} False when the script was called with errors
 */
export function startGangManagement(ns, toKill = false) {
  // Write tasks info to a json file for other scripts to use.
  const gangInformation = ns.gang.getGangInformation();
  const isHackingGang = gangInformation.isHacking;
  writeGangTasks(ns, isHackingGang);

  // TODO: sort-out members?

  if (!isHackingGang) {
    ns.tprint("ERROR Combat gang is not implemented yet!");
    return true;
  }

  const gangManagementScript = scriptHackingGang;
  if (!handleRunningScript(ns, gangManagementScript, toKill)) {
    return true;
  }

  print(ns, `Running ${gangManagementScript}`);
  const gangMembers = JSON.stringify(ns.gang.getMemberNames());
  const pid = ns.run(gangManagementScript, { threads: 1 }, gangMembers);
  return pid !== 0;
}

/**
 * Checks if the gang management script is already running, and kills it if toKill is true.
 *
 * @param {NS} ns - Netscript API object
 * @param {string} scriptName - Name of the script to check
 * @param {boolean} toKill - Whether to kill the script if it's running
 * @returns {boolean} True if the script is not running or was killed successfully, false otherwise
 */
function handleRunningScript(ns, scriptName, toKill) {
  if (!ns.scriptRunning(scriptName, "home")) {
    return true;
  }

  // Script is already running
  if (!toKill) {
    ns.tprint(`WARN Script ${scriptName} is already running. SKIPPING...`);
    return false;
  }

  const killResult = ns.scriptKill(scriptName, "home");

  if (!killResult) {
    ns.tprint(`ERROR Failed to kill already running script ${scriptName}.`);
    return false;
  }

  if (ns.scriptRunning(scriptName, "home")) {
    ns.tprint(
      `ERROR Even after killing, script ${scriptName} is still running.`,
    );
    return false;
  }

  ns.tprint(`Killed already running script ${scriptName}. Restarting...`);
  return true;
}

//#region Main

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
  const defaultOptions = ["-h", "--help", "--tail"];
  const options = ["--faction", "-k", "--kill"];

  return [...defaultOptions, ...options];
}

export async function main(ns) {
  const args = ns.flags([
    ["help", false],
    ["h", false],
    ["faction", "Slum Snakes"],
    ["kill", false],
    ["k", false],
  ]);
  if (args.help || args.h) {
    ns.tprint(`Usage: run ${ns.getScriptName()}`);
    ns.tprint("");
    ns.tprint("Initial Gang Recruit Script");
    ns.tprint("=====================");
    ns.tprint("");
    ns.tprint("This script should be run once when you first create a gang.");
    ns.tprint("- Generates a task-list for the gang.");
    ns.tprint(
      "- Calls ongoing script to manage gang members' tasks and wanted level, and recruit new members when possible.",
    );
    ns.tprint("");
    ns.tprint("Options:");
    ns.tprint(
      "  --faction       - The faction to create the gang with. Default: Slum Snakes",
    );
    ns.tprint(
      "  --kill, -k      - Kill currently running gang management script.",
    );
    return 0;
  }

  const faction = args.faction;
  if (!ns.gang.createGang(faction)) {
    print(ns, `Gang already exists.`);
  } else {
    printInfo(ns, `Gang for faction ${faction} created successfully.`);
  }

  const toKill = args.kill || args.k;
  const result = startGangManagement(ns, toKill);
  if (result === false) {
    printError(ns, "Failed to call gang management script");
    ns.tail();
  }
}

//#endregion Main
