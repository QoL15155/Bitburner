
/** @param {NS} ns */
export async function main(ns) {
    const args = ns.flags([['help', false], ['h', false]]);
    const targetServer = args._[0];
    if (args.help || args.h || !targetServer) {
        ns.tprint(`USAGE: run ${ns.getScriptName()} SERVER_NAME`);
        ns.tprint("");
        ns.tprint("This script will **hack** the target server for money.");
        return;
    }

    while (true) {
        await ns.hack(targetServer);
        await ns.sleep(Math.random() * 100);
    }
}