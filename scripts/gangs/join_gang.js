import { writeGangTasks, scriptHackingGang } from "./utils.js";
import { printInfo} from "utils/print.js";

/** 
 * Script should be called when first joining a gang. 
 * 
 * - Tasks : 
 *          Write tasks info to a json file.
 *          Can be used by other scripts to assign tasks to gang members.
 * - Gang Members : 
 *          Calls ongoing script to manage gang members' tasks and wanted level, 
 *          and recruit new members when possible.
 */

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
    const defaultOptions = ["-h", "--help", "--tail"];
    const options = ["--faction"];

    return [...defaultOptions, ...options];
}

export async function main(ns) {
    const args = ns.flags([['help', false], ['h', false], ['faction', 'Slum Snakes']]);
    if (args.help || args.h) {
        ns.tprint(`Usage: run ${ns.getScriptName()}`);
        ns.tprint("");
        ns.tprint("Initial Gang Recruit Script");
        ns.tprint("=====================");
        ns.tprint("");
        ns.tprint("This script should be run once when you first create a gang.");
        ns.tprint("- Generates a task-list for the gang.")
        ns.tprint("- Calls ongoing script to manage gang members' tasks and wanted level, and recruit new members when possible.");
        return;
    }

    const faction = args.faction;
    if (!ns.gang.createGang(faction)) {
        printInfo(ns, `Gang already exists.`);
    } else {
        printInfo(ns, `Gang for faction ${faction} created successfully.`);
    }

    // Write tasks info to a json file for other scripts to use.
    const gangInformation = ns.gang.getGangInformation();
    const isHackingGang = gangInformation.isHacking;
    writeGangTasks(ns, isHackingGang);

    // TODO: sort-out members

    if (isHackingGang) {
        ns.run(scriptHackingGang);
    } else {
        ns.alert("Combat gang is not implemented yet. Please switch to a hacking gang or implement combat gang management.");
    }
}