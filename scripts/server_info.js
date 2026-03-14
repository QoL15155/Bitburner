import { printError } from "/utils/print";
import { doConversion, formatTime, formatMoney } from "utils/formatters";

export async function collectServerInfo(
  ns,
  targetName,
  showServerObject,
  showPlayerInformation,
) {
  if (!ns.serverExists(targetName)) {
    ns.tprint(`Server was not found: '${targetName}'`);
    return;
  }
  const serverHome = ns.getServer("home");
  const targetObject = ns.getServer(targetName);

  const maxMoney = targetObject.moneyMax;
  const moneyAvailable = targetObject.moneyAvailable;

  let moneyObject = {
    maximum: formatMoney(maxMoney),
    available: formatMoney(moneyAvailable.toFixed(3)),
  };
  let growthObject = {
    // This growth parameter is a number typically between 0 and 100 that represents how quickly the server's money grows.
    // A higher growth parameter will result in a higher percentage increase from grow.
    growth: targetObject.serverGrowth,
  };

  if (maxMoney > 0) {
    const moneyPercent = (moneyAvailable / maxMoney) * 100;
    const moneyMultiplier = maxMoney / Math.max(moneyAvailable, 1);
    // moneyPercent: moneyPercent.toFixed(2) + "%",
    moneyObject["moneyPercent"] = moneyPercent + "%";
    moneyObject["moneyMultiplier"] = doConversion(moneyMultiplier.toFixed(2));

    const growThreads = ns.growthAnalyze(
      targetName,
      moneyMultiplier,
      serverHome.cpuCores,
    );
    growthObject["growThreads"] = growThreads;
    if (ns.fileExists("Formulas.exe", "home")) {
      const player = ns.getPlayer();
      const growThreadsFormula = ns.formulas.hacking.growThreads(
        targetObject,
        player,
        maxMoney,
        serverHome.cpuCores,
      );
      growthObject["growThreadFormula"] = growThreadsFormula;
      const growSecurityIncreaseFormula = ns.growthAnalyzeSecurity(
        growThreadsFormula,
        targetName,
        serverHome.cpuCores,
      );
      growthObject["growSecurityIncreaseFormula"] = growSecurityIncreaseFormula;
    }
    const growSecurityIncrease = ns.growthAnalyzeSecurity(
      growThreads,
      targetName,
      serverHome.cpuCores,
    );
    growthObject["growSecurityIncrease"] = growSecurityIncrease;
  }

  let hackObject = {
    // Security increase due to hack
    // hackSecurityIncrease: ns.hackAnalyzeSecurity(threads, targetName),
    hackThreads: ns.hackAnalyzeThreads(targetName, maxMoney),

    // weak()
    // lowers the security level of the target server by 0.05 per thread, and only in unusual situations does it do less.
    // weakenAnalyze : Predict the effect of weaken() on the target server. Returns the amount that the security level will be reduced by when weaken() is called with the specified number of threads.
    // weakenSecurityDecrease: ns.weakenAnalyzeThreads(threads, cores),
  };

  const security = {
    // Base difficulty: Server's difficulty level at creation
    base: targetObject.baseDifficulty, // ns.getServerBaseSecurityLevel(targetName),
    minimum: targetObject.minDifficulty, // ns.getServerMinSecurityLevel(targetName),
    current: targetObject.hackDifficulty, // ns.getServerSecurityLevel(targetName),
  };

  const scriptExecutionsTimes = {
    hackTime: ns.getHackTime(targetName),
    growTime: ns.getGrowTime(targetName),
    weakenTime: ns.getWeakenTime(targetName),
  };

  const serverInfo = {
    hostname: targetName,
    homeCores: targetObject.cpuCores,

    money: moneyObject,
    grow: growthObject,
    securityLevel: security,

    executionTimes: {
      hackTime: formatTime(scriptExecutionsTimes.hackTime),
      growTime: formatTime(scriptExecutionsTimes.growTime),
      weakenTime: formatTime(scriptExecutionsTimes.weakenTime),
    },
  };

  if (showServerObject) {
    ns.tprint(JSON.stringify(targetObject, null, 2));
  }

  if (showPlayerInformation) {
    const playerObject = {
      homeServerCores: serverHome.cpuCores,
      multipliers: ns.getHackingMultipliers(),
    };
    ns.tprint("Player:");
    ns.tprint(JSON.stringify(playerObject, null, 2));
  }

  ns.tprint(JSON.stringify(serverInfo, null, 2));

  const formulaGrow = serverInfo.grow.growThreadFormula;
  if (formulaGrow) {
    const growThreads = serverInfo.grow.growThreads;
    if (
      Math.ceil(growThreads) != formulaGrow &&
      Math.floor(growThreads) != formulaGrow
    ) {
      printError(
        ns,
        `Grow threads mismatch for ${targetName}. Expected: ${growThreads}, Actual: ${formulaGrow}`,
      );
    }
  }
  return;
}

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
  const helpOptions = ["-h", "--help"];
  if (args.some((a) => helpOptions.includes(a))) {
    return [];
  }
  const defaultOptions = helpOptions.concat("--tail");
  const serverOptions = ["--server", "--player", "--all", "-a"];

  let servers = data.servers;

  if (args.some((a) => servers.includes(a))) {
    servers = [];
  }

  return [...defaultOptions, ...serverOptions, ...servers];
}

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([
    ["help", false],
    ["h", false],
    ["server", false],
    ["player", false],
    ["all", false],
    ["a", false],
  ]);
  const targetServer = args._[0];
  if (args.help || args.h || !targetServer) {
    ns.tprint(`Usage: run ${ns.getScriptName()} TARGET_SERVER [OPTIONS]`);
    ns.tprint("");
    ns.tprint("Hacks the target server for money.");
    ns.tprint("");
    ns.tprint("Options:");
    ns.tprint("  --server: Show server object information");
    ns.tprint("  --player: Show player information");
    ns.tprint(
      "  --all, -a: Show both server object information and player multipliers",
    );
    return;
  }

  if (args.all || args.a) {
    args.server = true;
    args.player = true;
  }

  await collectServerInfo(ns, targetServer, args.server, args.player);
}
