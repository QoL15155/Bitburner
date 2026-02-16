/** @param {NS} ns */
export async function main(ns) {
  // How much RAM each purchased server will have. In this case, it'll
  // be 8GB.
  const RAM = 8;
  // Sleep time - 1 Minute
  const WAIT_TIME = 60000;
  const SCRIPT_NAME = "get_money.js";

  const args = ns.flags([['help', false], ['h', false]]);
  if (args.help || args.h) {
    ns.tprint("This script will purchase servers and run script one them.");
    ns.tprint("");
    ns.tprint("If TARGET_SERVER is not specified, it will be n00dles.");
    ns.tprint(`Purchased servers will have ${RAM} GB of RAM.`);
    ns.tprint(`USAGE: run ${ns.getScriptName()} TARGET_SERVER`);
    ns.tprint("Example:");
    ns.tprint(`> run ${ns.getScriptName()} n00dles`);
    return;
  }
  let target_server = args._[0];
  if (!target_server) {
    target_server = "n00dles";
  }

  const g_script_mem = ns.getScriptRam(SCRIPT_NAME);
  if (g_script_mem >= RAM) {
    ns.tprint(`Not enough RAM to run ${SCRIPT_NAME} on purchased servers. Required: ${g_script_mem}, Purchased Server RAM: ${RAM}`);
    return;
  }
  var threads = Math.floor(RAM / g_script_mem);
  if (threads == 0) {
    ns.tprint(`Not enough RAM to run ${SCRIPT_NAME} on purchased servers. Required: ${g_script_mem}, Purchased Server RAM: ${RAM}, Threads: 0`);
    return;
  }

  let max_servers = ns.getPurchasedServerLimit();
  ns.printf("Purchased Server Limit: %d", max_servers);
  let purchasedServers = ns.getPurchasedServers();
  ns.printf("Purchased servers: %s (%d)", purchasedServers, purchasedServers.length);

  // Iterator we'll use for our loop
  let i = purchasedServers.length;

  // Continuously try to purchase servers until we've reached the maximum
  // amount of servers
  while (i < ns.getPurchasedServerLimit()) {
    // Check if we have enough money to purchase a server
    if (ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(RAM)) {
      ns.printf("Purchasing server #%d", i);

      // If we have enough money, then:
      //  1. Purchase the server
      //  2. Copy our hacking script onto the newly-purchased server
      //  3. Run our hacking script on the newly-purchased server with threads
      //  4. Increment our iterator to indicate that we've bought a new server
      let hostname = ns.purchaseServer("pserv-" + i, RAM);
      ns.scp(SCRIPT_NAME, hostname);
      ns.exec(SCRIPT_NAME, hostname, threads, target_server);
      ++i;
    }

    //Make the script wait for a second before looping again.
    //Removing this line will cause an infinite loop and crash the game.
    await ns.sleep(WAIT_TIME);
  }
}