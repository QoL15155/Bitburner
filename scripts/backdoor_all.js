import {
  hackServer,
  runTerminalCommand,
  listServers,
  importServersData,
  writeServersData,
} from "/utils/servers.js";
import { connectToServer } from "/connect.js";
import { printInfo } from "/utils/print.js";

//#region Backdoor

async function processBackdoor(ns, server, serverList) {
  if (!(await getBackdoor(ns, server.name))) {
    return false;
  }

  server["backdoorInstalled"] = true;
  server["hasAdminRights"] = true;

  // Update the server in the list
  serverList = serverList.filter((s) => s.name !== server.name);
  serverList.push(server);
  return true;
}

/**
 * Backdoor a server if possible
 *
 * @param {NS} ns
 * @param {string} serverName : Server to backdoor
 * @return {boolean} true if backdoor received, false otherwise
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

//#endregion Backdoor

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
  const args = ns.flags([["help", false]]);
  if (args.help || args.h) {
    ns.tprint(`Usage: run ${ns.getScriptName()}`);
    ns.tprint("");
    ns.tprint("Backdoor all possible servers");
    ns.tprint("==============================");
    ns.tprint("");
    ns.tprint(
      "Installs a Backdoor on all servers that were not already backdoored.",
    );
    return;
  }

  ns.disableLog("sleep");
  ns.disableLog("scan");

  let serverList = importServersData(ns);

  const serversOwned = serverList.filter((s) => s.purchasedByPlayer).length;
  const serversWithBackdoor = serverList.filter(
    (s) => s.backdoorInstalled,
  ).length;

  const targetServers = serverList.filter(
    (s) => !s.purchasedByPlayer && !s.backdoorInstalled,
  );

  let backdooredServers = 0;
  for (let server of targetServers) {
    if (await processBackdoor(ns, server, serverList)) {
      backdooredServers++;
    }
  }

  const report = {
    totalServers: serverList.length,
    owned: serversOwned,
    alreadyBackdoored: serversWithBackdoor,
    backdooredNow: backdooredServers,
  };
  printInfo(ns, JSON.stringify(report, null, 2));

  if (backdooredServers > 0) {
    writeServersData(ns, serverList);
    ns.print("Updated servers data file with backdoor information.");
  }
}
