/** @param {NS} ns */
export async function main(ns) {
  const runnable_servers = [
    "n00dles", "CSEC", "neo-net", "omega-net",
    "foodnstuff", "nectar-net", "silver-helix",
    "sigma-cosmetics", "zer0", "phantasy",
    "joesguns", 
    "hong-fang-tea", 
    "harakiri-sushi", "max-hardware",
    "iron-gym",
  ];
  var purchasedServers = ns.getPurchasedServers();

  const script_name = "early-hack-template.js";
  const to_kill = false;

  var script_mem = ns.getScriptRam(script_name);
  ns.printf("Memory script requires: %d", script_mem);

  // Wait until we acquire "BruteSSH.exe" program
  while (!ns.fileExists("BruteSSH.exe", "home")) {
    await ns.sleep(60000);
  }

  function hack_server(server_name) {
    ns.printf("==> Server: %s", server_name);

    // Copy script
    ns.scp(script_name, server_name);

    // Calculate number of threads
    var machine_memory = ns.getServerMaxRam(server_name);
    var threads = machine_memory / script_mem;
    threads = Math.floor(threads);
    ns.printf("Thread to be spawned: %d", threads)

    // Hack
    // ns.connect(server_name);
    ns.brutessh(server_name);
    ns.ftpcrack(server_name);
    ns.nuke(server_name);

    // Run script
    if (to_kill)
      ns.scriptKill(script_name, server_name);
    ns.exec(script_name, server_name, threads);
  }

  runnable_servers.forEach(hack_server);
  purchasedServers.forEach(hack_server);
}