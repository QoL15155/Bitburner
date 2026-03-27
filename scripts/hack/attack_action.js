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

  reset() {
    this.threads = 0;
    this.time = 0;
    this.hostname = undefined;
    this.pid = 0;
  }

  getRequiredRam() {
    return this.threads * this.scriptRam;
  }
}
