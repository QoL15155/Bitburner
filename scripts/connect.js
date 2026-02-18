import { scan_host, run_terminal_command } from "./utils.js"

/** Finds the path to the target server and returns list of servers in the path
 * @param {NS} ns
 * @param {string} target_server
 * @return {array} list of servers in the path to the target server
 */
function find_path(ns, target_server) {
  var path = [];
  var found = false;

  function find_path_rec(server_name, parent) {
    if (server_name == target_server) {
      found = true;
      return;
    }

    var children = scan_host(ns, server_name, parent);
    for (let i = 0; i < children.length; i++) {
      let child = children[i];
      find_path_rec(child, server_name);
      if (found) {
        path.unshift(child);
        return;
      }
    }
  }

  find_path_rec("home", "");
  if (found) {
    path.unshift("home");
  }
  return path;
}

/** Connect to the target server 
 * 
 * Works even if the target server is not directly connected to the current server,
 * as long as there is a path to it.
 * 
 * @param {NS} ns
 * @param {string} target_server
 * @return {boolean} true if connected successfully, false otherwise
*/
export async function connect_to_server(ns, target_server) {
  const path = find_path(ns, target_server);
  if (path.length == 0) {
    ns.tprint(`Failed to find path to ${target_server}`);
    return false;
  }

  ns.tprint(`Path to ${target_server}: ${path.join(" -> ")}`);

  // Build command
  const CONNECT = "; connect ";
  var cmd_connect = path.join(CONNECT);
  ns.printf(`Executing: ${cmd_connect}`);

  await run_terminal_command(ns, cmd_connect);
  return true;
}

/** Super Connect 
 * 
 * This script will connect to the input server even if it is not directly connected to the current server.
 * @param {NS} ns
*/
export async function main(ns) {
  const args = ns.flags([['help', false], ['h', false]]);
  let target_server = args._[0];
  if (args.help || args.h || !target_server) {
    ns.tprint("Usage:");
    ns.tprint(`> run ${ns.getScriptName()} TARGET_SERVER`);
    ns.tprint("");
    ns.tprint("Super Connect");
    ns.tprint("This script will connect to TARGET_SERVER, even if it is not directly connected to the current server.");
    ns.tprint("")
    return;
  }

  connect_to_server(ns, target_server);
}