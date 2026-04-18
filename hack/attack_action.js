import { formatRam } from "/utils/formatters.js";

/**
 * Handles an attack action: Grow/Hack/Weaken
 */
export class AttackAction {
  /**
   * Number of threads required to run the action
   * @type {number}
   */
  threads = 0;
  /**
   * Time it would take to run the action
   * @type {number}
   */
  time = 0;

  /**
   * Number of CPU cores on the attacking server.
   * @type {number}
   */
  cpuCores = 0;

  /**
   * pid of the running script. 0 indicates there is no running script
   * @type {number}
   */
  pid = 0;
  /**
   * Server the script runs on
   * @type {string}
   */
  hostname;

  constructor(scriptName, scriptRam) {
    // Script to run
    this.scriptName = scriptName;
    this.scriptRam = scriptRam;
  }

  /** Resets the action parameters
   * Should only be called once the action is completed, and scripts finished running.
   */
  reset() {
    this.threads = 0;
    this.time = 0;
    this.cpuCores = 0;

    // Specified when the script is running.
    this.hostname = undefined;
    this.pid = 0;
  }

  isSet() {
    return this.pid !== 0;
  }

  /** Initialize action parameters */
  initAction(threads, time, cpuCores = 0) {
    this.threads = threads;
    this.time = time;
    this.cpuCores = cpuCores;
  }

  /** Called once the action is running */
  setAction(hostname, pid) {
    this.hostname = hostname;
    this.pid = pid;
  }

  getRequiredRam() {
    return this.threads * this.scriptRam;
  }

  toString() {
    const ram = formatRam(this.getRequiredRam());
    const time = `${this.time.toFixed(3)}ms`;
    let message = `script: ${this.scriptName}, threads: ${this.threads}, RAM: ${ram}, cpuCores: ${this.cpuCores}, time: ${time}`;

    if (this.isSet()) {
      message += `, hostname: ${this.hostname}, pid: ${this.pid}`;
    }
    return `AttackAction(${message})`;
  }
}
