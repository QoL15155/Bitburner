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
 * @return {boolean} Script successfully called
 */
export function manageGang(ns) {
  // Write tasks info to a json file for other scripts to use.
  const gangInformation = ns.gang.getGangInformation();
  const isHackingGang = gangInformation.isHacking;
  writeGangTasks(ns, isHackingGang);

  // TODO: sort-out members?

  if (!isHackingGang) {
    // TODO: implement combat gang
    ns.alert(
      "Combat gang is not implemented yet. Please switch to a hacking gang or implement combat gang management.",
    );
    return false;
  }

  const gangManagementScript = scriptHackingGang;

  if (ns.isRunning(gangManagementScript)) {
    print(ns, `script is already running. SKIP (${gangManagementScript})`);
    return true;
  }
  print(ns, `Running ${gangManagementScript}`);
  return ns.run(gangManagementScript);
}

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
  const defaultOptions = ["-h", "--help", "--tail"];
  const options = ["--faction"];

  return [...defaultOptions, ...options];
}

export async function main(ns) {
  const args = ns.flags([
    ["help", false],
    ["h", false],
    ["faction", "Slum Snakes"],
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
    return 0;
  }

  const faction = args.faction;
  if (!ns.gang.createGang(faction)) {
    print(ns, `Gang already exists.`);
  } else {
    printInfo(ns, `Gang for faction ${faction} created successfully.`);
  }

  const result = manageGang(ns);
  if (!result) {
    printError(ns, "Failed to call gang management script");
    ns.tail();
  }
}
