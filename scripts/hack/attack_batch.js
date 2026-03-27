import { AttackAction } from "/hack/attack_action.js";
import { formatTime } from "/utils/formatters.js";

export const BatchState = {
  INIT: 0,
  PREP_PARAMS: 1,
  ATTACK_PARAMS: 2,
};

// The necessary delay between script execution times may range between 20ms and 200ms
// Depends on the computer's performance
export const delayIncrease = 200;

/**
 * Batch attack plan for a specific server
 */
export class AttackBatch {
  /** @type {AttackAction} */
  #hackAction;
  /** @type {AttackAction} */
  #growAction;
  /** @type {AttackAction} */
  #weakenAction;

  /**
   * Time to perform the attack / sleep between batched
   * @type {number}
   */
  #attackDuration = 0;
  /**
   * End time for the attack
   * @type {number} */
  #endTime = 0;

  /** @type {BatchState} */
  #state = BatchState.INIT;

  /**
   * CPU cores available on the attacking server
   * @type {number}
   */
  cpuCores = 0;

  /**
   * Required RAM to run the batch scripts
   * @type {number}
   */
  #requiredRam = 0;

  /**
   * @param {string} targetName : server to attack
   * @param {Object} distributionScripts : RAM and script name for the attack scripts
   */
  constructor(targetName, distributionScripts) {
    this.targetName = targetName;

    this.#hackAction = new AttackAction(
      distributionScripts.hackScript.targetScript,
      distributionScripts.hackScript.ram,
    );
    this.#growAction = new AttackAction(
      distributionScripts.growScript.targetScript,
      distributionScripts.growScript.ram,
    );
    this.#weakenAction = new AttackAction(
      distributionScripts.weakenScript.targetScript,
      distributionScripts.weakenScript.ram,
    );
  }

  reset() {
    this.#endTime = 0;
    this.#attackDuration = 0;
    this.#requiredRam = 0;
    this.cpuCores = 0;

    this.#hackAction.reset();
    this.#growAction.reset();
    this.#weakenAction.reset();
  }

  setPrepActions(cpuCores, growThreads, weakenThreads, executionTimes) {
    if (this.#state !== BatchState.INIT) {
      throw new Error("Attack Batch is already initialized.");
    }

    this.cpuCores = cpuCores;

    this.#hackAction.threads = 0;
    this.#growAction.threads = growThreads;
    this.#weakenAction.threads = weakenThreads;

    this.#hackAction.time = 0;
    this.#growAction.time = executionTimes.growTime;
    this.#weakenAction.time = executionTimes.weakenTime;

    this.#attackDuration = executionTimes.weakenTime;

    this.#setRequiredRam();
    this.#endTime = 0;
  }

  setAttackActions(
    cpuCores,
    hackThreads,
    growThreads,
    weakenThreads,
    executionTimes,
  ) {
    this.cpuCores = cpuCores;

    this.#hackAction.threads = hackThreads;
    this.#growAction.threads = growThreads;
    this.#weakenAction.threads = weakenThreads;

    this.#hackAction.time = executionTimes.hackTime;
    this.#growAction.time = executionTimes.growTime;
    this.#weakenAction.time = executionTimes.weakenTime;

    this.#attackDuration = executionTimes.weakenTime;

    this.#setRequiredRam();
    this.#endTime = 0;
  }

  toString() {
    let description = `Attack Batch. Target Server: ${this.targetName}, cores:${this.cpuCores}, duration: ${formatTime(this.#attackDuration)}\n\t`;

    if (this.#hackAction.threads !== 0)
      description += `Hacking: ${this.#hackAction.threads} threads. `;
    if (this.#growAction.threads !== 0)
      description += `Grow: ${this.#growAction.threads} threads. `;
    if (this.#weakenAction.threads !== 0)
      description += `Weaken: ${this.#weakenAction.threads} threads.`;

    return description;
  }

  #setRequiredRam() {
    this.#requiredRam = 0;

    this.#requiredRam += this.#hackAction.getRequiredRam();
    this.#requiredRam += this.#growAction.getRequiredRam();
    this.#requiredRam += this.#weakenAction.getRequiredRam();
  }

  getRequiredRam() {
    const fname = "getRequiredRam";
    if (this.#requiredRam <= 0) {
      throw new Error(
        `[${fname}] Required RAM is set to ${this.#requiredRam}. Check if the attack actions have been properly initialized.`,
      );
    }
    return this.#requiredRam;
  }

  getState() {
    return this.#state;
  }

  getActions() {
    let result = [];
    if (this.#weakenAction.threads > 0) result.push(this.#weakenAction);
    if (this.#growAction.threads > 0) result.push(this.#growAction);
    if (this.#hackAction.threads > 0) result.push(this.#hackAction);

    return result;
  }

  setEndTime() {
    this.#endTime = Date.now() + this.#attackDuration;

    // Advance state
    if (this.#state === BatchState.INIT) {
      this.#state = BatchState.PREP_PARAMS;
    } else if (this.#state === BatchState.PREP_PARAMS) {
      this.#state = BatchState.ATTACK_PARAMS;
    }
  }

  getAttackDuration() {
    return this.#attackDuration + delayIncrease;
  }

  getDelayForNextAttack() {
    if (this.#endTime === 0) return 0;

    const now = Date.now();
    const endTime = this.#endTime + delayIncrease;
    if (endTime > now) {
      return endTime - now;
    }

    return 0;
  }

  /** Total threads for all actions */
  getTotalThreads() {
    return (
      this.#hackAction.threads +
      this.#growAction.threads +
      this.#weakenAction.threads
    );
  }
}
