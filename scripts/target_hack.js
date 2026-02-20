
/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
    const helpOptions = ["-h", "--help"];
    const defaultOptions = helpOptions.concat("--tail");

    if (args.some(a => helpOptions.includes(a))) {
        return [];
    }

    return [...defaultOptions];
}

/** @param {NS} ns */
export async function main(ns) {
    const args = ns.flags([['help', false], ['h', false]]);
    const targetServer = args._[0];
    if (args.help || args.h || !targetServer) {
        ns.tprint(`Usage: run ${ns.getScriptName()} TARGET_SERVER`);
        ns.tprint("");
        ns.tprint("Hacks the target server for money.");
        return;
    }

    while (true) {
        await ns.hack(targetServer);
        await ns.sleep(Math.random() * 100);
    }
}