import {
  printError,
  printWarn,
  printInfo,
  printLogInfo,
  print,
  formatMoney,
} from "/utils/print";
import { importServersData, canHackServer3 } from "/utils/servers";

/**
 * This script uses formulas
 */

const scriptsToDistribute = [
  "target_weaken.js",
  "target_grow.js",
  "target_hack.js",
];
const controllerScript = "/hack/controller_batch.js";

//#region Distribution

/**
 * Get servers that can run scripts, and distribute the scripts to them.
 *
 * @param {NS} ns
 * @param {Array} allServers - list of all servers in the game
 * @returns {Array} servers that can run scripts, sorted by max RAM, descending.
 */
function handleAttackingServers(ns, allServers) {
  const distributionServers = allServers.filter((s) =>
    canRunScriptsOnServer(s),
  );

  distributionServers.forEach((server) =>
    distributeScriptsToServer(ns, server.name),
  );

  return distributionServers.sort((a, b) => getMaxRam(b) - getMaxRam(a));

  function canRunScriptsOnServer(server) {
    return (
      server.maxRam > 0 &&
      (server.purchasedByPlayer ||
        canHackServer3(
          ns,
          server.numOpenPortsRequired,
          server.requiredHackingLevel,
        ))
    );
  }
  function getMaxRam(server) {
    return server.name == "home" ? Infinity : server.maxRam;
    // return server.name == "home"? 0 : server.maxRam;  // FIXME: just for testing
    // server.maxRam - ns.getServerUsedRam("home") : server.maxRam;
  }
}

function distributeScriptsToServer(ns, serverName) {
  if (serverName != "home") {
    ns.killall(serverName);
    scriptsToDistribute.forEach((script) => {
      ns.scp(script, serverName);
    });
  } else {
    // Home server - scripts may run in the background
    // only kill the relevant scripts
    scriptsToDistribute.forEach((script) => {
      ns.scriptKill(script, serverName);
    });
  }
}

//#endregion Distribution

//#region Main

/**
 * Checks if the controller script or any of the distribution scripts are running on 'home'
 * Note that we only check against 'home' server.
 *
 * @param {NS} ns
 * @returns {boolean} true if any of the scripts to distribute is running on 'home'
 */
function isHomeRunningScripts(ns) {
  for (const process of ns.ps()) {
    if (controllerScript.endsWith(process.filename)) {
      return true;
    }

    for (const script in scriptsToDistribute) {
      if (process.filename.endsWith(script)) return true;
    }
  }
  return false;
}

async function smartDistribution(ns) {
  const allServers = importServersData(ns);
  if (allServers == null) {
    printError(ns, "Failed to find any servers");
    return;
  }

  // Distribute scripts and return list of the servers.
  // Arrange by max RAM. Home should be first(?)
  const attackingServers = handleAttackingServers(ns, allServers);

  let maxHackingLevel = ns.getHackingLevel();
  if (maxHackingLevel > 1) maxHackingLevel /= 2;

  // Servers that can be hacked
  const targetServers = allServers
    .filter(
      (s) =>
        s.maxMoney > 0 &&
        canHackServer3(ns, s.numOpenPortsRequired, s.requiredHackingLevel),
    )
    .filter((s) => s.requiredHackingLevel < maxHackingLevel)
    .sort((a, b) => b.maxMoney - a.maxMoney);

  const infoDescription = `Total Machines: ${allServers.length}. Targets: ${targetServers.length}. Attacking: ${attackingServers.length}`;
  print(ns, infoDescription);

  const attackingNames = attackingServers.map((s) => s.name);
  const targetNames = targetServers.map((s) => s.name);

  ns.run(
    controllerScript,
    { threads: 1 },
    JSON.stringify(attackingNames),
    JSON.stringify(targetNames),
  );
  return;
}

//#endregion Main

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
  const defaultOptions = ["-h", "--help", "--tail"];
  let servers = data.servers;

  return [...defaultOptions, ...servers];
}

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([
    ["help", false],
    ["h", false],
  ]);
  if (args.help || args.h) {
    ns.tprint(`Usage: run ${ns.getScriptName()}`);
    ns.tprint("");
    ns.tprint("Distribute Batch");
    ns.tprint("=====================");
    ns.tprint("");
    ns.tprint(
      "Distribute the grow...hack...weaken scripts to distribution servers.",
    );
    ns.tprint("Calls the controller script to activate the attack.");
    return;
  }

  // TODO: Kill the current script if it is already running

  ns.disableLog("scp");

  if (isHomeRunningScripts(ns)) {
    print(ns, `Controller script is already running. Quit`);
    return;
  }

  await smartDistribution(ns);
}
