import { canHackServer, list_servers } from "./utils.js"
import { printInfo } from "./utils_print.js"

/** @returns the server with most money */
export function getMoneyServer(ns) {
  const serverList = list_servers(ns);
  return getMoneyServer2(ns, serverList);
}

/** @returns the server with most money */
export function getMoneyServer2(ns, serverList, isVerbose = true) {
  const fname = "getMoneyServer";
  let maxMoneyOnServer = 0;
  let bestServer = "";

  ns.disableLog("disableLog");
  ns.disableLog("enableLog");
  ns.disableLog("getServerMaxMoney");
  ns.disableLog("getServerRequiredHackingLevel");

  let playerHackingLevel = ns.getHackingLevel();
  if (playerHackingLevel > 1)
    playerHackingLevel = playerHackingLevel / 2;
  ns.printf(`[${fname}] Looking for the most profitable server with hacking level <= ${playerHackingLevel}`);

  serverList.forEach(checkServerMoney);

  if (isVerbose) {
    printInfo(ns, `Best Server: ${bestServer}. Max money: $${maxMoneyOnServer}`);
  }

  ns.enableLog("getServerMaxMoney");
  ns.enableLog("getServerRequiredHackingLevel");
  return bestServer;

  function checkServerMoney(serverName) {
    const fname = "checkServerMoney";
    const money = ns.getServerMaxMoney(serverName);
    const requiredLevel = ns.getServerRequiredHackingLevel(serverName);

    ns.printf(`[${fname}] Server(${serverName}, Level: ${requiredLevel}, Max Money: ${money})`);

    if (money > maxMoneyOnServer
      && (requiredLevel <= playerHackingLevel)
      && canHackServer(ns, serverName)) {
      maxMoneyOnServer = money;
      bestServer = serverName;
    }
  }
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

  return [...defaultOptions];
}

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([['help', false], ['h', false]]);
  if (args.help) {
    ns.tprint("Find the best server to hack money from");
    ns.tprint(`Usage:`);
    ns.tprint(`> run ${ns.getScriptName()}`);
    return;
  }
  getMoneyServer(ns);
}