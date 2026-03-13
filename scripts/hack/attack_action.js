/**
 * Handles an attack action: Grow/Hack/Weaken
 */
export class AttackAction {
  /**
   * pid of the running script. 0 indicates there is no running script
   * @type {number}
   */
  pid = 0;

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
   * Server the script runs on
   * @type {string}
   */
  hostname;

  constructor(scriptName, scriptRam) {
    // Script to run
    this.scriptName = scriptName;
    this.scriptRam = scriptRam;
  }

  getRequiredRam() {
    return this.threads * this.scriptRam;
  }
}

export const EnumAttackActionResult = {
  NO_THREADS_NEEDED: "Action doesn't require threads",
  SCRIPT_RUN: "Script has been ran",
  NOT_ENOUGH_RAM: "Not enough RAM ro run the script",
};
