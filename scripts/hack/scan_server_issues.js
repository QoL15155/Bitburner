import { listServers } from "/utils/servers.js";
import { printError } from "/utils/print.js";
import { formatMoney } from "/utils/formatters.js";

let onlyTestWithMoneyZero = false;

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

  if (onlyTestWithMoneyZero) {
    return moneyAvailable == 0;
  }

  return true;
}

function simulateGrow(ns, targetName) {
  /** @type {Server} */
  const serverHome = ns.getServer("home");
  const targetObject = ns.getServer(targetName);
  const player = ns.getPlayer();

  const moneyMax = targetObject.moneyMax;
  const moneyAvailable = targetObject.moneyAvailable;

  const moneyMultiplier = moneyMax / Math.max(moneyAvailable, 1);
  let growThreads = ns.growthAnalyze(
    targetName,
    moneyMultiplier,
    serverHome.cpuCores,
  );
  growThreads = Math.ceil(growThreads);
  // const growResult = growThreads * (2 / 3);
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
    const diff = growThreadsFormula - growResult;
    let errorMessage = `'${targetName}' Grow threads mismatch. Formula: ${growThreadsFormula}, Value: ${growResult}. Diff: ${diff}`;
    if (moneyAvailable == 0 && moneyMultiplier == moneyMax) {
      errorMessage += `\n\t\t Money - Current: $0, Max: ${formatMoney(moneyMax)} (${moneyMax}).`;
    } else {
      errorMessage += `\n\t\t Money available:${formatMoney(moneyAvailable)} (${moneyAvailable}). Multiplier: ${moneyMultiplier}. Max: ${formatMoney(moneyMax)} (${moneyMax}). `;
      // `Money available:${formatMoney(moneyAvailable)} (${moneyAvailable}). Multiplier: ${moneyMultiplier}. Details: ${JSON.stringify(targetObject, null, 2)}`,
    }
    printError(ns, errorMessage);
    return false;
  }
  return true;
}

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
  const defaultOptions = ["-h", "--help", "--tail"];
  const options = ["--only-money-zero"];

  return [...defaultOptions, ...options];
}

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([
    ["help", false],
    ["h", false],
    ["only-money-zero", false],
  ]);
  if (args.help || args.h) {
    ns.tprint(`Usage: run ${ns.getScriptName()} `);
    ns.tprint("");
    ns.tprint("Checks for issue with my algos across all servers");
    return;
  }

  onlyTestWithMoneyZero = args["only-money-zero"] == true;

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

  successfulServersList = successfulServersList.sort();
  ns.tprint(
    `Grow simulation completed. Success: ${successfulServersList.length}/${legitServers} \n\tservers: ${successfulServersList.join(", ")}`,
  );
}
