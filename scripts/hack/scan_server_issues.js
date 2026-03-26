import { listServers } from "/utils/servers.js";
import { printError } from "/utils/print.js";
import { formatMoney } from "/utils/formatters.js";

function canSimulateGrow(ns, targetName) {
  /** @type {Server} */
  const targetObject = ns.getServer(targetName);

  let moneyMax = targetObject.moneyMax;
  if (!moneyMax) {
    // Server has no money, skip it.
    return false;
  }
  const moneyAvailable = targetObject.moneyAvailable;
  if (moneyAvailable == moneyMax) {
    // Server already at max money, no grow needed.
    return false;
  }
  if (moneyAvailable > moneyMax) {
    throw new Error(
      `'${targetName}' - Money available: ${formatMoney(moneyAvailable)} is greater than max ${formatMoney(moneyMax)}`,
    );
  }

  // TODO: For now only test with money 0
  if (moneyAvailable == 0) {
    return true;
  }

  return false;
}

function simulateGrow(ns, targetName) {
  /** @type {Server} */
  const serverHome = ns.getServer("home");
  const targetObject = ns.getServer(targetName);
  const player = ns.getPlayer();

  let moneyMax = targetObject.moneyMax;
  const moneyAvailable = targetObject.moneyAvailable;

  const moneyMultiplier = moneyMax / Math.max(moneyAvailable, 1);
  let growThreads = ns.growthAnalyze(
    targetName,
    moneyMultiplier,
    serverHome.cpuCores,
  );
  growThreads = Math.ceil(growThreads);
  // const grow2 = growThreads * (2 / 3);
  const growResult = growThreads * (3 / 4); //-- not good

  targetObject.moneyAvailable = 0;
  let growThreadsFormula = ns.formulas.hacking.growThreads(
    targetObject,
    player,
    moneyMax,
    serverHome.cpuCores,
  );
  growThreadsFormula = Math.ceil(growThreadsFormula);

  if (growResult < growThreadsFormula) {
    // if (growThreadsFormula !== grow2) {
    const diff = growResult - growThreadsFormula;
    printError(
      ns,
      `Grow threads mismatch for '${targetName}'. Expected: ${growResult}, Formula: ${growThreadsFormula}. Diff:${diff}`,
    );
    if (moneyAvailable == 0 && moneyMultiplier == moneyMax) {
      printError(
        ns,
        `\tMoney - Current: $0, Max: ${formatMoney(moneyMax)} (${moneyMax}).`,
      );
    } else {
      printError(
        ns,
        `\tMoney available:${formatMoney(moneyAvailable)} (${moneyAvailable}). Multiplier: ${moneyMultiplier}. Max: ${formatMoney(moneyMax)} (${moneyMax}). `,
        // `Money available:${formatMoney(moneyAvailable)} (${moneyAvailable}). Multiplier: ${moneyMultiplier}. Details: ${JSON.stringify(targetObject, null, 2)}`,
      );
    }
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
  let successfulServersList = [];
  let legitServers = 0;
  for (const server of servers) {
    if (canSimulateGrow(ns, server)) {
      legitServers++;
      if (simulateGrow(ns, server)) {
        successfulServersList.push(server);
      }
    }
  }

  ns.tprint(
    `Grow simulation completed. Success: ${successfulServersList.length}/${legitServers} servers: ${successfulServersList.join(", ")}`,
  );
}
