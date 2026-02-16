import { list_servers } from "./utils.js"


export function find_contracts_servers(ns)
{
  var servers = list_servers(ns);
  var interesting_servers = servers.filter(s => ns.ls(s).find(f => f.endsWith("cct")));

  ns.tprint("Interesting servers:");
  ns.printf("Interesting servers:");
  interesting_servers.forEach(
    function (server_name) {
      var contracts = ns.ls(server_name).filter(f => f.endsWith("cct"))
      ns.printf(`\t- ${server_name} : ${contracts}`)
      ns.tprint(`\t- ${server_name} : ${contracts}`)

    }
  )
}



/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([["help", false]]);
  if (args.help) {
    ns.tprint("This script helps you find an unsolved coding contract.");
    ns.tprint(`Usage: run ${ns.getScriptName()}`);
    ns.tprint("Example:");
    ns.tprint(`> run ${ns.getScriptName()}`);
    return;
  }

  find_contracts_servers(ns);
  // ns.share();

  // var contract =  getContract("contract-253383.cct", "aevum-police");


}