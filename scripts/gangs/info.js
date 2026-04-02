import { getGangEquipmentInformation } from "./utils.js";
import { formatGainRate } from "/utils/formatters.js";
import { printInfo, toGreen } from "/utils/print.js";

function printGangEquipment(ns) {
  const equipment = getGangEquipmentInformation(ns);
  ns.tprint(`Gang equipment (${equipment.length})`);
  const augmentations = equipment.augmentations;
  const regular = equipment.regular;
  const totalEquipment = augmentations.length + regular.length;

  printInfo(
    ns,
    `Augmentations (${augmentations.hacking.length + augmentations.combat.length})`,
  );
  printInfo(ns, `Hacking Augmentations: (${augmentations.hacking.length})`);
  printEquipment(augmentations.hacking);
  printInfo(ns, `Combat Augmentations: (${augmentations.combat.length})`);
  printEquipment(augmentations.combat);

  ns.tprint("");
  printInfo(
    ns,
    `Regular Equipment (${regular.hacking.length + regular.combat.length})`,
  );
  printInfo(ns, `Hacking Regular Equipment: (${regular.hacking.length})`);
  printEquipment(regular.hacking);
  printInfo(ns, `Combat Regular Equipment: (${regular.combat.length})`);
  printEquipment(regular.combat);

  function printEquipment(items) {
    for (const item of items) {
      ns.tprint(
        `\t\t${item.name} (${item.type}) - Cost: ${ns.formatNumber(item.cost)}, Stats: ${JSON.stringify(item.stats)}`,
      );
    }
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

function printTasks(ns) {
  for (const taskName of ns.gang.getTaskNames()) {
    const task = ns.gang.getTaskStats(taskName);
    ns.tprint(JSON.stringify(task, null, 2));
  }
}

//#region Gang Info
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

//#endregion Gang Info

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
  const defaultOptions = ["-h", "--help", "--tail"];
  const options = ["--equipment", "--members", "--tasks"];

  return [...defaultOptions, ...options];
}

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([
    ["help", false],
    ["h", false],
    ["tasks", false],
    ["members", false],
    ["equipment", false],
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
    ns.tprint("  --equipment    - Print information about gang equipment");
    ns.tprint("  --members      - Print information about gang members");
    ns.tprint("  --tasks        - Print information about gang tasks");
    return;
  }

  if (args.equipment) {
    printGangEquipment(ns);
  }

  if (args.members) {
    printGangMembers(ns);
  }

  if (args.tasks) {
    printTasks(ns);
  }

  printGangInformation(ns);
}
