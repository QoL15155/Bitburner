import { Color } from "/utils/print.js";
import { formatTime } from "/utils/formatters.js";

export class AttackMeasurements {
  static maxErrorMessages = 5;

  constructor(isFormulas) {
    this.rounds = 0;
    this.totalAttackPerRound = 0;
    this.useFormulas = isFormulas;

    // Threads
    this.totalThreadsPerRound = 0;
    this.maxThreadsPerRound = 0;
    this.minThreadsPerRound = 0;

    // Sleep time
    this.totalSleepTime = 0;
    this.maxSleepTime = 0;
    this.minSleepTime = 0;

    // Error messages
    this.numberOfErrors = 0;
    /**
     * Contains the last @var {AttackMeasurements.errorMessagesToKeep}
     * error messages from the most recent attack round.
     * @type {Array<string>} */
    this.lastErrors = [];
  }

  /**
   * Adds a new attack round's measurements to the dashboard.
   *
   * @param {number} attacks - number of servers attacked this round
   * @param {number} threads - total threads used this round
   * @param {number} delayTime - sleep time this round (ms)`
   * @param {Array<string>} errorMessages - error messages for this round
   */
  addRound(attacks, threads, delayTime = 0, errorMessages = []) {
    this.rounds += 1;
    this.totalAttackPerRound += attacks;

    // Threads
    this.totalThreadsPerRound += threads;
    if (threads > this.maxThreadsPerRound) {
      this.maxThreadsPerRound = threads;
    }
    if (threads < this.minThreadsPerRound || this.minThreadsPerRound === 0) {
      this.minThreadsPerRound = threads;
    }

    // Sleep time
    this.totalSleepTime += delayTime;
    if (delayTime > this.maxSleepTime) {
      this.maxSleepTime = delayTime;
    }
    if (delayTime < this.minSleepTime || this.minSleepTime === 0) {
      this.minSleepTime = delayTime;
    }

    // Error messages
    this.numberOfErrors += errorMessages.length;
    this.addErrorMessages(errorMessages);
  }

  getAverageThreadsPerRound() {
    return this.totalThreadsPerRound / this.rounds;
  }

  getAverageAttacksPerRound() {
    return this.totalAttackPerRound / this.rounds;
  }

  getAverageSleepTime() {
    return this.totalSleepTime / this.rounds;
  }

  addErrorMessages(messages) {
    this.lastErrors.push(...messages);
    // Keep only the most recent error messages
    if (this.lastErrors.length > AttackMeasurements.maxErrorMessages) {
      const excess =
        this.lastErrors.length - AttackMeasurements.maxErrorMessages;
      this.lastErrors.splice(0, excess);
    }
  }

