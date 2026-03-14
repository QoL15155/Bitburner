import { AttackAction } from "/hack/attack_action.js";
import { formatTime } from "/utils/formatters.js";

export const BatchState = {
  INIT: 0,
  PREP_PARAMS: 1,
  ATTACK_PARAMS: 2,
};

// the necessary delay between script execution times may range between 20ms and 200ms
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
      distributionScripts.hack.targetScript,
      distributionScripts.hack.ram,
    );
    this.#growAction = new AttackAction(
      distributionScripts.grow.targetScript,
      distributionScripts.grow.ram,
    );
    this.#weakenAction = new AttackAction(
      distributionScripts.weaken.targetScript,
      distributionScripts.weaken.ram,
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
      throw "Already initialized";
    }

    this.cpuCores = cpuCores;

    this.#hackAction.threads = 0;
    this.#growAction.threads = growThreads;
    this.#weakenAction.threads = weakenThreads;

    this.#hackAction.time = 0;
    this.#growAction.time = executionTimes.grow;
    this.#weakenAction.time = executionTimes.weaken;

    this.#attackDuration = executionTimes.weaken;

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

    this.#hackAction.time = executionTimes.hack;
    this.#growAction.time = executionTimes.grow;
    this.#weakenAction.time = executionTimes.weaken;

    this.#attackDuration = executionTimes.weaken;

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
      throw `[${fname}] No action has been specified`;
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
}
