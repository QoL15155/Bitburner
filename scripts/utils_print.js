
const Color = {
    Reset: "\x1b[0m",
    Bright: "\x1b[1m",
    Dim: "\x1b[2m",
    Underscore: "\x1b[4m",
    Blink: "\x1b[5m",
    Reverse: "\x1b[7m",
    Hidden: "\x1b[8m",

    FgBlack: "\x1b[30m",
    FgRed: "\x1b[31m",
    FgGreen: "\x1b[32m",
    FgYellow: "\x1b[33m",
    FgBlue: "\x1b[34m",
    FgMagenta: "\x1b[35m",
    FgCyan: "\x1b[36m",
    FgWhite: "\x1b[37m",

    BgBlack: "\x1b[40m",
    BgRed: "\x1b[41m",
    BgGreen: "\x1b[42m",
    BgYellow: "\x1b[43m",
    BgBlue: "\x1b[44m",
    BgMagenta: "\x1b[45m",
    BgCyan: "\x1b[46m",
    BgWhite: "\x1b[47m"
};

export function printError(ns, msg) {
    ns.print(`${Color.FgRed}${msg}${Color.Reset}`);
    ns.tprint(`${Color.FgRed}${msg}${Color.Reset}`);
    // ns.tail();
}

export function printInfo(ns, msg) {
    ns.print(`${Color.FgGreen}${msg}${Color.Reset}`);
    ns.tprint(`${Color.FgGreen}${msg}${Color.Reset}`);
}

/** Prints message both to stdout and log file */
export function print(ns, msg) {
    ns.printf(msg);
    ns.tprint(msg);
}


/** 
 * Formats money 
 * 
 * @param {number} money
 * @return {string} formatted money
 */
export function formatMoney(money) {
    const quad = 1000000000000;
    const trillion = 1000000000;
    const billion = 1000000000;
    const million = 1000000;
    const thousand = 1000;

    if (money >= quad) {
        return `$${(money / quad).toFixed(3)}q`
    }

    if (money >= trillion) {
        return `$${(money / trillion).toFixed(3)}t`
    }

    if (money >= billion) {
        return `$${(money / billion).toFixed(3)}b`
    }

    if (money >= million) {
        return `$${(money / million).toFixed(3)}m`
    }
    if (money >= thousand) {
        return `$${(money / thousand).toFixed(3)}k`
    }

    return "$" + money;
}