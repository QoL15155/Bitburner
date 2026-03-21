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
    const sep = `${c.FgBlue}════════════════════════════════════════════════════════════${c.Reset}`;
    const line = `${c.Dim}────────────────────────────────────────────────────────────${c.Reset}`;

    ns.print(sep);
    ns.print(
      `  ${c.Bold}${c.FgCyan}BATCH ATTACK DASHBOARD${c.Reset}. ${c.Dim}${c.FgGreenBright}Formulas?${c.Reset} ${this.useFormulas ? `${c.FgGreen}Yes` : `${c.FgRed}No`}${c.Reset}`,
    );
    ns.print(sep);

    // Current round info
    ns.print(
      `  ${c.FgWhite}Current Round:${c.Reset}            ${c.FgGreen}${this.rounds}${c.Reset}`,
    );
    ns.print(
      `  ${c.FgWhite}Attacked (now):${c.Reset}           ${c.FgGreen}${attackedServers}${c.Reset}`,
    );
    ns.print(
      `  ${c.FgWhite}Threads  (now):${c.Reset}           ${c.FgGreen}${totalThreads}${c.Reset}`,
    );
    ns.print(
      `  ${c.FgWhite}Sleep    (with delay):${c.Reset}    ${c.FgGreen}${formatTime(sleepTime)}${c.Reset}`,
    );
    ns.print(line);

    // Attack stats
    ns.print(`  ${c.FgCyanBright}ATTACKS${c.Reset}`);
    ns.print(
      `    ${c.FgWhite}Total:${c.Reset}          ${c.FgGreen}${this.totalAttackPerRound}${c.Reset}`,
    );
    ns.print(
      `    ${c.FgWhite}Avg/round:${c.Reset}      ${c.FgGreen}${this.getAverageAttacksPerRound().toFixed(2)}${c.Reset}`,
    );
    ns.print(line);

    // Thread stats
    ns.print(`  ${c.FgYellow}THREADS${c.Reset}`);
    ns.print(
      `    ${c.FgWhite}Avg/round:${c.Reset}      ${c.FgGreen}${this.getAverageThreadsPerRound().toFixed(2)}${c.Reset}`,
    );
    ns.print(
      `    ${c.FgWhite}Max/round:${c.Reset}      ${c.FgGreen}${this.maxThreadsPerRound}${c.Reset}`,
    );
    ns.print(
      `    ${c.FgWhite}Min/round:${c.Reset}      ${c.FgGreen}${this.minThreadsPerRound}${c.Reset}`,
    );
    ns.print(line);

    // Sleep time stats
    ns.print(`  ${c.FgMagenta}SLEEP TIME${c.Reset}`);
    ns.print(
      `    ${c.FgWhite}Total:${c.Reset}          ${c.FgGreen}${formatTime(this.totalSleepTime)}${c.Reset}`,
    );
    ns.print(
      `    ${c.FgWhite}Avg/round:${c.Reset}      ${c.FgGreen}${formatTime(this.getAverageSleepTime())}${c.Reset}`,
    );
    ns.print(
      `    ${c.FgWhite}Max/round:${c.Reset}      ${c.FgGreen}${formatTime(this.maxSleepTime)}${c.Reset}`,
    );
    ns.print(
      `    ${c.FgWhite}Min/round:${c.Reset}      ${c.FgGreen}${formatTime(this.minSleepTime)}${c.Reset}`,
    );
    ns.print(line);

    // Error messages from last round
    ns.print(
      `  ${c.Bold}${c.FgRedBright}ERRORS (last ${AttackMeasurements.maxErrorMessages})${c.Reset}  ${c.FgWhite}Total:${c.Reset} ${c.FgRed}${this.numberOfErrors}${c.Reset}`,
    );
    const currentErrors = this.lastErrors.length;
    for (let i = 0; i < AttackMeasurements.maxErrorMessages; i++) {
      let err = "";
      if (i < currentErrors) err = this.lastErrors[currentErrors - 1 - i];
      ns.print(`    ${c.FgRed}• ${err}${c.Reset}`);
    }
    ns.print(sep);
  }
}
