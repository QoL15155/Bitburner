import { hack_server, list_servers } from "./utils.js"
import { get_money_server_2 } from "./money_info.js"

/** @param {NS} ns */
export async function main(ns) {
  const scriptName = "get_money_simple.js";
  const fname = "Distribute";

  const args = ns.flags([['help', false], ['h', false],
  ['kill_script', false], ['k', false], ['kill_all', false],
  ['target', '']
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

  // Count the number of hacked hosts
  let distributedHosts = 0;
  serverList.forEach(distributeToServer);

  // Hacked hosts: 44
  print(`[${fname}] Distributed ${scriptName} to ${distributedHosts} hosts`);

  ns.tprint(`[${fname}] Running script at 'home'.`);
  distributeScript("home");

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
    const ramMax = ns.getServerMaxRam(serverName)
    if (ramMax == 0) {
      // not enough memory
      ns.printf(`[${fname}]has 0 RAM`);
      return 0;
    }
    const ramUsed = ns.getServerUsedRam(serverName);
    const ramDiff = ramMax - ramUsed;
    if (ramDiff < progData.scriptMemory) {
      ns.printf(`[${fname}] Memory is full.Max Ram: ${ramMax}, Used RAM: ${ramUsed}`);
      return 0;
    }
    const threads = Math.floor(ramDiff / progData.scriptMemory);
    ns.printf(`[${fname}] Max Ram: ${ramMax}, Used RAM: ${ramUsed}, Threads: ${threads}`);
    return threads;
  }

  function distributeScript(serverName) {
    const fname = "distributeScript";

    // Kill previous runs
    if (progData.killAllScripts) {
      ns.killall(serverName);
    } else if (progData.killCurrentScript) {
      ns.scriptKill(scriptName, serverName);
    }

    // Calculate number of threads
    const threads = calculateScriptThreads(serverName);
    if (threads == 0) {
      return false;
    }

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

  function distributeToServer(serverName) {
    const fname = "distributeToServer";

    ns.printf("=> [%s] Server: %s", fname, serverName);
    if (isMyServer(serverName)) {
      ns.printf("[%s] my server", fname);
    } else {
      ns.printf("[%s] Trying to hack server.", fname);
      if (!hack_server(ns, serverName)) {
        return;
      }
    }

    if (distributeScript(serverName)) {
      ns.tprint(`[${fname}] Successfully distributed script to ${serverName}`);
      distributedHosts++;
    }
  }
}