  /**
   * Renders attack measurements as a formatted dashboard in the tail window.
   *
   * @param {NS} ns
   * @param {number} attackedServers - servers attacked this round
   * @param {number} totalThreads - threads used this round
   * @param {number} sleepTime - sleep time this round (ms)
   */
  display(ns, attackedServers, totalThreads, sleepTime) {
    ns.clearLog();
    const c = Color;

    const frameWidth = 80;
    const top = `${c.FgCyan}╔${"═".repeat(frameWidth)}╗${c.Reset}`;
    const bot = `${c.FgCyan}╚${"═".repeat(frameWidth)}╝${c.Reset}`;
    const mid = `${c.FgCyan}╠${"═".repeat(frameWidth)}╣${c.Reset}`;
    const line = `${c.FgCyan}╟${c.Dim}${"─".repeat(frameWidth)}${c.Reset}${c.FgCyan}╢${c.Reset}`;
    const w = `${c.FgCyan}║${c.Reset}`;

    // Title
    const formulaTag = this.useFormulas
      ? `${c.FgGreenBright}● ON${c.Reset}`
      : `${c.FgRedBright}○ OFF${c.Reset}`;
    ns.print(top);
    ns.print(
      `${w}  ${c.Bold}${c.FgWhiteBright}⚡ BATCH ATTACK DASHBOARD${c.Reset}          ${c.Dim}Formulas${c.Reset} ${formulaTag}`,
    );
    ns.print(mid);

    // Current round
    ns.print(
      `${w}  ${c.Bold}${c.FgCyanBright}◈ ROUND ${c.FgWhiteBright}#${this.rounds}${c.Reset}`,
    );
    ns.print(
      `${w}    ${c.FgWhite}Attacked${c.Reset}   ${c.FgGreenBright}${attackedServers}${c.Reset}`,
    );
    ns.print(
      `${w}    ${c.FgWhite}Threads${c.Reset}    ${c.FgGreenBright}${totalThreads}${c.Reset}`,
    );
    ns.print(
      `${w}    ${c.FgWhite}Sleep${c.Reset}      ${c.FgGreenBright}${formatTime(sleepTime)}${c.Reset}`,
    );
    ns.print(line);

    // Attack stats
    ns.print(`${w}  ${c.Bold}${c.FgBlueBright}⚔ ATTACKS${c.Reset}`);
    ns.print(
      `${w}    ${c.FgWhite}Total${c.Reset}      ${c.FgYellowBright}${this.totalAttackPerRound}${c.Reset}`,
    );
    ns.print(
      `${w}    ${c.FgWhite}Avg/round${c.Reset}  ${c.FgYellowBright}${this.getAverageAttacksPerRound().toFixed(2)}${c.Reset}`,
    );
    ns.print(line);

    // Thread stats
    ns.print(`${w}  ${c.Bold}${c.FgYellowBright}⚙ THREADS${c.Reset}`);
    ns.print(
      `${w}    ${c.FgWhite}Avg/round${c.Reset}  ${c.FgCyanBright}${this.getAverageThreadsPerRound().toFixed(2)}${c.Reset}`,
    );
    ns.print(
      `${w}    ${c.FgWhite}Max${c.Reset}        ${c.FgGreenBright}${this.maxThreadsPerRound}${c.Reset}`,
    );
    ns.print(
      `${w}    ${c.FgWhite}Min${c.Reset}        ${c.FgRedBright}${this.minThreadsPerRound}${c.Reset}`,
    );
    ns.print(line);

    // Sleep time stats
    ns.print(`${w}  ${c.Bold}${c.FgMagentaBright}⏱ SLEEP TIME${c.Reset}`);
    ns.print(
      `${w}    ${c.FgWhite}Total${c.Reset}      ${c.FgMagenta}${formatTime(this.totalSleepTime)}${c.Reset}`,
    );
    ns.print(
      `${w}    ${c.FgWhite}Avg/round${c.Reset}  ${c.FgMagenta}${formatTime(this.getAverageSleepTime())}${c.Reset}`,
    );
    ns.print(
      `${w}    ${c.FgWhite}Max${c.Reset}        ${c.FgGreenBright}${formatTime(this.maxSleepTime)}${c.Reset}`,
    );
    ns.print(
      `${w}    ${c.FgWhite}Min${c.Reset}        ${c.FgRedBright}${formatTime(this.minSleepTime)}${c.Reset}`,
    );
    ns.print(line);

    // Error messages
    const errCount =
      this.numberOfErrors > 0
        ? `${c.FgRedBright}${this.numberOfErrors}${c.Reset}`
        : `${c.FgGreen}${this.numberOfErrors}${c.Reset}`;
    ns.print(
      `${w}  ${c.Bold}${c.FgRedBright}⚠ ERRORS${c.Reset} ${c.Dim}(last ${AttackMeasurements.maxErrorMessages})${c.Reset}                  ${c.FgWhite}Total:${c.Reset} ${errCount}`,
    );
    const currentErrors = this.lastErrors.length;
    for (let i = 0; i < AttackMeasurements.maxErrorMessages; i++) {
      let err = "";
      if (i < currentErrors) err = this.lastErrors[currentErrors - 1 - i];
      const bullet = err
        ? `${c.FgRed}▸ ${err}${c.Reset}`
        : `${c.Dim}▸${c.Reset}`;
      ns.print(`${w}    ${bullet}`);
    }
    ns.print(bot);
  }
}
