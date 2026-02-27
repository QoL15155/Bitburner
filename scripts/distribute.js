import { getRootAccess, listServers } from "./utils.js"
import { getMoneyServer } from "./money_info.js"
import { printError, printInfo, formatMoney } from "./utils_print.js"

// Script names to distribute to servers.
// TODO: validate scripts' RAM
// printError(ns, `[${fname}] Memory required for the script has changed! ${progData.maxMemoryForScript} GB`);
const scriptsToDistribute = {
  "hack": { ram: 1.70, scriptName: "do_hack.js" },
  "weaken": { ram: 1.75, scriptName: "do_weaken.js" },
  "grow": { ram: 1.75, scriptName: "do_grow.js" }
};
const maxScriptRam = 1.75;

function printUsage(ns) {
  ns.tprint(`Usage: run ${ns.getScriptName()} [TARGET_SERVER]`);
  ns.tprint("");
  ns.tprint("This script will attack server for money.");
  ns.tprint("Invocation will kill all previous running of the scripts");
  ns.tprint("");
  ns.tprint("Arguments");
  ns.tprint("==========");
  ns.tprint("\tTARGET_SERVER : specify target server for the script. If not specified, the script will try to find the best target server for money farming.");
  ns.tprint("\t--free_memory : amount of free memory (GB) to leave on home server.");
  ns.tprint("\t--help : show this help message");
  ns.tprint("");
  ns.tprint("Example:");
  ns.tprint(`> run ${ns.getScriptName()} n00dles --limit 25`);
}

function disableLogs(ns) {
  ns.disableLog("getHackingLevel");
  ns.disableLog("getServerRequiredHackingLevel");
  ns.disableLog("getServerNumPortsRequired");
  ns.disableLog("getServerMaxRam");
  ns.disableLog("getServerUsedRam");
  ns.disableLog("scp");
  ns.disableLog("nuke");
  ns.disableLog("brutessh");
  ns.disableLog("ftpcrack");
  ns.disableLog("relaysmtp");
  ns.disableLog("httpworm");
  ns.disableLog("sqlinject");
  // ns.disableLog("enableLog");
}

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
  const helpOptions = ["-h", "--help"];
  const defaultOptions = helpOptions.concat("--tail");
  if (args.some(a => helpOptions.includes(a))) {
    return [];
  }
  const memoryLimitOptions = ["--free_memory"];
  let servers = data.servers;

  if (args.length > 1 && args.some(a => servers.includes(a))) {
    servers = [];
  }

  return [...defaultOptions, ...memoryLimitOptions, ...servers];
}

