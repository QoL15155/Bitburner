import { AttackAction } from "/hack/attack_action.js";
import { formatTime } from "/utils/formatters.js";

// TODO: turn into IsInitialState
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

  setAttackDuration(threads, duration) {
    if (threads === 0) return;

    if (this.#attackDuration < duration) {
      this.#attackDuration = duration;
    }
  }

  reset() {
    this.#endTime = 0;
    this.#attackDuration = 0;

    this.#hackAction.reset();
    this.#growAction.reset();
    this.#weakenAction.reset();
  }

  //#region Update Action

  updateHackAction(threads, time) {
    this.#hackAction.initAction(threads, time);
    this.setAttackDuration(threads, time);
    return this.#hackAction;
  }

  updateGrowAction(threads, time, cpuCores) {
    this.#growAction.initAction(threads, time, cpuCores);
    this.setAttackDuration(threads, time);
    return this.#growAction;
  }

  updateWeakenAction(threads, time, cpuCores) {
    this.#weakenAction.initAction(threads, time, cpuCores);
    this.setAttackDuration(threads, time);
    return this.#weakenAction;
  }

  //#endregion Update Action

  toString() {
    let description = `Attack Batch. Target Server: ${this.targetName}, duration: ${formatTime(this.#attackDuration)}`;

    if (this.#hackAction.threads !== 0)
      description += `\n\t${this.#hackAction.toString()}`;
    if (this.#growAction.threads !== 0)
      description += `\n\t${this.#growAction.toString()}`;
    if (this.#weakenAction.threads !== 0)
      description += `\n\t${this.#weakenAction.toString()}`;

    return description;
  }

  getState() {
    return this.#state;
  }

  /** @returns {Array<AttackAction>} */
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
