import { print, printInfo } from "/utils/print.js";
import { doConversion, formatGainRate } from "/utils/formatters.js";

function printTasks(ns) {
  for (let taskName of ns.gang.getTaskNames()) {
    const task = ns.gang.getTaskStats(taskName);
    print(ns, JSON.stringify(task, null, 2));
  }
}

function printGangMembers(ns) {
  const gangMembers = ns.gang.getMemberNames();
  print(ns, `Gang members (${gangMembers.length})`);
  for (let memberName of gangMembers) {
    const memberInfo = ns.gang.getMemberInformation(memberName);
    print(ns, JSON.stringify(memberInfo, null, 2));
  }
}

function printGangInformation(ns) {
  const gangInformation = ns.gang.getGangInformation();

  // Respect gain per game cycle.
  const respectPerSecond = formatGainRate(gangInformation.respectGainRate);
  const nextRecruit =
    gangInformation.respectForNextRecruit === Infinity
      ? "N/A"
      : doConversion(gangInformation.respectForNextRecruit);

  // Wanted
  const wantedGainRate = formatGainRate(gangInformation.wantedLevelGainRate);

  // Territory
  const territoryControlled = (gangInformation.territory * 100).toFixed(2);

  const prettyGangInformation = {
    moneyGainRate: formatGainRate(gangInformation.moneyGainRate),
    power: gangInformation.power,
    respect: {
      current: doConversion(gangInformation.respect),
      nextRecruit: nextRecruit,
      gainRate: respectPerSecond,
    },
    wanted: {
      level: doConversion(gangInformation.wantedLevel.toFixed(3)),
      gainRate: wantedGainRate,
      penalty: gangInformation.wantedPenalty,
    },
    territory: {
      percentControlled: `${territoryControlled} %%`,
      clashChance: gangInformation.territoryClashChance,
      warfareEngaged: gangInformation.territoryWarfareEngaged,
    },
  };

  printInfo(
    ns,
    `${gangInformation.faction}  (${gangInformation.isHacking ? "Hacking" : "Combat"} Gang)`,
  );
  print(ns, JSON.stringify(prettyGangInformation, null, 2));
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
    ns.tprint("  --tasks    - Print information about gang tasks");
    ns.tprint("  --members  - Print information about gang members");
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
