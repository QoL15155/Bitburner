/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
  const defaultOptions = ["-h", "--help", "--tail"];
  let servers = data.servers;

  if (args.some(a => servers.includes(a))) {
    servers = [];
  }

  return [...defaultOptions, ...servers];
}

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([['help', false], ['h', false]]);
  const targetServer = args._[0];
  if (args.help || args.h || !targetServer) {
    ns.tprint(`USAGE: run ${ns.getScriptName()} SERVER_NAME`);
    ns.tprint("");
    ns.tprint("This script will attack server for money.");
    ns.tprint("");
    ns.tprint("This script is not recommended for use.");
    ns.tprint("This script uses 'getServer...' API functions which costs unnecessary RAM");
    ns.tprint("Use 'get_money_simple.js' instead which is more efficient and has more features.");
    ns.tprint("");
    ns.tprint("Arguments:");
    ns.tprint("==========");
    ns.tprint("\tSERVER_NAME : the name of the server to attack");
    ns.tprint("");
    ns.tprint("Example:");
    ns.tprint(`> run ${ns.getScriptName()} n00dles`);
    return;
  }

  // Defines how much money a server should have before we hack it
  // In this case, it is set to the maximum amount of money.
  const moneyThresh = ns.getServerMaxMoney(targetServer);

  // Defines the minimum security level the target server can
  // have. If the target's security level is higher than this,
  // we'll weaken it before doing anything else
  const securityThresh = ns.getServerMinSecurityLevel(targetServer);

  // Infinite loop that continuously hacks/grows/weakens the target server
  while (true) {
    if (ns.getServerSecurityLevel(targetServer) > securityThresh) {
      // If the server's security level is above our threshold, weaken it
      await ns.weaken(targetServer);
    } else if (ns.getServerMoneyAvailable(targetServer) < moneyThresh) {
      // If the server's money is less than our threshold, grow it
      await ns.grow(targetServer);
    } else {
      // Finally- hack it
      await ns.hack(targetServer);
    }
  }
}