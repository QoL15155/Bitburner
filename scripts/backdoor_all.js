import { hackServer, runTerminalCommand, listServers } from "./utils.js"
import { connectToServer } from "./connect.js"
import { printInfo } from "./utils_print.js";

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

  const args = ns.flags([['help', false]]);
  if (args.help || args.h) {
    ns.tprint(`Usage: run ${ns.getScriptName()}`);
    ns.tprint("");
    ns.tprint("Backdoor all possible servers");
    ns.tprint("==============================");
    ns.tprint("");
    ns.tprint("The script will try to backdoor all listed servers.");
    return;
  }

  ns.disableLog("sleep");
  ns.disableLog("scan");

  let alreadyBackdoored = 0;
  let backdooredServers = 0;
  let ownedMachinesCount = 0;

  const serverList = listServers(ns);
  const myServers = ns.getPurchasedServers();
  // Target server is not specified, backdoor the default list of servers.
  for (const serverName of serverList) {
    if (myServers.includes(serverName)) {
      ownedMachinesCount++;
      continue;
    }
    const server = ns.getServer(serverName);
    if (server.backdoorInstalled == true) {
      alreadyBackdoored++;
      continue;
    }

    let success = await getBackdoor(ns, serverName);
    printInfo(ns, `Server: ${serverName}, Backdoor Success: ${success}`);
    if (success) {
      backdooredServers++;
    }
  }

  const report = { totalServers:serverList.length, owned: ownedMachinesCount, backdooredNow:backdooredServers, alreadyBackdoored: alreadyBackdoored};
  printInfo(ns, JSON.stringify(report, null, 2));
}

/** 
 * Backdoors a server if possible
 * 
 * @param {NS} ns
 * @param {string} serverName : Server to backdoor
 * @return {boolean} true if backdoored successfully, false otherwise
 */
async function getBackdoor(ns, serverName) {

  let result = hackServer(ns, serverName);
  if (!result) {
    ns.tprint(`Failed to hack ${serverName}`);
    return false;
  }

  result = await connectToServer(ns, serverName);
  if (!result) {
    ns.tprint(`Failed to connect to ${serverName}`);
    return false;
  }

  await runTerminalCommand(ns, "backdoor");
  await runTerminalCommand(ns, "home");
  return true;
}
