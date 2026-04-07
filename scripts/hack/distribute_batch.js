import { getAttackingServers, getTargetServers } from "/hack/utils.js";
import { Color, printError, printLogError } from "/utils/print.js";
import { importServersData } from "/utils/servers.js";

/* Scripts  */
const scriptsToDistribute = [
  "target_weaken.js",
  "target_grow.js",
  "target_hack.js",
];

const controllerScript = "/hack/controller_batch.js";

//#region Distribution

/**
 * Get servers that can run scripts and distribute the scripts to them.
 *
 * @param {NS} ns
 * @param {Array<MyServer>} allServers - list of all servers in the game
 * @returns {Array<MyServer>} servers that can run scripts, sorted by max RAM (secondary cpu cores), descending.
 */
function handleAttackingServers(ns, allServers) {
  const attackingServers = getAttackingServers(allServers);

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

//#region Display

function displayWaitingScripts(ns, runningScripts, scriptCount, attempts) {
  const c = Color;
  const frameWidth = 50;
  const sep = `${c.FgCyan}╔${"═".repeat(frameWidth)}╗${c.Reset}`;
  const bot = `${c.FgCyan}╚${"═".repeat(frameWidth)}╝${c.Reset}`;
  const ln = `${c.FgCyan}╟${c.Dim}${"─".repeat(frameWidth)}${c.Reset}${c.FgCyan}╢${c.Reset}`;
  const w = `${c.FgCyan}║${c.Reset}`;

  ns.clearLog();
  runningScripts.forEach((process) => {
    ns.print(
      `  ${c.Dim}PID${c.Reset} ${c.FgCyanBright}${process.pid}${c.Reset}  ${c.FgMagenta}${process.filename}${c.Reset}  ${c.Dim}${process.args}${c.Reset}`,
    );
  });
  ns.print("");
  ns.print(sep);
  const attColor =
    attempts <= 3
      ? c.FgRedBright
      : attempts <= 7
        ? c.FgYellowBright
        : c.FgGreenBright;
  ns.print(
    `${w}  ${c.Bold}${c.FgYellowBright}⏳ WAITING FOR SCRIPTS TO FINISH${c.Reset}`,
  );
  ns.print(ln);
  ns.print(
    `${w}  ${c.FgWhite}Scripts running${c.Reset}  ${c.FgCyanBright}${scriptCount}${c.Reset}        ${c.FgWhite}Attempts left${c.Reset}  ${attColor}${attempts}${c.Reset}`,
  );
  ns.print(bot);
}

//#endregion Display

//#region Main

/**
 * Checks if the controller script is running.
 *
 * @param {NS} ns
 * @param {Array} processes - list of processes to check against
 * @param {boolean} toKill - if true, kills the controller script if it is running.
 *    Otherwise just checks if it is running.
 * @return {boolean} true if the controller script is running
 *  (after killing if @param toKill is true), false otherwise.
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
    ns.ui.closeTail();
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

    displayWaitingScripts(ns, runningScripts, runningScripts.length, attempts);
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

async function smartDistribution(ns, useFormulas) {
  const allServers = importServersData(ns);

  // Distribute scripts and return list of the servers.
  // Arrange by max RAM. Home should be first (?)
  const attackingServers = handleAttackingServers(ns, allServers);

  const targetServers = getTargetServers(ns, allServers);

  const distributionSummary = `Total Machines: ${allServers.length}. Targets: ${targetServers.length}. Attacking: ${attackingServers.length}`;
  ns.tprint(distributionSummary);

  // TODO: targets / attackers should be dynamic - and chosen by the controller script?
  const attackingNames = attackingServers.map((s) => s.name);
  const targetNames = targetServers.map((s) => s.name);

  ns.tprint(`Starting attack with${useFormulas ? "" : "out"} Formulas.exe.`);
  let additionalArguments = [];
  if (useFormulas) {
    additionalArguments.push("--use-formulas");
  }

  const result = ns.run(
    controllerScript,
    { threads: 1 },
    JSON.stringify(attackingNames),
    JSON.stringify(targetNames),
    ...additionalArguments,
  );
  return result;
}

//#endregion Main

function usage(ns) {
  ns.tprint(`Usage: run ${ns.getScriptName()}`);
  ns.tprint("");
  ns.tprint("Distribute Batch");
  ns.tprint("=====================");
  ns.tprint("");
  ns.tprint(
    "Distribute the grow...hack...weaken scripts to distribution servers.",
  );
  ns.tprint("Calls the controller script to activate the attack.");
  ns.tprint("");
  ns.tprint("Options:");
  ns.tprint(
    "  -k, --kill          Kill running controller/attack scripts before starting.",
  );
  ns.tprint(
    "  --no-formulas       Run without Formulas.exe even if available.",
  );
}

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
  const defaultOptions = ["-h", "--help", "--tail"];
  const additionalOptions = ["-k", "--kill", "--no-formulas"];

  return [...defaultOptions, ...additionalOptions];
}

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([
    ["help", false],
    ["h", false],
    ["k", false],
    ["kill", false],
    ["no-formulas", false],
  ]);
  if (args.help || args.h) {
    usage(ns);
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

  const useFormulas =
    !args["no-formulas"] && ns.fileExists("Formulas.exe", "home");
  const result = await smartDistribution(ns, useFormulas);
  if (result) {
    ns.ui.closeTail();
  }
}
