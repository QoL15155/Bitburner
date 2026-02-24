//#region Host Scanning

/** Returns a list of child hosts for a given server, 
 * excluding the parent server
 * @param {NS} ns
 * @param {string} serverName
 * @param {string} parentName Parent of the current server
 * @return {array} list of child hosts
 */
export function scan_host(ns, serverName, parentName = "") {
  const fname = "scan_host";
  let children = ns.scan(serverName);

  // remove parent from list
  if (parentName != "") {
    let idx = children.indexOf(parentName);
    if (idx != -1) {
      children.splice(idx, 1);
    } else {
      ns.alert(`[${fname}] ${serverName}: Didn't find parent ${parentName}`);
    }
  }

  if (children.length > 0) {
    ns.printf(`[${fname}] Server: ${serverName}. Hosts: ${children}`);
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
  function scanHostsRec(serverName, parent) {
    let knownHosts = []
    if (serverName != "home")
      knownHosts = knownHosts.concat(serverName);

    const children = scan_host(ns, serverName, parent);
    if (children.length > 0) {
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const subHosts = scanHostsRec(child, serverName);
        knownHosts = knownHosts.concat(subHosts);
      }
    }

    ns.printf("<= Finished Scanning %s. Hosts: %d", serverName, knownHosts.length);
    return knownHosts;
  }

  ns.disableLog("scan");
  const serverList = scanHostsRec("home", "");
  ns.enableLog("scan");
  return serverList;
}

//#endregion Host Scanning

//#region Hack Server

/**
 * Checks if player can get root access to the server 
 * based on available hacking programs and opens necessary ports 
 * 
 * @param {NS} ns
 * @param {string} serverName
 * @return {number} number of threads that can be run on the server
 */
function canGetRootAccess(ns, serverName) {

  const availablePorts = getAvailablePorts(ns);
  const requiredPorts = ns.getServerNumPortsRequired(serverName);
  return availablePorts >= requiredPorts;

  // Calculates number of ports that can be hacked based on programs installed on the machine
  function getAvailablePorts(ns) {
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
}

export function getRootAccess(ns, serverName) {
  if (!canGetRootAccess(ns, serverName)) {
    ns.printf("[getRootAccess] Can't get root access to %s. Not enough ports can be hacked.", serverName);
    return false;
  }

  if (ns.fileExists("BruteSSH.exe", "home"))
    ns.brutessh(serverName);
  if (ns.fileExists("FTPCrack.exe", "home"))
    ns.ftpcrack(serverName);
  if (ns.fileExists("relaySMTP.exe", "home"))
    ns.relaysmtp(serverName);
  if (ns.fileExists("HTTPWorm.exe", "home"))
    ns.httpworm(serverName);
  if (ns.fileExists("SQLInject.exe", "home"))
    ns.sqlinject(serverName);

  return ns.nuke(serverName);
}

/** 
 * Checks if server can be hacked based on current hacking level and programs available
 * 
 * @param {NS} ns 
 * @param {string} serverName
 * @return {boolean} true if server can be hacked, false otherwise
 **/
export function canHackServer(ns, serverName) {

  if (!canGetRootAccess(ns, serverName)) {
    return false;
  }

  // Required Hacking skill
  const requiredLevel = ns.getServerRequiredHackingLevel(serverName);
  if (ns.getHackingLevel() < requiredLevel) {
    ns.printf("[canHackServer] Server doesn't meet hacking level requirements: %s - %d", serverName, requiredLevel);
    return false;
  }

  return true;
}

/** 
 * Hacks a server if possible
 * 
 * @param {NS} ns
 * @param {string} serverName
 * @param {boolean} validate
 * @return {boolean} true if server was compromised, false otherwise
 */
export function hackServer(ns, serverName, validate = true) {
  if (validate && !canHackServer(ns, serverName)) {
    return false;
  }

  return getRootAccess(ns, serverName);
}

//#endregion Hack Server

/** 
 * Runs a command in terminal
 * 
 * @param {string} command : command to run in terminal
 */
export async function runTerminalCommand(ns, command) {
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