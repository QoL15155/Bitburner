
/** @param {NS} ns */
export async function main(ns) {
    const args = ns.flags([['help', false], ['h', false]]);
    const targetServer = args._[0];
    if (args.help || args.h || !targetServer) {
        ns.tprint(`USAGE: run ${ns.getScriptName()} TARGET_SERVER`);
        ns.tprint("");
        ns.tprint("This script will **grow** the server's money.");
        return;
    }

    while (true) {
        await ns.weaken(targetServer);
        await ns.sleep(Math.random() * 100);
    }
}