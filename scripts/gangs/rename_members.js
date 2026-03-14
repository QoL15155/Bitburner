import { printError, printInfo, print } from "/utils/print.js";
import { memberNamePrefix } from "./utils.js";

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([
    ["help", false],
    ["h", false],
  ]);
  if (args.help || args.h) {
    ns.tprint(`Usage: run ${ns.getScriptName()}`);
    ns.tprint("");
    ns.tprint("Gang Member Rename Script");
    ns.tprint("=====================");
    ns.tprint("");
    ns.tprint(
      `Renames all gang members to have the prefix '${memberNamePrefix}'.`,
    );
    ns.tprint("Assumes that you have already created a gang.");
    return;
  }

  const gangMembers = ns.gang.getMemberNames();
  ns.printf(
    `Current gang members (${gangMembers.length}) : ${gangMembers.join(", ")}`,
  );
  for (let idx = 0; idx < gangMembers.length; idx++) {
    const memberName = gangMembers[idx];
    const newMemberName = `${memberNamePrefix}${idx}`;
    let result = ns.gang.renameMember(memberName, newMemberName);
    if (!result) {
      printError(
        ns,
        `Failed to rename member ${memberName} to ${newMemberName}`,
      );
    }
  }
}
