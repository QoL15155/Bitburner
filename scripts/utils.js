/** Returns a list of child hosts for a given server, 
 * excluding the parent server
 * @param {NS} ns
 * @param {string} server_name
 * @param {string} parent_name
 * @return {array} list of child hosts
 */
export function scan_host(ns, server_name, parent_name) {
  const fname = "scan_host";
  let children = ns.scan(server_name);

  // remove parent from list
  if (parent_name != "") {
    let idx = children.indexOf(parent_name);
    if (idx != -1) {
      children.splice(idx, 1);
    } else {
      ns.alert(`[${fname}] ${server_name}: Didn't find parent ${parent_name}`);
    }
  }

  if (children.length > 0) {
    ns.printf(`[${fname}] Server: ${server_name}. Hosts: ${children}`);
  }

  return children;
}

/** Recursively scans all hosts in the network 
 * 
 * @param {NS} ns 
 * @return list of servers in the network
 */
export function list_servers(ns) {

  /* Scans for children of the current host */
  function scan_hosts_rec(server_name, parent) {
    var known_hosts = []
    if (server_name != "home")
      known_hosts = known_hosts.concat(server_name);

    var children = scan_host(ns, server_name, parent);
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

/** Checks if server can be hacked 
 * based on current hacking level and programs available
 * @param {NS} ns 
 * @param {string} server_name
 * @return {boolean} true if server can be hacked, false otherwise
 **/
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

    if (!ns.fileExists("HTTPWorm.exe", "home"))
      return 3;

    if (!ns.fileExists("SQLInject.exe", "home"))
      return 4;

    return 5;
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

/** Hacks a server if possible
 * @param {NS} ns
 * @param {string} server_name
 * @param {boolean} validate
 * @return {boolean} true if server was compromised, false otherwise
 */
export function hack_server(ns, server_name, validate = true) {
  if (validate && !can_hack_server(ns, server_name)) {
    return false;
  }

  if (ns.fileExists("BruteSSH.exe", "home"))
    ns.brutessh(server_name);
  if (ns.fileExists("FTPCrack.exe", "home"))
    ns.ftpcrack(server_name);
  if (ns.fileExists("relaySMTP.exe", "home"))
    ns.relaysmtp(server_name);
  if (ns.fileExists("HTTPWorm.exe", "home"))
    ns.httpworm(server_name);
  if (ns.fileExists("SQLInject.exe", "home"))
    ns.sqlinject(server_name);

  return ns.nuke(server_name);
}

/** Run a command on terminal
 * 
 * @param {string} command
 */
export async function run_terminal_command(ns, command) {
  // Work around the RAM cost of document
  const doc = eval('document');
  // Acquire a reference to the terminal text field
  const terminalInput = doc.getElementById("terminal-input");
  // Get a reference to the React event handler.
  const handler = Object.keys(terminalInput)[1];
  //Create an enter press
  const enterPress = new KeyboardEvent('keydown',
    {
      bubbles: true,
      cancelable: true,
      keyCode: 13
    });

  // Run the command
  terminalInput.value = command;
  terminalInput[handler].onChange({ target: terminalInput });
  terminalInput.dispatchEvent(enterPress);

  // Sleep in case the command we ran is async.
  while (terminalInput.disabled) {
    await ns.sleep(1000);
  }
}