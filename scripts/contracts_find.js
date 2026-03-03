import { searchForServerContracts } from "./utils/contracts.js";
import { print } from "./utils/print.js";


function findContractsInServers(ns) {
  const serversWithContracts = searchForServerContracts(ns);

  print(ns, "Interesting servers:");
  serversWithContracts.forEach(
    function (serverData) {
      let serverName = serverData.serverName;
      print(ns, `\t - ${serverName} `)

      serverData.contracts.forEach(
        function (contractName) {
          print(ns, `\t\t${contractName}`);
        }
      )
    });
}

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([["help", false], ["h", false]]);
  if (args.help || args.h) {
    ns.tprint("This script helps you find an unsolved coding contract.");
    ns.tprint(`Usage: run ${ns.getScriptName()}`);
    ns.tprint("Example:");
    ns.tprint(`> run ${ns.getScriptName()}`);
    return;
  }

  findContractsInServers(ns);
}