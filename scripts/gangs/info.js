import { formatGainRate } from "/utils/formatters.js";
import { toGreen } from "/utils/print.js";

function printTasks(ns) {
  for (const taskName of ns.gang.getTaskNames()) {
    const task = ns.gang.getTaskStats(taskName);
    ns.tprint(JSON.stringify(task, null, 2));
  }
}

function printGangMembers(ns) {
  const gangMembers = ns.gang.getMemberNames();
  ns.tprint(`Gang members (${gangMembers.length})`);
  for (const memberName of gangMembers) {
    const memberInfo = ns.gang.getMemberInformation(memberName);
    ns.tprint(JSON.stringify(memberInfo, null, 2));
  }
}

function printGangInformation(ns) {
  const gangInformation = ns.gang.getGangInformation();

  const respectPerSecond = formatGainRate(gangInformation.respectGainRate);
  const nextRecruit =
    gangInformation.respectForNextRecruit === Infinity
      ? "N/A"
      : ns.formatNumber(gangInformation.respectForNextRecruit);

  // Wanted
  const wantedGainRate = formatGainRate(gangInformation.wantedLevelGainRate);

  const prettyGangInformation = {
    members: ns.gang.getMemberNames().length,
    moneyGainRate: `$${formatGainRate(gangInformation.moneyGainRate)}`,
    power: ns.formatNumber(gangInformation.power),
    respect: {
      current: ns.formatNumber(gangInformation.respect),
      nextRecruit: nextRecruit,
      gainRate: respectPerSecond,
    },
    wanted: {
      level: ns.formatNumber(gangInformation.wantedLevel),
      gainRate: wantedGainRate,
      penalty: gangInformation.wantedPenalty,
    },
    territory: {
      percentControlled: ns.formatPercent(gangInformation.territory),
      clashChance: ns.formatPercent(gangInformation.territoryClashChance),
      warfareEngaged: gangInformation.territoryWarfareEngaged,
    },
  };

  const message = `${gangInformation.faction}  (${gangInformation.isHacking ? "Hacking" : "Combat"} Gang)`;
  ns.tprint(`${toGreen(message)}`);
  ns.tprint(JSON.stringify(prettyGangInformation, null, 2));
}

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
  const defaultOptions = ["-h", "--help", "--tail"];
  const options = ["--tasks", "--members"];

  return [...defaultOptions, ...options];
}

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([
    ["help", false],
    ["h", false],
    ["tasks", false],
    ["members", false],
  ]);

  if (args.help || args.h) {
    ns.tprint(`Usage: run ${ns.getScriptName()}`);
    ns.tprint("");
    ns.tprint("Gang Info");
    ns.tprint("=====================");
    ns.tprint("");
    ns.tprint("Assumes that you have already created a gang.");
    ns.tprint("");
    ns.tprint("Options:");
    ns.tprint("  --help, -h     - Show this help message");
    ns.tprint("  --tasks        - Print information about gang tasks");
    ns.tprint("  --members      - Print information about gang members");
    return;
  }

  if (args.tasks) {
    printTasks(ns);
  }

  if (args.members) {
    printGangMembers(ns);
  }

  printGangInformation(ns);
}
