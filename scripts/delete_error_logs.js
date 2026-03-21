import { FileLogger } from "./utils/logger";

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([
    ["help", false],
    ["h", false],
  ]);
  if (args.help || args.h) {
    ns.tprint(`Usage: run ${ns.getScriptName()}`);
    ns.tprint("");
    ns.tprint("Delete Error Logs");
    ns.tprint("=====================");
    ns.tprint("");
    ns.tprint("Deletes all error logs from the /errors/ directory.");
    return;
  }

  const errorDir = FileLogger.errorDirectory;
  const errorFiles = ns.ls("home", errorDir);

  for (const file of errorFiles) {
    if (!ns.rm(`${file}`)) {
      ns.tprint(`Failed to delete error log: ${file}`);
      return;
    }
  }
  ns.tprint(`Deleted ${errorFiles.length} error logs.`);
}
