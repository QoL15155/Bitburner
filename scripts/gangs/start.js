import { BuyLimits, scriptHackingGang } from "./constants.js";
import { shouldBuy, writeGangEquipment, writeGangTasks } from "./utils.js";
import { Color, printError, toGreen } from "/utils/print.js";

// Arguments
const argBuyAugmentations = "buy-augmentations";
const argBuyEquipment = "buy-equipment";
const argOverrideFocus = "override-focus";

const paramBuyAugmentations = `--${argBuyAugmentations}`;
const paramBuyEquipment = `--${argBuyEquipment}`;
const paramOverrideFocus = `--${argOverrideFocus}`;

/**
 * Arranges the environment for gang management, including:
 *
 * - Tasks
 *          Write tasks info to a json file.
 * - Equipment
 *         Write equipment info to a json file.
 * - Gang Members
 *          Calls ongoing script to manage gang members' tasks and wanted level,
 *          and recruit new members when possible.
 */

/**
 * Calls appropriate gang management script.
 * Should only be called after a gang has been formed
 *
 * @param {NS} ns - the Netscript environment
 * @param {Object} args - the arguments passed to the script, parsed by ns.flags
 * @return {Promise<boolean>} false when the script was called with errors
 */
async function startGangManagement(ns, args) {
  const overrideFocus = args[argOverrideFocus];

  const gangInformation = ns.gang.getGangInformation();
  // Write tasks and equipment info to a json file for other scripts to use.
  // use gang's actual type (before potential override)
  writeGangTasks(ns, gangInformation.isHacking);

  // Toggle gang type if user asked to override
  let isHackingGang = gangInformation.isHacking;
  isHackingGang = overrideFocus ? !isHackingGang : isHackingGang;
  if (isHackingGang) {
    ns.tprint("Turning off territory warfare for hacking gang");
    ns.gang.setTerritoryWarfare(false);
  }

  const { buyAugmentations, buyEquipment } = await processBuyingOptions(
    ns,
    isHackingGang,
    args,
  );

  const gangManagementScript = scriptHackingGang;
  ns.tprint(`Running ${gangManagementScript}`);

  const gangMembers = JSON.stringify(ns.gang.getMemberNames());
  const additionalArguments = [];
  if (buyAugmentations) {
    additionalArguments.push(paramBuyAugmentations);
  }
  if (buyEquipment) {
    additionalArguments.push(paramBuyEquipment);
  }
  if (overrideFocus) {
    additionalArguments.push(paramOverrideFocus);
  }
  const pid = ns.run(
    gangManagementScript,
    { threads: 1 },
    gangMembers,
    ...additionalArguments,
  );
  return pid !== 0;
}

/**
 * Checks if we should buy augmentations or equipment.
 * The calculations here are a rough estimate of whether the player has enough money.
 *
 * @param {NS} ns
 * @param {boolean} isHackingGang
 * @param {Object} args - the arguments passed to the script, parsed by ns.flags
 * @returns {Promise<{buyAugmentations: boolean, buyEquipment: boolean}>}
 */
async function processBuyingOptions(ns, isHackingGang, args) {
  const equipment = writeGangEquipment(ns);

  // Augmentations
  const costAugmentations = isHackingGang
    ? equipment.augmentationsCosts.hacking
    : equipment.augmentationsCosts.combat;
  const buyAugmentations = await shouldBuy(
    ns,
    costAugmentations,
    BuyLimits.augmentations,
    args[argBuyAugmentations] || args[argBuyEquipment],
  );

  // Equipment
  const costEquipment = isHackingGang
    ? equipment.regularCosts.hacking
    : equipment.regularCosts.combat;
  const buyEquipment = await shouldBuy(
    ns,
    costEquipment,
    BuyLimits.equipment,
    args[argBuyEquipment],
  );

  return {
    buyAugmentations,
    buyEquipment,
  };
}

/**
 * Checks if the gang management script is already running, and kills it if toKill is true.
 *
 * @param {NS} ns - Netscript API object
 * @param {string} scriptName - Name of the script to check
 * @param {boolean} toKill - Whether to kill the script if it's running
 * @returns {boolean} true if the script is not running or was killed successfully, false otherwise
 */
function handleRunningScript(ns, scriptName, toKill) {
  if (!ns.scriptRunning(scriptName, "home")) {
    return true;
  }

  // Script is already running
  if (!toKill) {
    ns.tprint(`WARN Script ${scriptName} is already running. SKIPPING...`);
    return false;
  }

  const killResult = ns.scriptKill(scriptName, "home");

  if (!killResult) {
    ns.tprint(`ERROR Failed to kill already running script ${scriptName}.`);
    return false;
  }

  if (ns.scriptRunning(scriptName, "home")) {
    ns.tprint(
      `ERROR Even after killing, script ${scriptName} is still running.`,
    );
    return false;
  }

  ns.tprint(`Killed already running script ${scriptName}. Restarting...`);
  return true;
}

//#region Main

function printUsage(ns) {
  const usageMessage = `run ${ns.getScriptName()}`;
  ns.tprint(
    `Usage: ${toGreen(usageMessage)} ${Color.Italic}[OPTIONS]${Color.Reset}`,
  );
  ns.tprint("");
  ns.tprint("Initial Gang Management Script");
  ns.tprint("================================");
  ns.tprint("Initializes gang management after a gang has been formed.");
  ns.tprint(
    "Calls gang management script to manage gang members' tasks and wanted level, and recruit new members when possible.",
  );
  ns.tprint("");
  ns.tprint("Options:");
  ns.tprint(
    `  ${toGreen("--buy-augmentations")}  Buy augmentations for gang members.`,
  );
  ns.tprint(
    `  ${toGreen("--buy-equipment")}      Buy equipment (and augmentations) for gang members.`,
  );
  ns.tprint(
    `  ${toGreen("--override-focus")}     Override gang's type and focus (hacking->combat, combat->hacking).`,
  );
  ns.tprint(
    `  ${toGreen("--kill, -k")}           Kill currently running gang management script.`,
  );
}

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
  const defaultOptions = ["-h", "--help", "--tail"];
  const options = ["-k", "--kill"];
  const moreOptions = [
    paramBuyAugmentations,
    paramBuyEquipment,
    paramOverrideFocus,
  ];

  return [...defaultOptions, ...options, ...moreOptions];
}

export async function main(ns) {
  const args = ns.flags([
    ["help", false],
    ["h", false],
    ["kill", false],
    ["k", false],
    [argBuyAugmentations, false],
    [argBuyEquipment, false],
    [argOverrideFocus, false],
  ]);
  if (args.help || args.h) {
    printUsage(ns);
    return;
  }

  // Check if member is in gang
  if (!ns.gang.inGang()) {
    ns.tprint(
      "ERROR You are not in a gang. Join a gang before running this script.",
    );
    return;
  }

  const toKill = args.kill || args.k;
  if (!handleRunningScript(ns, scriptHackingGang, toKill)) {
    return;
  }

  // Run management script
  const result = await startGangManagement(ns, args);

  if (result === false) {
    printError(ns, "Failed to call gang management script");
    ns.ui.openTail();
  }
}

//#endregion Main
