//#region Print Colors

export const Color = {
  Reset: "\x1b[0m",
  Bold: "\x1b[1m",
  Dim: "\x1b[2m",
  Italic: "\x1b[3m",
  Underscore: "\x1b[4m",
  Blink: "\x1b[5m",
  Reverse: "\x1b[7m",
  Hidden: "\x1b[8m",
  Strikethrough: "\x1b[9m",

  // Foreground colors
  FgBlack: "\x1b[0;30m",
  FgRed: "\x1b[0;31m",
  FgGreen: "\x1b[0;32m",
  FgYellow: "\x1b[0;33m",
  FgBlue: "\x1b[0;34m",
  FgMagenta: "\x1b[0;35m",
  FgCyan: "\x1b[0;36m",
  FgWhite: "\x1b[0;37m",

  FgGray: "\x1b[1;30m",
  FgRedBright: "\x1b[1;31m",
  FgGreenBright: "\x1b[1;32m",
  FgYellowBright: "\x1b[1;33m",
  FgBlueBright: "\x1b[1;34m",
  FgMagentaBright: "\x1b[1;35m",
  FgCyanBright: "\x1b[1;36m",
  FgWhiteBright: "\x1b[1;37m",

  // Background colors
  BgBlack: "\x1b[0;40m",
  BgRed: "\x1b[0;41m",
  BgGreen: "\x1b[0;42m",
  BgYellow: "\x1b[0;43m",
  BgBlue: "\x1b[0;44m",
  BgMagenta: "\x1b[0;45m",
  BgCyan: "\x1b[0;46m",
  BgWhite: "\x1b[0;47m",
};

export function toGreen(msg) {
  return `${Color.FgGreen}${msg}${Color.Reset}`;
}

export function toRed(msg) {
  return `${Color.FgRed}${msg}${Color.Reset}`;
}

export function printError(ns, msg) {
  ns.print(`${Color.FgRed}${msg}${Color.Reset}`);
  ns.tprint(`${Color.FgRed}${msg}${Color.Reset}`);
}

export function printLogError(ns, msg) {
  ns.print(`${Color.FgRed}${msg}${Color.Reset}`);
}

export function printWarn(ns, msg) {
  ns.print(`${Color.FgYellow}${msg}${Color.Reset}`);
  ns.tprint(`${Color.FgYellow}${msg}${Color.Reset}`);
}

export function printLogWarn(ns, msg) {
  ns.print(`${Color.FgYellow}${msg}${Color.Reset}`);
}

export function printInfo(ns, msg) {
  ns.print(toGreen(msg));
  ns.tprint(toGreen(msg));
}

export function printLogInfo(ns, msg) {
  ns.print(toGreen(msg));
}

/** Prints message both to stdout and log file */
export function print(ns, msg) {
  ns.printf(msg);
  ns.tprint(msg);
}

function getFormattedCurrentTime() {
  const dateObj = new Date();

  // To make sure the hour always has 2-character-format
  let hour = dateObj.getHours();
  hour = ("0" + hour).slice(-2);

  // To make sure the minute always has 2-character-format
  let minute = dateObj.getMinutes();
  minute = ("0" + minute).slice(-2);

  // To make sure the second always has 2-character-format
  let second = dateObj.getSeconds();
  second = ("0" + second).slice(-2);

  return `${hour}:${minute}:${second}`;
}

//#endregion Print Colors
