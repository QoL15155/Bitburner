import { BuyLimits, scriptGangManage } from "./constants.js";
import {
  shouldBuyEquipment,
  writeGangEquipment,
  writeGangTasks,
} from "./utils.js";
import { Color, printError, toGreen } from "/utils/print.js";

// Arguments
const argBuyAugmentations = "buy-augmentations";
const argBuyUpgrades = "buy-upgrades";
const argOverrideFocus = "override-focus";
const argSkipWarfare = "skip-warfare";

const paramBuyAugmentations = `--${argBuyAugmentations}`;
const paramBuyUpgrades = `--${argBuyUpgrades}`;
const paramOverrideFocus = `--${argOverrideFocus}`;
const paramSkipWarfare = `--${argSkipWarfare}`;
// for management script
const paramIsCombatGang = `--is-combat-gang`;

/**
 * Arranges the environment for gang management, including:
 *
 * - Tasks
 *          Write tasks info to a json file.
 * - Equipment
 *          Write equipment (augmentations + upgrades) info to a json file.
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
  // use gang's actual type (before potential override)
  writeGangTasks(ns, gangInformation.isHacking);

  // Toggle gang type if user asked to override
  let isHackingGang = getIsHackingGang(ns, gangInformation, overrideFocus);
  if (isHackingGang) {
    ns.tprint("Turning off territory warfare for hacking gang");
    ns.gang.setTerritoryWarfare(false);
  }

  const { buyAugmentations, buyUpgrades } = await processBuyingOptions(
    ns,
    isHackingGang,
    args,
  );

  const gangManagementScript = scriptGangManage;
  const requiredRam = getRequiredRam(
    ns,
    gangManagementScript,
    gangInformation["respectForNextRecruit"] !== Infinity,
    isHackingGang || args[argSkipWarfare],
    buyAugmentations || buyUpgrades,
  );
  ns.tprint(
    `Running ${gangManagementScript} (requires ${ns.formatRam(requiredRam)} RAM)`,
  );

  const gangMembers = JSON.stringify(ns.gang.getMemberNames());
  const additionalArguments = [];
  if (buyAugmentations) {
    additionalArguments.push(paramBuyAugmentations);
  }
  if (buyUpgrades) {
    additionalArguments.push(paramBuyUpgrades);
  }
  if (!isHackingGang) {
    additionalArguments.push(paramIsCombatGang);
  }
  if (args[argSkipWarfare]) {
    additionalArguments.push(paramSkipWarfare);
  }
  const pid = ns.run(
    gangManagementScript,
    { threads: 1, ramOverride: requiredRam },
    gangMembers,
    ...additionalArguments,
  );
  return pid !== 0;
}

function getIsHackingGang(ns, gangInformation, overrideFocus) {
  let isHackingGang = gangInformation.isHacking;
  isHackingGang = overrideFocus ? !isHackingGang : isHackingGang;

  if (isHackingGang) {
    return isHackingGang;
  }

  // Combat gang - but override if territory is 100%
  if (gangInformation.territory === 1) {
    ns.tprint(
      "Combat gang with 100% territory - treating as hacking gang for equipment buying purposes.",
    );
    return true;
  }

  return false;
}

/**
 * Writes gang equipment info to a json file for other scripts to use.
 * Checks if we should buy augmentations or upgrades.
 * The calculations here are a rough estimate of whether the player has enough money.
 *
 * @param {NS} ns
 * @param {boolean} isHackingGang
 * @param {Object} args - the arguments passed to the script, parsed by ns.flags
 * @returns {Promise<{buyAugmentations: boolean, buyUpgrades: boolean}>}
 */
async function processBuyingOptions(ns, isHackingGang, args) {
  const equipment = writeGangEquipment(ns);

  // Augmentations
  const costAugmentations = isHackingGang
    ? equipment.augmentationsCosts.hacking
    : equipment.augmentationsCosts.combat;
  const buyAugmentations = await shouldBuyEquipment(
    ns,
    costAugmentations,
    BuyLimits.augmentations,
    args[argBuyAugmentations] || args[argBuyUpgrades],
  );

  // Upgrades
  const costUpgrades = isHackingGang
    ? equipment.upgradesCosts.hacking
    : equipment.upgradesCosts.combat;
  const buyUpgrades = await shouldBuyEquipment(
    ns,
    costUpgrades,
    BuyLimits.upgrades,
    args[argBuyUpgrades],
  );

  return {
    buyAugmentations,
    buyUpgrades,
  };
}

function getRequiredRam(
  ns,
  managementScript,
  isRecruiting,
  skipWarfare,
  buyEquipment,
) {
  let requiredRam = ns.getScriptRam(managementScript);
  if (!buyEquipment) {
    const ramBefore = requiredRam;
    requiredRam -= ns.getFunctionRamCost("gang.purchaseEquipment");
    ns.tprint(
      `INFO - Gang management will NOT buy equipment. Lower RAM requirements. ${ns.formatRam(ramBefore)} -> ${ns.formatRam(requiredRam)}`,
    );
  }
  if (skipWarfare) {
    const ramBefore = requiredRam;
    requiredRam -= ns.getFunctionRamCost("gang.setTerritoryWarfare");
    requiredRam -= ns.getFunctionRamCost("gang.getOtherGangInformation");
    requiredRam -= ns.getFunctionRamCost("gang.getMemberNames");
    ns.tprint(
      `INFO - Skipping Territory Warfare. Lower RAM requirements. ${ns.formatRam(ramBefore)} -> ${ns.formatRam(requiredRam)}`,
    );
  }

  if (skipWarfare && !isRecruiting) {
    const ramBefore = requiredRam;
    requiredRam -= ns.getFunctionRamCost("gang.recruitMember");
    ns.tprint(
      `INFO - Skipping recruiting (already have max members). Lower RAM requirements. ${ns.formatRam(ramBefore)} -> ${ns.formatRam(requiredRam)}`,
    );
  }
  // round up to 2 decimals to avoid issues with very small differences in RAM requirements
  return Math.ceil(requiredRam * 100) / 100;
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
    ns.tprint(`WARN - Script ${scriptName} is already running. SKIPPING...`);
    return false;
  }

  const killResult = ns.scriptKill(scriptName, "home");

  if (!killResult) {
    ns.tprint(`ERROR - Failed to kill already running script ${scriptName}.`);
    return false;
  }

  if (ns.scriptRunning(scriptName, "home")) {
    ns.tprint(
      `ERROR - Even after killing, script ${scriptName} is still running.`,
    );
    return false;
  }

  ns.tprint(
    `INFO - Killed already running script ${scriptName}. Restarting...`,
  );
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
    `  ${toGreen("--buy-augmentations")}    Buy augmentations for gang members.`,
  );
  ns.tprint(
    `  ${toGreen("--buy-upgrades")}         Buy upgrades (and augmentations) for gang members.`,
  );
  ns.tprint(
    `  ${toGreen("--override-focus")}       Override gang's type and focus (hacking->combat, combat->hacking).`,
  );
  ns.tprint(
    `  ${toGreen("--skip-warfare")}         Skip Territory Warfare management (only affects combat gangs).`,
  );
  ns.tprint(
    `  ${toGreen("--kill, -k")}             Kill currently running gang management script.`,
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
    paramBuyUpgrades,
    paramOverrideFocus,
    paramSkipWarfare,
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
    [argBuyUpgrades, false],
    [argOverrideFocus, false],
    [argSkipWarfare, false],
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
  if (!handleRunningScript(ns, scriptGangManage, toKill)) {
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
