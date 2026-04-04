import { FileLogger } from "/utils/logger.js";
import { Color, toGreen } from "/utils/print.js";

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
  const defaultFolder = FileLogger.errorDirectory;
  const args = ns.flags([
    ["help", false],
    ["h", false],
  ]);
  if (args.help || args.h) {
    const usage = toGreen(`run ${ns.getScriptName()}`);
    const options = `${Color.Italic}folder${Color.Reset}`;

    ns.tprint(`Usage: ${usage} [<${options}>]`);
    ns.tprint("");
    ns.tprint("Delete Folder");
    ns.tprint("=====================");
    ns.tprint("");
    ns.tprint(`Deletes all files from the <folder> directory.`);
    ns.tprint(`Defaults to '${defaultFolder}' if no folder is specified.`);
    ns.tprint("");
    ns.tprint("Options:");
    ns.tprint(
      `  <${options}>       Folder to delete files from (default: ${defaultFolder})`,
    );
    ns.tprint("");
    ns.tprint("Example:");
    ns.tprint(`> run ${ns.getScriptName()}`);
    ns.tprint(`> run ${ns.getScriptName()} errors`);

    return;
  }

  let destinationDir = args._[0] || defaultFolder;
  if (!destinationDir.startsWith("/")) destinationDir = `/${destinationDir}`;
  if (!destinationDir.endsWith("/")) destinationDir = `${destinationDir}/`;

  const destinationFiles = ns.ls("home", destinationDir);

  for (const file of destinationFiles) {
    if (!ns.rm(`${file}`)) {
      ns.tprint(`Failed to delete: ${file}`);
      return;
    }
  }
  ns.tprint(
    `Deleted ${destinationFiles.length} files from '${destinationDir}'.`,
  );
}
