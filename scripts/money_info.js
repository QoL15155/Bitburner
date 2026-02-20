import { can_hack_server, list_servers } from "./utils.js"
import { printInfo } from "./utils_print.js"

/* returns the server with most money */
export function get_money_server_2(ns, server_list, isVerbose = true) {
  let maxMoneyOnServer = 0;
  let bestServer = "";

  let playerHackingLevel = ns.getHackingLevel();
  if (playerHackingLevel > 1)
    playerHackingLevel = playerHackingLevel / 2;
  ns.printf("Looking for the most profitable server with hacking level <= %s", playerHackingLevel);

  function check_server_money(server_name) {
    let money = ns.getServerMaxMoney(server_name);
    let requiredLevel = ns.getServerRequiredHackingLevel(server_name);

    ns.printf("[%s] Level: %d, Max Money: %d", server_name, requiredLevel, money);

    if (money > maxMoneyOnServer && (requiredLevel <= playerHackingLevel)
      && can_hack_server(ns, server_name)) {
      maxMoneyOnServer = money;
      bestServer = server_name;
    }
  }

  ns.disableLog("getServerMaxMoney");
  ns.disableLog("getServerRequiredHackingLevel");
  server_list.forEach(check_server_money);
  ns.enableLog("getServerMaxMoney");
  ns.enableLog("getServerRequiredHackingLevel");

  if (isVerbose) {
    printInfo(ns, `Best Server: ${bestServer}. Max money: $${maxMoneyOnServer}`);
  }
  return bestServer;
}

export function get_money_server(ns) {
  var host_list = list_servers(ns);
  return get_money_server_2(ns, host_list);
}

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([["help", false]]);
  if (args.help) {
    ns.tprint("Find the best server to hack money from");
    ns.tprint(`Usage:`);
    ns.tprint(`> run ${ns.getScriptName()}`);
    return;
  }
  get_money_server(ns);
}