import {
  printError,
  printWarn,
  printInfo,
  printLogInfo,
  print,
} from "/utils/print.js";
import { formatMoney } from "/utils/formatters.js";
import { importServersData } from "/utils/servers.js";

/* Scripts  */
const scriptsToDistribute = [
  "target_weaken.js",
  "target_grow.js",
  "target_hack.js",
];

// Requires Formulas
const controllerScript = "/hack/controller_batch.js";

/* Utils */

function wasServerHacked(server) {
  return server.hasAdminRights || server.backdoorInstalled;
}

//#region Distribution

/**
 * Get servers that can run scripts and distribute the scripts to them.
 *
 * @param {NS} ns
 * @param {Array} allServers - list of all servers in the game
 * @returns {Array} servers that can run scripts, sorted by max RAM (secondary cpu cores), descending.
 */
function handleAttackingServers(ns, allServers) {
  const attackingServers = allServers.filter((server) => {
    return (
      server.maxRam > 0 && (server.purchasedByPlayer || wasServerHacked(server))
    );
  });

  attackingServers.forEach((server) =>
    distributeScriptsToServer(ns, server.name),
  );

  return attackingServers.sort((a, b) => {
    if (getMaxRam(b) === getMaxRam(a)) {
      return b.cpuCores - a.cpuCores;
    }
    return getMaxRam(b) - getMaxRam(a);
  });

  function getMaxRam(server) {
    return server.name === "home" ? Infinity : server.maxRam;
  }
}

/**
 * Distribute scripts to a server.
 * Kills all scripts on the server before distributing.
 */
function distributeScriptsToServer(ns, serverName) {
  // NOTE: In home server we don't want to kill all the scripts, nor can we kill specific scripts without
  // knowing either their arguments of PID. So we just skip killing any scripts on home.
  if (serverName === "home") return;

  // FIXME: Do we really want to kill ALL scripts?
  ns.killall(serverName);
  scriptsToDistribute.forEach((script) => {
    ns.scp(script, serverName);
  });
}

//#endregion Distribution

//#region Main

/**
 * Checks if the controller script or any of the distribution scripts are running on 'home'
 *
 * Note that we only check against 'home' server.
 *
 * @param {NS} ns
 * @returns {boolean} true if any of the scripts to distribute is running on 'home'
 */
async function checkHomeRunningScripts(ns) {
  const processes = ns.ps();

  // Check if controller script is running on home
  const isControllerRunning = processes.some((process) => {
    return controllerScript.endsWith(process.filename);
  });
  if (isControllerRunning) {
    ns.tprint("Controller script is already running on home.");
    return true;
  }

  let attempts = 20;
  while (attempts > 0) {
    const isAttackingScriptRunning = processes.some((process) => {
      return scriptsToDistribute.includes(process.filename);
    });

    if (!isAttackingScriptRunning) return false;

    ns.tprint(
      `Attacking scripts are running on home. Waiting for the to finish... Attempts left: ${attempts}`,
    );
    await ns.sleep(1000);
    attempts--;
  }

  // Scripts are still running after waiting.
  return true;
}

async function smartDistribution(ns) {
  const allServers = importServersData(ns);

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
        wasServerHacked(s) &&
        s.requiredHackingLevel < maxHackingLevel,
    )
    .sort((a, b) => b.maxMoney - a.maxMoney);

  const infoDescription = `Total Machines: ${allServers.length}. Targets: ${targetServers.length}. Attacking: ${attackingServers.length}`;
  print(ns, infoDescription);

  // TODO: targets / attackers should be dynamic - and chosen by the controller script?
  const attackingNames = attackingServers.map((s) => s.name);
  const targetNames = targetServers.map((s) => s.name);

  let useFormulas = false;
  // if (ns.fileExists("Formulas.exe", "home")) {
  //   useFormulas = true;
  // }
  ns.tprint(`Starting attack with${useFormulas ? "" : "out"} Formulas.exe.`);

  ns.run(
    controllerScript,
    { threads: 1 },
    JSON.stringify(attackingNames),
    JSON.stringify(targetNames),
    useFormulas,
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

  ns.disableLog("scp");

  if (await checkHomeRunningScripts(ns)) {
    // TODO: Kill the current script if it is already running?
    return;
  }

  await smartDistribution(ns);
}
