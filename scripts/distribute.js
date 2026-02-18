import { hack_server, list_servers } from "./utils.js"
import { get_money_server_2 } from "./money_info.js"

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
  const defaultOptions = ["-h", "--help", "--tail"];
  let servers = data.servers;
  let killOptions = ["--kill_script", "-k", "--kill_all"];

  if (args.some(a => servers.includes(a))) {
    servers = [];
  }

  return [...defaultOptions, ...killOptions, ...servers];
}

/** @param {NS} ns */
export async function main(ns) {
  const scriptName = "get_money_simple.js";
  const fname = "Distribute";

  const args = ns.flags([['help', false], ['h', false],
  ['kill_script', false], ['k', false], ['kill_all', false],
  ]);
  if (args.help || args.h) {
    ns.tprint(`Usage: run ${ns.getScriptName()} [TARGET_SERVER] [[--kill_script, -k] | [--kill_all]]`);
    ns.tprint("");
    ns.tprint("This script will attack server for money.");
    ns.tprint("");
    ns.tprint("Arguments");
    ns.tprint("==========");
    ns.tprint("\t--help : show this help message");
    ns.tprint("\t--kill_script, -k : kill previous runs of the script on the server before starting new one");
    ns.tprint("\t--kill_all : kill all scripts on the server before starting new one");
    ns.tprint("\tTARGET_SERVER : specify target server for the script. If not specified, the script will try to find the best target server for money farming.");
    ns.tprint("");
    ns.tprint("Example:");
    ns.tprint(`> run ${ns.getScriptName()} n00dles --kill_all`);
    return;
  }

  ns.disableLog("getHackingLevel");
  ns.disableLog("getServerRequiredHackingLevel");
  ns.disableLog("getServerNumPortsRequired");
  ns.disableLog("getServerMaxRam");
  ns.disableLog("getServerUsedRam");
  ns.disableLog("brutessh");
  ns.disableLog("ftpcrack");
  ns.disableLog("nuke");

  const progData = {
    killCurrentScript: args.kill_script || args.k,
    killAllScripts: args.kill_all,

    // Script Information
    scriptName: scriptName,
    scriptMemory: ns.getScriptRam(scriptName),
  };

  if (progData.scriptMemory == 0) {
    ns.tprint(`[${fname}] Failed to read script RAM. ${scriptName}`);
    return;
  }
  ns.printf(`[${fname}] Memory script requires: ${progData.scriptMemory}`);

  const serverList = list_servers(ns);
  const myServers = ns.getPurchasedServers();

  let targetServerName = args._[0];
  if (!targetServerName) {
    targetServerName = get_money_server_2(ns, serverList);
  }

  const targetServer = {
    name: targetServerName,
    maxMoney: ns.getServerMaxMoney(targetServerName),
    minSecurity: ns.getServerMinSecurityLevel(targetServerName)
  }
  print(`[${fname}] Target: ${targetServerName}(Max Money: $${targetServer.maxMoney}, Min Security: ${targetServer.minSecurity}). Servers: ${serverList.length}`);

  // Find total cost
  // Count the number of hacked hosts
  let validServers = {};
  for (const serverName of serverList) {
    ns.printf("=> [%s] Server: %s", fname, serverName);
    let serverFreeRam = distributeScriptsToServer(serverName);
    if (serverFreeRam == 0) {
      // Failed to distribute script to the server. Skip it.
      continue;
    }
    ns.tprint(`[${fname}] Successfully distributed scripts to ${serverName}. Free RAM: ${serverFreeRam}`);
    validServers[serverName] = serverFreeRam;
    // serverList.forEach(distributeToServer);
  }


  //  "0.15GB"

  // Hacked hosts: 44
  print(`[${fname}] Distributed ${scriptName} to ${distributedHosts} hosts`);

  ns.tprint(`[${fname}] Running script at 'home'.`);
  distributeScripts("home");

  /** Prints message both to stdout and log file */
  function print(msg) {
    ns.printf(msg);
    ns.tprint(msg);
  }

  function isMyServer(serverName) {
    if (serverName == "home" ||
      myServers.indexOf(serverName) != -1) {
      return true;
    }
    return false;
  }

  function calculateScriptThreads(serverName) {
    const serverMaxRam = ns.getServerMaxRam(serverName)
    if (serverMaxRam == 0) {
      // not enough memory
      ns.printf(`[${fname}] has 0 RAM`);
      return 0;
    }
    const ramUsed = ns.getServerUsedRam(serverName);
    const ramDiff = serverMaxRam - ramUsed;
    if (ramDiff < progData.scriptMemory) {
      ns.printf(`[${fname}] Memory is full.Max Ram: ${serverMaxRam}, Used RAM: ${ramUsed}`);
      return 0;
    }
    const threads = Math.floor(ramDiff / progData.scriptMemory);
    ns.printf(`[${fname}] Max Ram: ${serverMaxRam}, Used RAM: ${ramUsed}, Threads: ${threads}`);
    return threads;
  }

  function distributeScripts(serverName) {
    const fname = "distributeScript";


    // Copy script and run it 
    ns.scp(scriptName, serverName);
    const ppid = ns.exec(scriptName, serverName, threads, targetServer.name, targetServer.maxMoney, targetServer.minSecurity);
    if (ppid) {
      ns.printf(`[${fname}] PID: ${ppid}`);
    } else {
      ns.tprint(`[${fname}] Failed to execute script on ${serverName}.`);
      return false;
    }
    return ppid != 0;
  }

  function canRunScriptOnServer(serverName) {
    const fname = "canRunScriptOnServer";

    ns.printf("=> [%s] Server: %s", fname, serverName);
    if (isMyServer(serverName)) {
      ns.printf("[%s] my server", fname);
      return true;
    }

    ns.printf("[%s] Trying to hack server.", fname);
    return hack_server(ns, serverName);
  }

  /** Tries to distributes scripts to server.
   * 
   * Upon success, returns the amount of threads that can be run on the server after distribution.
   */
  function distributeScriptsToServer(serverName) {
    const fname = "distributeScriptsToServer";

    if (!canRunScriptOnServer(serverName)) {
      return 0;
    }

    // Kill previous runs
    if (progData.killAllScripts) {
      ns.killall(serverName);
    } else if (progData.killCurrentScript) {
      ns.scriptKill(scriptName, serverName);
    }

    // Calculate number of threads
    const threads = calculateScriptThreads(serverName);
    if (threads == 0) {
      return 0;
    }


    if (distributeScripts(serverName)) {
    }
  }
}