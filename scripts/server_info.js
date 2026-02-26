import { formatMoney } from "./utils_print"

function formatTime(milliseconds) {
    const minutes = Math.floor(milliseconds / 1000 / 60);
    milliseconds = milliseconds % (1000 * 60);
    const seconds = ((milliseconds / 1000) % 60).toFixed(0);
    return `${minutes}.${seconds} minutes (${milliseconds} ms)`;
}

export async function collectServerInfo(ns, serverName, showServerObject, showPlayerInformation) {
    if (!ns.serverExists(serverName)) {
        ns.tprint(`Server was not found: '${serverName}'`);
        return;
    }
    const serverHome = ns.getServer("home");
    const player = ns.getPlayer();
    const serverObject = ns.getServer(serverName);

    const maxMoney = ns.getServerMaxMoney(serverName);
    const moneyAvailable = ns.getServerMoneyAvailable(serverName);

    let moneyObject = {
        maximum: formatMoney(maxMoney),
        available: formatMoney(moneyAvailable),
    };
    let growthObject = {
        growth: ns.getServerGrowth(serverName),
    }

    if (maxMoney > 0) {
        const moneyPercent = (moneyAvailable / maxMoney) * 100;
        const moneyMultiplier = maxMoney / Math.max(moneyAvailable, 1);
        // moneyPercent: moneyPercent.toFixed(2) + "%",
        moneyObject["moneyPercent"] = moneyPercent + "%";
        moneyObject["moneyMultiplier"] = moneyMultiplier.toFixed(2);

        const growThreads = ns.growthAnalyze(serverName, moneyMultiplier, serverHome.cpuCores);
        growthObject["growThreads"] = growThreads;
        if (ns.fileExists("Formulas.exe", "home")) {
            const growThreads2 = ns.formulas.hacking.growThreads(serverObject, player, maxMoney, serverHome.cpuCores);
            growthObject["growThreadFormula"] = growThreads2;
        }
    }

    const security = {
        base: ns.getServerBaseSecurityLevel(serverName),
        minimum: ns.getServerMinSecurityLevel(serverName),
        current: ns.getServerSecurityLevel(serverName),
    }

    const scriptExecutionsTimes = {
        hackTime: ns.getHackTime(serverName),
        growTime: ns.getGrowTime(serverName),
        weakenTime: ns.getWeakenTime(serverName)
    }

    const serverInfo = {
        hostname: serverName,
        homeCores: serverObject.cpuCores,

        money: moneyObject,
        grow: growthObject,
        securityLevel: security,

        executionTimes: {
            hackTime: formatTime(scriptExecutionsTimes.hackTime),
            growTime: formatTime(scriptExecutionsTimes.growTime),
            weakenTime: formatTime(scriptExecutionsTimes.weakenTime),
        },

    };

    if (showServerObject) {
        ns.tprint(JSON.stringify(serverObject, null, 2));
    }

    if (showPlayerInformation) {
        const playerObject = {
            homeServerCores: serverObject.cpuCores,
            multipliers: ns.getHackingMultipliers(),
        }
        ns.tprint("Player:");
        ns.tprint(JSON.stringify(playerObject, null, 2));
    }


    ns.tprint(JSON.stringify(serverInfo, null, 2));
    return;

}

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
    const helpOptions = ["-h", "--help"];
    if (args.some(a => helpOptions.includes(a))) {
        return [];
    }
    const defaultOptions = helpOptions.concat("--tail");
    const serverOptions = ["--server", "--player", "--all", "-a"];

    let servers = data.servers;

    if (args.some(a => servers.includes(a))) {
        servers = [];
    }

    return [...defaultOptions, ...serverOptions, ...servers];
}

/** @param {NS} ns */
export async function main(ns) {
    const args = ns.flags([
        ['help', false], ['h', false],
        ['server', false],
        ['player', false],
        ['all', false], ['a', false],
    ]);
    const targetServer = args._[0];
    if (args.help || args.h || !targetServer) {
        ns.tprint(`Usage: run ${ns.getScriptName()} TARGET_SERVER [OPTIONS]`);
        ns.tprint("");
        ns.tprint("Hacks the target server for money.");
        ns.tprint("");
        ns.tprint("Options:");
        ns.tprint("  --server: Show server object information");
        ns.tprint("  --player: Show player information");
        ns.tprint("  --all, -a: Show both server object information and player multipliers");
        return;
    }

    if (args.all || args.a) {
        args.server = true;
        args.player = true;
    }

    await collectServerInfo(ns, targetServer, args.server, args.player);
}
