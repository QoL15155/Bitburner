import { list_servers } from "./utils.js"


export function findContractsInServers(ns) {
  const servers = list_servers(ns);
  const interesting_servers = servers.filter(s => ns.ls(s).find(f => f.endsWith("cct")));

  ns.tprint("Interesting servers:");
  ns.printf("Interesting servers:");
  interesting_servers.forEach(
    function (serverName) {
      const contracts = ns.ls(serverName).filter(f => f.endsWith("cct"))
      ns.printf(`\t- ${serverName} : ${contracts}`)
      ns.tprint(`\t- ${serverName} : ${contracts}`)

    }
  )
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