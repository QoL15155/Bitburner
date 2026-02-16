// FIXME: not usable at this moment
// Use this script when backdoors are implemented. 

import { hack_server } from "../utils.js"

/** @param {NS} ns */
export async function main(ns) {

  /*
  async function hack_server1(server_name) {

    ns.installBackdoor("backdoor");

    if (!ns.connect(server_name)) {
    ns.printf("Failed t o connect ot server");
    return;
    }

    await ns.installBackdoor();
  ns.disableLog("ALL");
  ns.enableLog("installBackdoor");
  }
  */


  await hack_server("CSEC");
  await hack_server("avmnite-02h")
}