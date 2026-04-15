import { connectToServer } from "/connect.js";
import { printInfo, toRed } from "/utils/print.js";
import {
  hackServer,
  importServersData,
  runTerminalCommand,
  writeServersData,
} from "/utils/servers.js";

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
  const fname = "getBackdoor";
  let result = hackServer(ns, serverName);
  if (!result) {
    const message = `[${fname}] Failed to hack ${serverName}`;
    ns.tprint(toRed(message));
    return false;
  }

  result = await connectToServer(ns, serverName);
  if (!result) {
    const message = `[${fname}] Failed to connect to ${serverName}`;
    ns.tprint(toRed(message));
    return false;
  }

  result = await runTerminalCommand(ns, "backdoor");
  if (!result) {
    // Probably a UI issue. Write message to terminal
    const message = `[${fname}] Failed to run backdoor command on ${serverName}. Please try again`;
    ns.tprint(toRed(message));
  }
  await runTerminalCommand(ns, "home");
  return result;
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
      "Installs a Backdoor on all servers that do not already have a backdoor installed",
    );
    return;
  }

  ns.disableLog("sleep");
  ns.disableLog("scan");

  const serverList = importServersData(ns);

  const serversOwned = serverList.filter((s) => s.purchasedByPlayer).length;
  const serversWithBackdoor = serverList.filter(
    (s) => s.backdoorInstalled,
  ).length;

  const targetServers = serverList.filter(
    (s) => !s.purchasedByPlayer && !s.backdoorInstalled,
  );

  let attackedServers = 0;
  for (let server of targetServers) {
    if (await processBackdoor(ns, server, serverList)) {
      attackedServers++;
    }
  }

  const report = {
    totalServers: serverList.length,
    owned: serversOwned,
    alreadyBackdoored: serversWithBackdoor,
    backdooredNow: attackedServers,
  };
  printInfo(ns, JSON.stringify(report, null, 2));

  if (attackedServers > 0) {
    writeServersData(ns, serverList);
    ns.tprint("Updated servers data file with backdoor information.");
  }
}