/** @param {NS} ns */
export async function main(ns) {
  const fname = "Distribute";

  const args = ns.flags(
    [['help', false], ['h', false],
    ['free_memory', 0],
    ]);
  if (args.help || args.h) {
    printUsage(ns);
    return;
  }

  disableLogs(ns);

  const serverList = listServers(ns);
  const myServers = ns.getPurchasedServers();

  let targetServerName = args._[0];
  if (!targetServerName) {
    targetServerName = getMoneyServer(ns, serverList, false);
  }

  // Amount of free memory to leave at home server.
  const memoryFree = args.free_memory;

  const targetServer = {
    name: targetServerName,
    maxMoney: ns.getServerMaxMoney(targetServerName),
    minSecurity: ns.getServerMinSecurityLevel(targetServerName)
  }
  printInfo(ns, `[${fname}] Target: ${targetServerName}(Max Money: ${formatMoney(targetServer.maxMoney)}, Min Security: ${targetServer.minSecurity}). Servers: ${serverList.length}`);

  // Maps of server and number of threads
  const distributedServers = findServersToDistribute(serverList);

  printInfo(ns, `[${fname}] Distributed scripts to ${Object.keys(distributedServers).length}/${serverList.length} hosts`);

  // Home - calculate number of threads
  const threads = distributeScriptsToServer("home");
  if (threads == 0) {
    ns.tprint(`[${fname}] Not enough memory to run script on home. Max Ram: ${ns.getServerMaxRam("home")}, Used RAM: ${ns.getServerUsedRam("home")}`);
  } else {
    distributedServers["home"] = threads;
  }

  runScriptsOnServers(distributedServers);

  /** Prints message both to stdout and log file */
  function print(msg) {
    ns.printf(msg);
    ns.tprint(msg);
  }

  function calculateScriptThreads(serverName, maxRamForScript = maxScriptRam) {
    const serverMaxRam = ns.getServerMaxRam(serverName)
    if (serverMaxRam == 0) {
      // not enough memory
      ns.printf(`[${fname}] has 0 RAM`);
      return 0;
    }
    const ramUsed = ns.getServerUsedRam(serverName);
    let ramDiff = serverMaxRam - ramUsed;
    if (serverName == "home" && memoryFree > 0) {
      ramDiff -= (memoryFree - ns.getScriptRam(ns.getScriptName()));
    }
    if (ramDiff < maxRamForScript) {
      ns.printf(`[${fname}] Memory is full. Max Ram: ${serverMaxRam}, Used RAM: ${ramUsed}`);
      return 0;
    }


    const threads = Math.floor(ramDiff / maxRamForScript);
    ns.printf(`[${fname}] Max Ram: ${serverMaxRam}, Used RAM: ${ramUsed}, Available threads: ${threads}`);
    return threads;
  }

  //#region Run scripts


  function runScriptsOnServers(serverList) {
    const fname = "runScriptsOnServers";

    // Sort the server list by number of threads in ascending order
    const sortedServers = Object.entries(serverList).sort((a, b) => a[1] - b[1]);
    serverList = {};
    sortedServers.forEach(([server, threads]) => {
      serverList[server] = threads;
    });

    let totalThreads = sortedServers.reduce((sum, [_, threads]) => sum + threads, 0);
    printInfo(ns, `[${fname}] Running scripts on ${Object.keys(serverList).length} servers. Total threads: ${totalThreads}`);

    ns.print(sortedServers);

    const scriptThreads = distributionAlgorithm(ns, totalThreads);

    for (let serverInfo of Object.entries(serverList)) {

      // First run grow threads on server
      if (scriptThreads.growThreads > 0) {
        let threadsRun = runScriptOnServer(serverInfo, scriptsToDistribute["grow"].scriptName, scriptThreads.growThreads);
        scriptThreads.growThreads -= threadsRun;
        if (serverInfo[1] == 0) {
          // Skip if we used all available threads on the server
          continue;
        }
      }

      if (scriptThreads.weakenThreads > 0) {
        let threadsRun = runScriptOnServer(serverInfo, scriptsToDistribute["weaken"].scriptName, scriptThreads.weakenThreads);
        scriptThreads.weakenThreads -= threadsRun;
        if (serverInfo[1] == 0) {
          // Skip if we used all available threads on the server
          continue;
        }
      }

      if (scriptThreads.hackThreads > 0) {
        let scriptName = scriptsToDistribute["hack"].scriptName;
        serverInfo[1] = calculateScriptThreads(serverInfo[0], ns.getScriptRam(scriptName));
        if (serverInfo[1] != scriptThreads.hackThreads) {
          ns.tprint(`[${fname}] Available threads on ${serverInfo[0]} for hack script is different than expected. Available: ${serverInfo[1]}, Expected: ${scriptThreads.hackThreads}.`);
        }
        let threadsRun = runScriptOnServer(serverInfo, scriptName, serverInfo[1]);
        scriptThreads.hackThreads -= threadsRun;
        if (serverInfo[1] == 0) {
          // Skip if we used all available threads on the server
          continue;
        }
      }

      ns.alert(`[${fname}] Not all threads were used on ${serverInfo[0]}. Remaining threads: ${serverInfo[1]}. This should not happen!`);
    }
  }


  function runScriptOnServer(serverData, scriptName, maxThreads) {
    const fname = "runScriptOnServer";

    if (maxThreads == 0) {
      return 0;
    }

    const serverName = serverData[0];
    const serverThreads = serverData[1];

    if (serverThreads == 0) {
      ns.alert(`[${fname}] No available threads on ${serverName} to run the script.`);
      return 0;
    }

    const threads = Math.min(serverThreads, maxThreads);
    const ppid = ns.exec(scriptName, serverName, threads, targetServerName);
    if (ppid) {
      ns.printf(`[${fname}] PID: ${ppid}`);
    } else {
      ns.alert(`[${fname}] Failed to execute script on ${serverName}.`);
      printError(ns, `[${fname}] Failed to execute script on ${serverName}.`);
      return 0;
    }

    serverData[1] -= threads;

    return threads;
  }

  /**  
   * Script distribution algorithm 1:
   * 
   * Gets the total amounts of threads that can be run, and
   * calculates the number of threads for each script based on predefined percentages.
   * 
   * @param { NS } ns - the NS object provided by Bitburner 
   * @param { number } totalThreads - total number of threads that can be run across all servers
   * @returns { Object } Object with number of threads for each script type(hack, weaken, grow)
  */
  function distributionAlgorithm(ns, totalThreads) {
    const fname = "distributionAlgorithm1";

    // For now lets do a stupid algorithm
    const percentageHackingThreads = 0.01;
    const percentageWeakenThreads = 0.05;
    const percentageGrowThreads = 0.94;

    let hackThreads = Math.floor(totalThreads * percentageHackingThreads);
    let weakenThreads = Math.floor(totalThreads * percentageWeakenThreads);
    let growThreads = Math.floor(totalThreads * percentageGrowThreads);

    // Make sure we calculated right
    const calculatedTotalThreads = hackThreads + weakenThreads + growThreads;
    if (calculatedTotalThreads == totalThreads) {
      return returnThreads();
    }

    if (calculatedTotalThreads < totalThreads) {
      ns.tprint(`[${fname}] Threads calculation is rounded down off by ${totalThreads - calculatedTotalThreads} threads. Adding missing threads to hack threads.`);
      hackThreads += totalThreads - calculatedTotalThreads;
      return returnThreads();
    }

    ns.tprint(`[${fname}] Threads calculation is rounded up off by ${totalThreads - calculatedTotalThreads} threads! Removing missing threads to hack threads.`);
    hackThreads -= calculatedTotalThreads - totalThreads;
    return returnThreads();
    function returnThreads() {
      ns.tprint(`[${fname}] Total threads: ${totalThreads}. Hack: ${hackThreads}, Weaken: ${weakenThreads}, Grow: ${growThreads}`);
      return { hackThreads: hackThreads, weakenThreads: weakenThreads, growThreads: growThreads };
    }
  }

  //#endregion Run scripts


  //#region Distribute

  /** 
   * Finds servers to distribute scripts to and distributes them.
   * 
   * @param {NS} ns
   * @param {string[]} serverList - list of servers to distribute scripts to
   * @returns {Object} Map of server name and number of threads that can be run on the server. 
   *  (for script with max ram)
   */
  function findServersToDistribute(serverList) {
    const fname = "findServersToDistribute";

    let validServers = {};

    for (const serverName of serverList) {
      ns.printf("=> [%s] Server: %s", fname, serverName);

      const runnableThreads = distributeScriptsToServer(serverName);
      if (runnableThreads == 0) {
        // Failed to distribute script to the server. Skip it.
        continue;
      }
      ns.printf(`[${fname}] Distributed scripts to ${serverName}. Max runnable threads: ${runnableThreads}`);
      validServers[serverName] = runnableThreads;
    }

    return validServers;
  }

  /** 
   * Tries to distributes scripts to server.
   * 
   * @returns {number} Number of threads that can be run on the server after distribution.
   *  if 0 is returned, it means that the script cannot be run on the server 
   * (either not enough RAM or server cannot be hacked).
   */
  function distributeScriptsToServer(serverName) {
    const fname = "distributeScriptsToServer";

    if (!canRunScriptOnServer(serverName)) {
      return 0;
    }

    if (serverName != "home") {
      ns.killall(serverName);
    } else {
      // Home - don't kill other running scripts.
      Object.values(scriptsToDistribute).forEach(script => {
        ns.scriptKill(script.scriptName, serverName);
      });
    }

    // Calculate number of threads
    const threads = calculateScriptThreads(serverName);
    if (threads == 0) {
      return 0;
    }

    if (serverName == "home") {
      // Don't copy scripts to home, just run them
      return threads;
    }

    // Copy scripts to server
    Object.values(scriptsToDistribute).forEach(script => {
      if (!ns.scp(script.scriptName, serverName)) {
        ns.printf(`[${fname}] Failed to distribute scripts to server ${script.scriptName} -> ${serverName}`);
      }
    });

    return threads;
  }

  function canRunScriptOnServer(serverName) {
    const fname = "canRunScriptOnServer";

    if (!isMyServer(serverName) && !getRootAccess(ns, serverName)) {
      ns.printf(`[${fname}] Failed to get root access to ${serverName}`);
      return false;
    }

    ns.printf(`[${fname}] Server ${serverName}: OK`);
    return true;

    function isMyServer() {
      if (serverName == "home" ||
        myServers.indexOf(serverName) != -1) {
        return true;
      }
      return false;
    }
  }
}

//#endregion Distribute