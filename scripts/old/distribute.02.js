/** @param {NS} ns */
export async function main(ns) {

  const script_name = "early-hack-template.js";
  const supported_ports = 2;
  const TO_KILL = true;

  const my_servers = ns.getPurchasedServers();

  // Count the number of hacked hosts
  let g_hacked_hosts = 0;

  var script_mem = ns.getScriptRam(script_name);
  ns.printf("Memory script requires: %d", script_mem);

  // Wait until essenstial software has been acquired
  /*
  while (!ns.fileExists("BruteSSH.exe", "home")) {
    await ns.sleep(60000);
  }
  while (!ns.fileExists("FTPCrack.exe", "home")) {
    await ns.sleep(60000);
  }
  */

  /* Scans for hosts. 
      This function should be called recursively 
  */
  function scan_host(server_name, parent_name) {
    let result = ns.scan(server_name);
    if (parent_name != "") {
      let idx = result.indexOf(parent_name);
      if (idx != -1) {
        result.splice(idx, 1);
      } else {
        ns.printf("%s: Didn't find parent - %s", server_name, parent_name);
      }
    }
    ns.printf("Result of scan: %s", result);
    return result;
  }

  function is_my_server(server_name) {
    if (server_name == "home" ||
      my_servers.indexOf(server_name) != -1) {
      return true;
    }
    return false;
  }

  function can_hack_server(server_name) {
    let required_ports = ns.getServerNumPortsRequired(server_name);
    if (supported_ports < required_ports) {
      return false
    }

    // no memory in machine
    var machine_memory = ns.getServerMaxRam(server_name);
    if (machine_memory == 0)
      return false;

    // if (ns.getHackingLevel(server_name) < ns.getServerRequiredHackingLevel(server_name)) {
      // return false;
    // }

    return true;
  }


  function hack_server(server_name)
  {
    ns.brutessh(server_name);
    ns.ftpcrack(server_name);
    ns.nuke(server_name);
  }

  function run_script(server_name)
  {
    // Copy script
    ns.scp(script_name, server_name);

    // Calculate number of threads
    var machine_memory = ns.getServerMaxRam(server_name);
    var threads = machine_memory / script_mem;
    threads = Math.floor(threads);
    ns.printf("Thread to be spawned: %d", threads)

    // Run script
    if (TO_KILL)
      ns.scriptKill(script_name, server_name);
    ns.exec(script_name, server_name, threads);
  }


  function hack_server_chain(server_name, parent) {
    var scanned_hosts = scan_host(server_name, parent);
    let num_hosts = scanned_hosts.length;
    if (num_hosts > 0) {
      for (let i = 0; i < num_hosts; i++) {
        let host = scanned_hosts[i];
        hack_server_chain(host, server_name);
      }
    }

    ns.printf("Finisehd Scanning %s", server_name);
    if (is_my_server(server_name))
    {
      ns.printf("==> My Server: %s", server_name);
      run_script(server_name);
      g_hacked_hosts++;
      return;
    }

    if (can_hack_server(server_name))
    {
      ns.printf("==> Hacking Server: %s", server_name);

      hack_server(server_name);

      run_script(server_name);
      g_hacked_hosts++;
    }

  }

  hack_server_chain("home", "");
  // Hacked hosts: 95
  ns.printf("Hacked hosts: %d", g_hacked_hosts);

}