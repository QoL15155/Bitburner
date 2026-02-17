/** @param {NS} ns */
export async function main(ns) {

  const args = ns.flags([['help', false], ['h', false]]);
  const targetServer = args._[0];
  const moneyThresh = args._[1];
  const securityThresh = args._[2];
  if (args.help || args.h || !targetServer || !moneyThresh || !securityThresh) {
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