import { hackServer, runTerminalCommand } from "./utils.js"
import { connectToServer } from "./connect.js"

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
  const helpOptions = ["-h", "--help"];
  const defaultOptions = helpOptions.concat("--tail");
  if (args.some(a => helpOptions.includes(a))) {
    return [];
  }
  let servers = data.servers;

  if (args.length > 1 && args.some(a => servers.includes(a))) {
    servers = [];
  }

  return [...defaultOptions, ...servers];
}

/** @param {NS} ns */
export async function main(ns) {
  const serversToBackdoor = ["CSEC", "avmnite-02h", "I.I.I.I", "run4theh111z", "powerhouse-fitness"];

  const args = ns.flags([['help', false]]);
  if (args.help || args.h) {
    ns.tprint(`Usage: run ${ns.getScriptName()} [TARGET_SERVER]`);
    ns.tprint("");
    ns.tprint("Backdoor Script");
    ns.tprint("===============");
    ns.tprint("");
    ns.tprint("The script will backdoor TARGET_SERVER if specified.");
    ns.tprint("If TARGET_SERVER is not specified, it will backdoor the following servers:");
    for (const server of serversToBackdoor) {
      ns.tprint(`- ${server}`);
    }
    return;
  }

  const serverName = args._[0];
  if (serverName) {
    await getBackdoor(ns, serverName);
    return;
  }

  // Target server is not specified, backdoor the default list of servers.
  for (const server of serversToBackdoor) {
    let success = await getBackdoor(ns, server);
    if (!success) {
      // If we fail to backdoor a server, the others will fail as well.
      // Stop the script to avoid unnecessary attempts.
      return;
    }
  }
}

/** Backdoors a server if possible
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
