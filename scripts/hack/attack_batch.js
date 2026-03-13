import { AttackAction } from "/hack/attack_action";
import { formatTime } from "/utils/formatters";
import { printLogInfo } from "/utils/print";

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
  #attackDuration;
  /**
   * End time for the attack
   * @type {number} */
  #endTime;

  /** @type {BatchState} */
  #state = BatchState.INIT;

  /**
   * Required RAM to run the batch scripts
   *      0 if not calculated yet (required RAM must be > 0)
   * @type {number}
   */
  #requiredRam = 0;

  /**
   * @param {NS} ns
   * @param {number} cpuCores : on the attacking server
   * @param {string} targetName : server to attack
   */
  constructor(ns, cpuCores, targetName, distributionScripts) {
    this.ns = ns;
    this.cpuCores = cpuCores;
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

    // TODO: probably don't need to re-initialize here.
    this.#state = BatchState.INIT;

    this.#endTime = 0;
  }

  setPrepActions(growThreads, weakenThreads, executionTimes) {
    if (this.#state != BatchState.INIT) {
      throw "Already initialized";
    }

    this.#hackAction.threads = 0;
    this.#growAction.threads = growThreads;
    this.#weakenAction.threads = weakenThreads;

    this.#hackAction.time = 0;
    this.#growAction.time = executionTimes.grow;
    this.#weakenAction.time = executionTimes.weaken;

    // We assume here that at least one of those params are not 0
    if (weakenThreads == 0) this.#attackDuration = growThreads;
    else this.#attackDuration = weakenThreads;

    // TODO: set required ram
    this.#requiredRam = 0;
    this.#state = BatchState.PREP_PARAMS;

    this.#endTime = 0;
  }

  setAttackActions(hackThreads, growThreads, weakenThreads, executionTimes) {
    // if (this.#state != BatchState.INIT &&  // Server can come prepped.
    //     this.#state != BatchState.PREP_PARAMS) {
    //     throw "Already in got attack parameters";
    // }

    this.#hackAction.threads = hackThreads;
    this.#growAction.threads = growThreads;
    this.#weakenAction.threads = weakenThreads;

    this.#hackAction.time = executionTimes.hack;
    this.#growAction.time = executionTimes.grow;
    this.#weakenAction.time = executionTimes.weaken;

    this.#attackDuration = executionTimes.weaken;
    // TODO: set required ram
    this.#requiredRam = 0;
    this.#state = BatchState.ATTACK_PARAMS;
    this.#endTime = 0;
  }

  toString() {
    let description = `Attack Batch. Target Server: ${this.targetName}, cores:${this.cpuCores}, duration: ${formatTime(this.#attackDuration)}\n\t`;
    if (this.#hackAction && this.#hackAction.threads != 0)
      description += `Hacking: ${this.#hackAction.threads} threads. `;

    if (this.#growAction && this.#growAction.threads != 0)
      description += `Grow: ${this.#growAction.threads} threads. `;
    if (this.#weakenAction && this.#weakenAction.threads != 0)
      description += `Weaken: ${this.#weakenAction.threads} threads.`;

    return description;
  }

  getRequiredRam() {
    const fname = "getRequiredRam";
    if (this.#requiredRam > 0) {
      // Already calculated
      return this.#requiredRam;
    }

    this.#requiredRam = 0;
    if (this.#hackAction) {
      this.#requiredRam += this.#hackAction.getRequiredRam();
    }

    if (this.#growAction) {
      this.#requiredRam += this.#growAction.getRequiredRam();
    }

    if (this.#weakenAction)
      this.#requiredRam += this.#weakenAction.getRequiredRam();

    if (this.#requiredRam <= 0) throw `[${fname}] No action has been specified`;

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
  }

  getAttackDuration() {
    return this.#attackDuration;
  }

  getDelayForNextAttack() {
    if (this.#endTime == 0) return 0;

    const now = Date.now() - delayIncrease;
    if (this.#endTime > now) {
      return this.#endTime - now;
    }

    return 0;
  }
}
