/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
  const helpOptions = ["-h", "--help"];
  if (args.some(a => helpOptions.includes(a))) {
    return [];
  }
  const defaultOptions = helpOptions.concat("--tail");
  let servers = data.servers;

  if (args.some(a => servers.includes(a))) {
    servers = [];
  }

  return [...defaultOptions, ...servers];
}

/** @param {NS} ns */
export async function main(ns) {
  // How much RAM each purchased server will have. 
  // Sleep time - 1 Minute
  const waitTime = 60000;
  const scriptName = "get_money_now.js";

  const args = ns.flags([['help', false], ['h', false]]);
  if (args.help || args.h) {
    ns.tprint(`USAGE: run ${ns.getScriptName()} TARGET_SERVER`);
    ns.tprint("");
    ns.tprint("This script will purchase servers and run script one them.");
    ns.tprint("");
    ns.tprint("If TARGET_SERVER is not specified, it will be n00dles.");
    ns.tprint("");
    ns.tprint("Example:");
    ns.tprint(`> run ${ns.getScriptName()} n00dles`);
    return;
  }
  let targetServer = args._[0];
  if (!targetServer) {
    targetServer = "n00dles";
  }

  const maxRam = ns.getPurchasedServerMaxRam();
  ns.tprint(`Maximum RAM for purchased servers: ${maxRam} GB`);
  ns.tprint(`Target server: ${targetServer}`);

  ns.disableLog("sleep");

  const scriptRam = ns.getScriptRam(scriptName);
  if (scriptRam >= maxRam) {
    ns.tprint(`Not enough RAM to run ${scriptName} on purchased servers. Required: ${scriptRam}, Purchased Server RAM: ${maxRam}`);
    return;
  }
  const threads = Math.floor(maxRam / scriptRam);
  if (threads == 0) {
    ns.tprint(`Not enough RAM to run ${scriptName} on purchased servers. Required: ${scriptRam}, Purchased Server RAM: ${maxRam}, Threads: 0`);
    return;
  }

  const maxServers = ns.getPurchasedServerLimit();
  ns.printf("Purchased Server Limit: %d", maxServers);
  const purchasedServers = ns.getPurchasedServers();
  ns.printf("Purchased servers: %s (%d)", purchasedServers, purchasedServers.length);

  let i = purchasedServers.length;

  // Continuously try to purchase servers until we've reached the maximum amount of servers
  while (i < ns.getPurchasedServerLimit()) {
    // Check if we have enough money to purchase a server
    if (ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(maxRam)) {
      purchaseServer(i);
      ++i;
    } else {
      // Make the script wait for a second before looping again.
      // Removing this line will cause an infinite loop and crash the game.
      await ns.sleep(waitTime);
    }
  }

  let purchaseCount = maxServers - purchasedServers.length;
  ns.tprint(`[+] Purchased ${purchaseCount} servers with ${maxRam} GB of RAM each.`);

  function purchaseServer(i) {
    ns.printf("Purchasing server #%d", i);

    // If we have enough money, then:
    //  1. Purchase the server
    //  2. Copy our hacking script onto the newly-purchased server
    //  3. Run our hacking script on the newly-purchased server with threads
    //  4. Increment our iterator to indicate that we've bought a new server
    let hostname = ns.purchaseServer("pserv-" + i, maxRam);
    ns.scp(scriptName, hostname);
    ns.exec(scriptName, hostname, threads, targetServer);
  }
}