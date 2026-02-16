import { list_servers } from "./utils.js"

/* returns the server with most money */
export function get_money_server_2(ns, server_list) 
{
  var g_max_money = 0;
  var g_best_server = "";

  let g_hacking_level = ns.getHackingLevel();
  if (g_hacking_level > 1)
    g_hacking_level = g_hacking_level / 2;
  ns.printf("Looking for the most profitable server with hacking level <= %s", g_hacking_level);

  function check_server_money(server_name) {
    let max_money = ns.getServerMaxMoney(server_name);
    let required_level = ns.getServerRequiredHackingLevel(server_name);

    ns.printf("[%s] Level: %d, Max Money: %d", server_name, required_level, max_money);

    if (max_money > g_max_money && required_level <= g_hacking_level) {
      g_max_money = max_money;
      g_best_server = server_name;
    }
  }

  ns.disableLog("getServerMaxMoney");
  ns.disableLog("getServerRequiredHackingLevel");
  server_list.forEach(check_server_money);
  ns.enableLog("getServerMaxMoney");
  ns.enableLog("getServerRequiredHackingLevel");

  ns.printf("==> Best Server: %s. $%d", g_best_server, g_max_money);
  ns.tprint(`Best Server: ${g_best_server}. $${g_max_money}`);
  return g_best_server;
}

export function get_money_server(ns)
{
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