import {
  printError,
  printLogError,
  printWarn,
  printInfo,
  printLogInfo,
  print,
  Color,
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
 * Checks if the controller script is running.
 *
 * @param {NS} ns
 * @param {Array} processes - list of processes to check against
 * @param {boolean} toKill - if true, kills the controller script if it is running.
 *    Otherwise just checks if it is running.
 * @return {boolean} true if the controller script is running (after killing if toKill is true),
 * false otherwise.
 */
function isControllerScriptRunning(ns, processes, toKill = false) {
  const isRunning = processes.some((process) => {
    return isScriptRunning(process);
  });

  return isRunning;

  function isScriptRunning(process) {
    if (!controllerScript.endsWith(process.filename)) return false;

    if (!toKill) return true;

    ns.tprint(`Killing running controller script: ${process.filename}`);
    const killed = ns.kill(process.pid);
    if (!killed) {
      printError(
        ns,
        `Failed to kill controller script with PID: ${process.pid}`,
      );
      return true;
    }

    // process no longer running
    return false;
  }
}

/**
 * Checks if the controller script or any of the attacking scripts are running on 'home'.
 *
 * When attacking scripts are running, waits for them to finish.
 * If they don't finish after a certain number of attempts, kills them (if killScripts is true).
 *
 * If killScripts is true, kills the controller script and any distribution scripts running on 'home'.
 *
 * Note that we only check distribution scripts against 'home' server.
 *
 * @param {NS} ns
 * @param {boolean} killScripts - if true, kills the controller script and any distribution scripts running on 'home'.
 *  In any case, waits for any distribution scripts to finish before killing/returning.
 * @returns {boolean} true if the controller or any of the scripts to distribute are running on 'home'
 */
async function checkHomeRunningScripts(ns, killScripts = false) {
  let processes = ns.ps();

  // Check if controller script is running on home
  const isControllerRunning = isControllerScriptRunning(
    ns,
    processes,
    killScripts,
  );
  if (isControllerRunning) {
    ns.tprint("Controller script is already running on home.");
    return true;
  }

  let attempts = 15;
  while (attempts > 0) {
    const runningScripts = ns.ps().filter((process) => {
      return scriptsToDistribute.includes(process.filename);
    });

    if (runningScripts.length === 0) {
      return false;
    }

    const len = runningScripts.length;

    ns.clearLog();
    runningScripts.forEach((process) => {
      ns.print(`- (${process.pid}) ${process.filename} - ${process.args}`);
    });
    ns.print(" ");
    ns.print(
      "Attacking scripts are running on home. Waiting for them to finish...",
    );

    ns.print(
      `${Color.FgBlueBright}Scripts running${Color.Reset}: ${len}, ${Color.FgBlueBright}Attempts left${Color.Reset}: ${attempts}`,
    );
    ns.print("");
    await ns.sleep(1000);
    attempts--;
  }

  if (!killScripts) {
    // Scripts are still running after waiting
    return true;
  }

  ns.tprint("Killing remaining attacking scripts on home.");
  scriptsToDistribute.forEach((script) => {
    ns.scriptKill(script, "home");
  });

  const runningScripts = ns.ps().filter((process) => {
    return scriptsToDistribute.includes(process.filename);
  });
  if (runningScripts.length == 0) {
    return false;
  }

  printError(ns, `Failed to kill attacking scripts`);
  printLogError(
    ns,
    runningScripts.map((p) => `${p.pid}: ${p.filename} - ${p.args}`).join("\n"),
  );
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
  if (ns.fileExists("Formulas.exe", "home")) {
    useFormulas = true;
  }
  ns.tprint(`Starting attack with${useFormulas ? "" : "out"} Formulas.exe.`);

  const result = ns.run(
    controllerScript,
    { threads: 1 },
    JSON.stringify(attackingNames),
    JSON.stringify(targetNames),
    useFormulas,
  );
  return result;
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
    ["k", false],
    ["kill", false],
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

  ns.disableLog("disableLog");
  ns.disableLog("scp");
  ns.disableLog("sleep");
  ns.disableLog("ps");
  ns.disableLog("kill");

  ns.ui.openTail();
  ns.ui.resizeTail(800, 500);
  ns.ui.setTailTitle("Batch Attack - Distribution");

  const killRunningScripts = args.kill || args.k;
  if (await checkHomeRunningScripts(ns, killRunningScripts)) {
    return;
  }

  const result = await smartDistribution(ns);
  if (result) {
    ns.ui.closeTail();
  }
}
