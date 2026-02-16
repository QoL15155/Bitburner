import { hack_server, list_servers } from "./utils.js"
import { get_money_server_2 } from "./money_info.js"

/** @param {NS} ns */
export async function main(ns) {
  const SCRIPT_NAME = "get_money.js";
  const fname = "Distribute";

  const args = ns.flags([['help', false], ['h', false], 
    ['kill_script', false], ['k', false], ['kill_all', false],
    ['target', '']
  ]);
  if (args.help || args.h) {
    ns.tprint(`Usage: run ${ns.getScriptName()} [[--kill_script, -k] | [--kill_all]]`);
    ns.tprint("");
    ns.tprint("This script will attack server for money.");
    ns.tprint("");
    ns.tprint("Arguments");
    ns.tprint("==========");
    ns.tprint("\t--help : show this help message");
    ns.tprint("\t--kill_script, -k : kill previous runs of the script on the server before starting new one");
    ns.tprint("\t--kill_all : kill all scripts on the server before starting new one");
    ns.tprint("Example:");
    ns.tprint(`> run ${ns.getScriptName()} n00dles`);
    return;
  }

  const kill_script = args.kill_script || args.k;
  const kill_all_scripts = args.kill_all;

  const my_servers = ns.getPurchasedServers();

  // Count the number of hacked hosts
  var g_distributed_hosts = 0;

  const g_script_mem = ns.getScriptRam(SCRIPT_NAME);
  if (g_script_mem == 0) {
    ns.tprint(`[${fname}] Failed to read script RAM. ${SCRIPT_NAME}`);
  }
  ns.printf(`[${fname}] Memory script requires: ${g_script_mem}`);

  function is_my_server(server_name) {
    if (server_name == "home" ||
      my_servers.indexOf(server_name) != -1) {
      return true;
    }
    return false;
  }

  function calculate_script_threads(server_name) {
    var ram_max = ns.getServerMaxRam(server_name)
    if (ram_max == 0) {
      // not enough memory
      ns.printf(`[${fname}] has 0 RAM`);
      return 0;
    }
    var ram_used = ns.getServerUsedRam(server_name);
    let ram_diff = ram_max - ram_used;
    if (ram_diff < g_script_mem) {
      ns.printf(`[${fname}] Memory is full. Max Ram: ${ram_max}, Used RAM: ${ram_used}`);
      return 0;
    }
    var threads = Math.floor(ram_diff / g_script_mem);
    ns.printf(`[${fname}] Max Ram: ${ram_max}, Used RAM: ${ram_used}, Threads: ${threads}`);
    return threads;
  }

  function distribute_script(server_name) {
    const fname = "distribute_script";

    // Kill previous runs
    if (kill_all_scripts) {
      ns.killall(server_name);
    } else if (kill_script) {
      ns.scriptKill(SCRIPT_NAME, server_name);
    }

    // Calculate number of threads
    var threads = calculate_script_threads(server_name);
    if (threads == 0) {
      return false;
    }

    // Copy script and run it 
    ns.scp(SCRIPT_NAME, server_name);
    var ppid = ns.exec(SCRIPT_NAME, server_name, threads, target_server);
    if (ppid) {
      ns.printf(`[${fname}] PID: ${ppid}`);
    } else {
      ns.tprint(`[${fname}] Failed to execute script on ${server_name}.`);
      return false;
    }
    return ppid != 0;
  }

  function distribute_to_server(server_name) {
    const fname = "distribute_to_server";

    ns.printf("=> [%s] Server: %s", fname, server_name);
    if (is_my_server(server_name)) {
      ns.printf("[%s] my server", fname);
    } else {
      ns.printf("[%s] Trying to hack server.", fname);
      var was_hacked = hack_server(ns, server_name);
      if (!was_hacked) {
        return;
      }
    }

    var result = distribute_script(server_name);
    if (result) {
      ns.tprint(`[${fname}] Successfully distributed script to ${server_name}`);
      g_distributed_hosts++;
    }
  }

  ns.disableLog("getHackingLevel");
  ns.disableLog("getServerRequiredHackingLevel");
  ns.disableLog("getServerNumPortsRequired");
  ns.disableLog("getServerMaxRam");
  ns.disableLog("getServerUsedRam");
  ns.disableLog("brutessh");
  ns.disableLog("ftpcrack");
  ns.disableLog("nuke");

  var server_list = list_servers(ns);
  ns.printf(`[${fname}] Servers: ${server_list.length}`);

  var target_server = args.target;
  if (!target_server) {
     target_server = get_money_server_2(ns, server_list);
  }
  ns.printf(`[${fname}] Target server: ${target_server}`);
  ns.tprint(`[${fname}] Target server: ${target_server}`);

  server_list.forEach(distribute_to_server);

  // Hacked hosts: 44
  ns.tprint(`[${fname}] Distributed ${SCRIPT_NAME} to ${g_distributed_hosts} hosts`);
  ns.printf(`[${fname}] Distributed ${SCRIPT_NAME} to ${g_distributed_hosts} hosts`);

  ns.tprint(`[${fname}] Running script at 'home'.`);
  distribute_script("home");
}