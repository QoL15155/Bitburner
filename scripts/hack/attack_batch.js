import { AttackResult } from "./attack_result.js";
import { AttackAction } from "/hack/attack_action.js";
import {
  calculateServerExecutionTimes,
  canAttackFromServer,
  getGrowSecurityIncrease,
  getGrowThreads,
  getWeakenThreads,
  processHack,
  runAttackAction,
} from "/hack/utils.js";
import { formatTime } from "/utils/formatters.js";

// The necessary delay between script execution times may range between 20ms and 200ms
// Depends on the computer's performance
export const delayIncrease = 200;

function getStrAttackFail(targetName, attackAction) {
  return `Failed to find server to attack ${targetName}. ${attackAction.toString()}`;
}

/**
 * Batch attack plan for a specific target server
 */
export class AttackBatch {
  // Attack Actions for the batch
  /** @type {AttackAction} */
  #hackAction;
  /** @type {AttackAction} */
  #growAction;
  /** @type {AttackAction} */
  #weakenAction;

  /** Error messages collected during the attack
   * @type {Array<string>} */
  errorMessages = [];

  /**
   * Time to perform the attack / sleep between batched
   * @type {number}
   */
  #attackDuration = 0;
  /**
   * End time for the attack
   * @type {number} */
  #endTime = 0;

  /** First run of the batch (turns false once it is executed for the first time)
   * @type {boolean} */
  #isFirstRun = true;

  /**
   * @param {NS} ns
   * @param {FileLogger} logger
   * @param {Object} distributionScripts : RAM and script name for the attack scripts
   * @param {Array<MyServer>} attackingServers : servers that can be used to run attack scripts
   * @param {boolean} useFormulas : whether to use formulas for calculations
   * @param {string} targetName : server to attack
   */
  constructor(
    ns,
    logger,
    distributionScripts,
    attackingServers,
    useFormulas,
    targetName,
  ) {
    // Constants
    this.ns = ns;
    this.logger = logger;
    this.useFormulas = useFormulas;
    this.attackingServers = attackingServers;

    /** @const {string} */
    this.targetName = targetName;
    this.#isFirstRun = true;

    // Attack Actions
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

    this.reset();
  }

  get isFirstRun() {
    return this.#isFirstRun;
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
    this.errorMessages = [];

    this.#hackAction.reset();
    this.#growAction.reset();
    this.#weakenAction.reset();
  }

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
    this.#isFirstRun = false;
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

  //#region Attack

  /** @returns {AttackResult} */
  doAttack() {
    const fname = "AttackBatch.doAttack";

    // First reset the parameters
    this.logger.info(fname, `Attacking ${this.targetName}`);

    const targetObject = this.ns.getServer(this.targetName);
    // FIXME: do we need ALL execution times here? we only need weaken
    const executionTimes = calculateServerExecutionTimes(
      this.ns,
      this.targetName,
    );

    if (!this.doHackAttack(targetObject, executionTimes.hackTime)) {
      return false;
    }

    if (!this.doGrowAttack(targetObject, executionTimes.growTime)) {
      return false;
    }

    if (!this.doWeakenAttack(targetObject, executionTimes.weakenTime)) {
      return false;
    }

    return true;
  }

  doHackAttack(targetObject, executionTime) {
    const fname = "AttackBatch.doHackAttack";
    if (this.isFirstRun) {
      // Prep phase - make sure the server is at min difficulty before the first hack attack.
      return true;
    }

    const hackingThreads = processHack(this.ns, targetObject);
    if (hackingThreads === 0) {
      return true;
    }

    this.#hackAction.initAction(hackingThreads, executionTime);
    this.setAttackDuration(hackingThreads, executionTime);

    for (const serverName of this.attackingServers) {
      const serverObject = this.ns.getServer(serverName);
      if (!canAttackFromServer(serverObject, this.#hackAction)) {
        continue;
      }
      runAttackAction(this.ns, serverName, this.targetName, this.#hackAction);
      return true;
    }

    const message = getStrAttackFail(this.targetName, this.#hackAction);
    this.errorMessages.push(message);
    this.logger.error(fname, message);
    return false;
  }

  doGrowAttack(targetObject, executionTime) {
    const fname = "AttackBatch.doGrowAttack";

    let cpuCores = -1;
    let threads = null;
    for (const serverName of this.attackingServers) {
      const serverObject = this.ns.getServer(serverName);

      // Calculate threads based on the server's CPU cores.
      if (cpuCores !== serverObject.cpuCores) {
        // Only calculate threads if cpu cores changed.
        cpuCores = serverObject.cpuCores;
        threads = getGrowThreads(
          this.ns,
          cpuCores,
          targetObject,
          this.useFormulas,
        );
        if (threads === 0) {
          return true;
        }
      }

      // Update the action
      this.#growAction.initAction(threads, executionTime, cpuCores);
      this.setAttackDuration(threads, executionTime);

      if (!canAttackFromServer(serverObject, this.#growAction)) {
        continue;
      }
      runAttackAction(this.ns, serverName, this.targetName, this.#growAction);
      targetObject.moneyAvailable = targetObject.moneyMax;
      targetObject.hackDifficulty += getGrowSecurityIncrease(threads);
      return true;
    }

    const message = getStrAttackFail(this.targetName, this.#growAction);
    this.errorMessages.push(message);
    this.logger.error(fname, message);
    return false;
  }

  doWeakenAttack(targetObject, executionTime) {
    const fname = "AttackBatch.doWeakenAttack";

    let cpuCores = -1;
    let threads = null;
    for (const serverName of this.attackingServers) {
      const serverObject = this.ns.getServer(serverName);

      // Calculate threads based on the server's CPU cores.
      if (cpuCores !== serverObject.cpuCores) {
        // Only calculate threads if cpu cores changed.
        cpuCores = serverObject.cpuCores;
        threads = getWeakenThreads(cpuCores, targetObject);
        if (threads === 0) {
          return true;
        }
      }

      // Update the action
      this.#weakenAction.initAction(threads, executionTime, cpuCores);
      this.setAttackDuration(threads, executionTime);

      if (!canAttackFromServer(serverObject, this.#weakenAction)) {
        continue;
      }
      runAttackAction(this.ns, serverName, this.targetName, this.#weakenAction);
      targetObject.hackDifficulty = targetObject.minDifficulty;
      return true;
    }

    const message = getStrAttackFail(this.targetName, this.#weakenAction);
    this.errorMessages.push(message);
    this.logger.error(fname, message);
    return false;
  }

  //#endregion Attack
}
