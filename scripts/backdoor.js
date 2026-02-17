import { hack_server, run_terminal_command } from "./utils.js"
import { connect_to_server } from "./connect.js"

/** Backdoors a server if possible
 * 
 * @param {NS} ns
 * @param {string} server_name
 * @return {boolean} true if backdoored successfully, false otherwise
 */
async function get_backdoor(ns, server_name) {

  var result = hack_server(ns, server_name);
  if (!result) {
    ns.tprint(`Failed to hack ${server_name}`);
    return false;
  }

  result = await connect_to_server(ns, server_name);
  if (!result) {
    ns.tprint(`Failed to connect to ${server_name}`);
    return false;
  }

  await run_terminal_command(ns, "backdoor");
  await run_terminal_command(ns, "home");
  return true;
}

/** @param {NS} ns */
export async function main(ns) {
  const servers_to_backdoor = ["CSEC", "avmnite-02h", "I.I.I.I", "run4theh111z"];

  const args = ns.flags([['help', false]]);
  if (args.help || args.h) {
    ns.tprint(`Usage: run ${ns.getScriptName()} [TARGET_SERVER]`);
    ns.tprint("");
    ns.tprint("Backdoor Script");
    ns.tprint("===============");
    ns.tprint("");
    ns.tprint("The script will backdoor TARGET_SERVER if specified.");
    ns.tprint("If TARGET_SERVER is not specified, it will backdoor the following servers:");
    for (const server of servers_to_backdoor) {
      ns.tprint(`- ${server}`);
    }
    return;
  }

  const target_server = args._[0];
  if (target_server) {
    await get_backdoor(ns, target_server);
    return;
  }

  // Target server is not specified, backdoor the default list of servers.
  for (const server of servers_to_backdoor) {
    let success = await get_backdoor(ns, server);
    if (!success) {
      // If we fail to backdoor a server, the others will fail as well.
      // Stop the script to avoid unnecessary attempts.
      return;
    }
  }

}