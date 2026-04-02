import { getGangEquipmentInformation } from "./utils.js";
import { formatGainRate } from "/utils/formatters.js";
import { Color, printInfo, toGreen } from "/utils/print.js";

//#region Equipment

function printEquipmentItems(ns, items) {
  for (const item of items) {
    const name = toGreen(item.name);
    ns.tprint(
      `\t\t${name} (${item.type}) - Cost: ${ns.formatNumber(item.cost)}, Stats: ${JSON.stringify(item.stats)}`,
    );
  }
}

function printGangEquipmentType(ns, name, colorMain, colorSub, equipment) {
  const totalItems = equipment.hacking.length + equipment.combat.length;
  const hackingCost = equipment.hacking.reduce(
    (sum, item) => sum + item.cost,
    0,
  );
  const combatCost = equipment.combat.reduce((sum, item) => sum + item.cost, 0);
  const totalCost = hackingCost + combatCost;
  printInfo(
    ns,
    `${colorMain}${name} (${totalItems}) - Total Cost: ${ns.formatNumber(totalCost)}${Color.Reset}`,
  );

  // Hacking
  printInfo(
    ns,
    `${colorSub}Hacking ${name}: (${equipment.hacking.length}) - Total Cost: ${ns.formatNumber(hackingCost)}${Color.Reset}`,
  );
  printEquipmentItems(ns, equipment.hacking);

  // Combat
  printInfo(
    ns,
    `${colorSub}Combat ${name}: (${equipment.combat.length}) - Total Cost: ${ns.formatNumber(combatCost)}${Color.Reset}`,
  );
  printEquipmentItems(ns, equipment.combat);
}

function printGangEquipment(ns) {
  const equipment = getGangEquipmentInformation(ns);
  const augmentations = equipment.augmentations;
  const regular = equipment.regular;

  // Total Equipment
  const totalEquipment =
    augmentations.hacking.length +
    augmentations.combat.length +
    regular.hacking.length +
    regular.combat.length;
  ns.tprint(`Gang equipment : ${totalEquipment}`);

  printGangEquipmentType(
    ns,
    "Augmentations",
    Color.FgBlueBright,
    Color.FgBlue,
    augmentations,
  );
  printGangEquipmentType(
    ns,
    "Regular Equipment",
    Color.FgMagentaBright,
    Color.FgMagenta,
    regular,
  );

  ns.tprint("");
  ns.tprint("");
}

//#endregion Equipment

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
