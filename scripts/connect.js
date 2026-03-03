import { scanHost, runTerminalCommand } from "./utils/servers.js"

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

/** 
 * Super Connect 
 * 
 * This script will connect to the input server even if it is not directly connected to the current server.
 * @param {NS} ns
*/
export async function main(ns) {
  const args = ns.flags([['help', false], ['h', false]]);
  let targetServer = args._[0];
  if (args.help || args.h || !targetServer) {
    ns.tprint("Usage:");
    ns.tprint(`> run ${ns.getScriptName()} TARGET_SERVER`);
    ns.tprint("");
    ns.tprint("Super Connect");
    ns.tprint("This script will connect to TARGET_SERVER, even if it is not directly connected to the current server.");
    ns.tprint("")
    return;
  }

  connectToServer(ns, targetServer);
}

/** 
 * Finds the path to the target server and returns list of servers in the path
 * 
 * @param {NS} ns
 * @param {string} targetServer
 * @return {array} list of servers in the path to the target server
 */
function findPath(ns, targetServer) {
  let path = [];
  let found = false;

  function findPathRec(serverName, parent) {
    if (serverName == targetServer) {
      found = true;
      return;
    }

    let children = scanHost(ns, serverName, parent);
    for (let i = 0; i < children.length; i++) {
      let child = children[i];
      findPathRec(child, serverName);
      if (found) {
        path.unshift(child);
        return;
      }
    }
  }

  findPathRec("home", "");
  if (found) {
    path.unshift("home");
  }
  return path;
}

/** 
 * Connect to the target server 
 * 
 * Works even if the target server is not directly connected to the current server,
 * as long as there is a path to it.
 * 
 * @param {NS} ns
 * @param {string} serverName
 * @return {boolean} true if connected successfully, false otherwise
*/
export async function connectToServer(ns, serverName) {
  const path = findPath(ns, serverName);
  if (path.length == 0) {
    ns.tprint(`Failed to find path to ${serverName}`);
    return false;
  }

  ns.tprint(`Path to ${serverName}: ${path.join(" -> ")}`);

  // Build command
  const connectString = "; connect ";
  const connectCommand = path.join(connectString);
  ns.printf(`Executing: ${connectCommand}`);

  await runTerminalCommand(ns, connectCommand);
  return true;
}
