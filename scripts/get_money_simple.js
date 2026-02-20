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

  // Parse arguments and flags
  const args = ns.flags([['help', false], ['h', false]]);
  const targetServer = args._[0];
  const maxMoney = args._[1];
  const minSecurity = args._[2];

  if (args.help || args.h || !targetServer || !maxMoney || !minSecurity) {
    ns.tprint(`USAGE: run ${ns.getScriptName()} SERVER_NAME SERVER_MAX_MONEY SERVER_MIN_SECURITY_LEVEL`);
    ns.tprint("");
    ns.tprint("This script will attack server for money.");
    ns.tprint("Arguments:");
    ns.tprint("==========");
    ns.tprint("\tSERVER_NAME : the name of the server to attack");
    ns.tprint("\tSERVER_MAX_MONEY : the maximum amount of money the server can have");
    ns.tprint("\tSERVER_MIN_SECURITY_LEVEL : the minimum security level of the server");
    ns.tprint("");
    ns.tprint("Example:");
    ns.tprint(`> run ${ns.getScriptName()} omega-net 1628508100 11`);
    return;
  }

  // Infinite loop that continuously hacks/grows/weakens the target server
  while (true) {
    if (ns.getServerSecurityLevel(targetServer) > minSecurity) {
      // If the server's security level is above our threshold, weaken it
      await ns.weaken(targetServer);
    } else if (ns.getServerMoneyAvailable(targetServer) < maxMoney) {
      // If the server's money is less than our threshold, grow it
      await ns.grow(targetServer);
    } else {
      // Finally- hack it
      await ns.hack(targetServer);
    }
  }
}