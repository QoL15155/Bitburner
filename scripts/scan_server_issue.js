import { listServers } from "/utils/servers.js";
import { printError } from "/utils/print.js";

function simulateGrow(ns, targetName) {
  const serverHome = ns.getServer("home");
  const targetObject = ns.getServer(targetName);
  const player = ns.getPlayer();

  const maxMoney = ns.getServerMaxMoney(targetName);
  if (maxMoney <= 0) {
    // Nothing to check here, skip
    return true;
  }
  const moneyAvailable = ns.getServerMoneyAvailable(targetName);
  const moneyMultiplier = maxMoney / Math.max(moneyAvailable, 1);
  const growThreads = ns.growthAnalyze(
    targetName,
    moneyMultiplier,
    serverHome.cpuCores,
  );

  const growThreadsFormula = ns.formulas.hacking.growThreads(
    targetObject,
    player,
    maxMoney,
    serverHome.cpuCores,
  );
  if (
    Math.ceil(growThreads) != growThreadsFormula &&
    Math.floor(growThreads) != growThreadsFormula
  ) {
    printError(
      ns,
      `Grow threads mismatch for ${targetName}. Expected: ${growThreads}, Actual: ${growThreadsFormula}`,
    );
    return false;
  }
  return true;
}

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([
    ["help", false],
    ["h", false],
  ]);
  if (args.help || args.h) {
    ns.tprint(`Usage: run ${ns.getScriptName()} `);
    ns.tprint("");
    ns.tprint("Checks for issue with my algos across all servers");
    return;
  }

  if (!ns.fileExists("Formulas.exe", "home")) {
    printError(ns, "Formulas.exe is required to run this script.");
    return;
  }

  const servers = listServers(ns);
  for (const server of servers) {
    simulateGrow(ns, server);
  }
}
