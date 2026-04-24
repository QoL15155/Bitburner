import { FileLogger } from "/utils/logger.js";
import { toGreen } from "/utils/print.js";

function usage(ns) {
  const usage = toGreen(`run ${ns.getScriptName()}`);

  ns.tprint(`Usage: ${usage}`);
  ns.tprint("");
  ns.tprint("Clean Filesystem");
  ns.tprint("=====================");
  ns.tprint("Clean logs and error files.");
  ns.tprint("");
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
    usage(ns);
    return;
  }

  const errorsFolders = FileLogger.errorDirectory;
  const logsFolders = "/logs/";
  ns.run("/filesystem/delete_folder.js", 1, errorsFolders);
  ns.run("/filesystem/delete_folder.js", 1, logsFolders);
}
