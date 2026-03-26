import { printInfo, printError } from "/utils/print.js";
import { exportServersData, runTerminalCommand } from "/utils/servers.js";
import { manageGang } from "/gangs/start.js";

const backdoorScript = "backdoor_all.js";

/**
 * This script is intended to be run right after machine reset.
 *
 * Resets the environment
 * - Exports servers data to a file
 * - Creates an alias for buying hacking programs
 * - Runs gang management script if player is in a gang
 */

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([
    ["help", false],
    ["h", false],
  ]);
  if (args.help || args.h) {
    ns.tprint(`Usage: run ${ns.getScriptName()} `);
    ns.tprint("");
    ns.tprint("Hello World");
    ns.tprint("=====================");
    ns.tprint("");
    ns.tprint("This script is intended to be run right after machine reset.");
    ns.tprint("Resets the environment and starts to run important scripts.");
    return;
  }

  exportServersData(ns);
  ns.tprint("Environment reset. Servers data exported.");

  printInfo(ns, `Alias for buying hacking programs: 'buyprogs'`);
  const buyAlias =
    'alias buyprogs="buy BruteSSH.exe; buy FTPCrack.exe; buy relaySMTP.exe; buy HTTPWorm.exe; buy SQLInject.exe;"';
  await runTerminalCommand(ns, buyAlias);

  if (!ns.hasTorRouter()) {
    printError(ns, "You don't have TOR router.");
  }

  if (ns.gang.inGang()) {
    ns.tprint("Running gang management script");
    if (!manageGang(ns)) {
      printError(ns, "Failed to run gang management script");
      ns.ui.openTail();
    }
  }

  ns.tprint("Running backdoor script");
  ns.run(backdoorScript);
}
