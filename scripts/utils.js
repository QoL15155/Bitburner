/* Recursively scans all hosts in the network 
  @return list of servers in the network
*/
export function list_servers(ns) {
  
  /* Scans for children of the current host */
  function scan_host(server_name, parent_name) {
    const fname = "scan_host";
    let children = ns.scan(server_name);
    
      // remove parent from list
    if (parent_name != "") {
      let idx = children.indexOf(parent_name);
      if (idx != -1) {
        children.splice(idx, 1);
      } else {
        ns.printf("[%s] %s: Didn't find parent - %s", fname, server_name, parent_name);
        ns.tprint("[%s] %s: Didn't find parent - %s", fname, server_name, parent_name);
      }
    }

    if (children.length > 0) {
      ns.printf("[%s] Server: %s. Hosts: %s", fname, server_name, children);
    }

    return children;
  }

  function scan_hosts_rec(server_name, parent) {
    var known_hosts = []
    if (server_name != "home")
      known_hosts = known_hosts.concat(server_name);

    var children = scan_host(server_name, parent);
    let len_children = children.length;
    if (len_children > 0) {
      for (let i = 0; i < len_children; i++) {
        let child = children[i];
        let sub_hosts = scan_hosts_rec(child, server_name);
        known_hosts = known_hosts.concat(sub_hosts);
      }
    }

    ns.printf("<= Finished Scanning %s. Hosts: %d", server_name, known_hosts.length);
    return known_hosts;
  }

  ns.disableLog("scan");
  var server_list = scan_hosts_rec("home", "");
  ns.enableLog("scan");
  return server_list;
}

export function can_hack_server(ns, server_name) {

  /* Calculates number of ports that can be hacked 
    Based on programs installed on the machine
  */
  function get_hacked_ports(ns) {
    if (!ns.fileExists("BruteSSH.exe", "home"))
      return 0;

    if (!ns.fileExists("FTPCrack.exe", "home"))
      return 1;

    if (!ns.fileExists("relaySMTP.exe", "home"))
      return 2;

    return 3;
  }

  // Required Hacking skill
  var required_level = ns.getServerRequiredHackingLevel(server_name);
  if (ns.getHackingLevel() < required_level) {
    ns.printf("[can_hack_server] Server doesn't meet hacking level requirements: %s - %d", server_name, required_level);
    return false;
  }

  var hacked_ports = get_hacked_ports(ns);
  var required_ports = ns.getServerNumPortsRequired(server_name);
  if (hacked_ports < required_ports) {
    ns.printf("[can_hack_server] Server doesn't meet port requirement: %s - %d", server_name, required_ports);
    return false;
  }

  return true;
}

export function hack_server(ns, server_name, validate=true) {
  if (validate && !can_hack_server(ns, server_name)) {
    return;
  }

  if (ns.fileExists("BruteSSH.exe", "home"))
    ns.brutessh(server_name);
  if (ns.fileExists("FTPCrack.exe", "home"))
    ns.ftpcrack(server_name);
  if (ns.fileExists("relaySMTP.exe", "home"))
    ns.relaysmtp(server_name);

  return ns.nuke(server_name);
}


/** @param {NS} ns */
export async function main(ns) {

  var result = list_servers(ns);
  ns.print(result);
  // Scanned Hosts: 70
  // Scanned hosts: 95 (anaylze 5)
  ns.printf("Scanned hosts: %d", result.length);
}