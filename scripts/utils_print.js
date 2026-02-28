
//#region Print Colors

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

export function printWarn(ns, msg) {
    ns.print(`${Color.FgYellow}${msg}${Color.Reset}`);
    ns.tprint(`${Color.FgYellow}${msg}${Color.Reset}`);
}

export function printLogWarn(ns, msg) {
    ns.print(`${Color.FgYellow}${msg}${Color.Reset}`);
}

export function printInfo(ns, msg) {
    ns.print(`${Color.FgGreen}${msg}${Color.Reset}`);
    ns.tprint(`${Color.FgGreen}${msg}${Color.Reset}`);
}

export function printLogInfo(ns, msg) {
    ns.print(`${Color.FgGreen}${msg}${Color.Reset}`);
}

/** Prints message both to stdout and log file */
export function print(ns, msg) {
    ns.printf(msg);
    ns.tprint(msg);
}

//#endregion Print Colors

export function doConversion(value) {
    const quad = 1000000000000;
    const trillion = 1000000000;
    const billion = 1000000000;
    const million = 1000000;
    const thousand = 1000;

    if (value >= quad) {
        return `${(value / quad).toFixed(3)}q`
    }

    if (value >= trillion) {
        return `${(value / trillion).toFixed(3)}t`
    }

    if (value >= billion) {
        return `${(value / billion).toFixed(3)}b`
    }

    if (value >= million) {
        return `${(value / million).toFixed(3)}m`
    }
    if (value >= thousand) {
        return `${(value / thousand).toFixed(3)}k`
    }

    return value.toString();
}

/** 
 * Formats money 
 * 
 * @param {number} money
 * @return {string} formatted money
 */
export function formatMoney(money) {

    return "$" + doConversion(money);
}


export function formatTime(seconds) {
    if (seconds < 60) {
        return `${seconds.toFixed(2)}s`;
    }

    if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds.toFixed(2)}s`;
    }
    const hours = Math.floor(seconds / 3600);
    const remainingMinutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours}h ${remainingMinutes}m ${remainingSeconds.toFixed(2)}s`;
}