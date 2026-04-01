import { printLogInfo } from "/utils/print.js";
import {
  GangFocus,
  getGangEthicalTask,
  getGangTrainingTask,
} from "./manage.js";

export class MyGang {
  /** @const {NS} */
  #ns = null;

  /**
   * Determines the gang's focus (hacking vs combat) when done recruiting members.
   * @const {GangFocus}
   */
  #gangType = null;
  /** @const {string} */
  #defaultTrainingTask = null;
  /** @const {string} */
  #defaultEthicalTask = null;

  #focus = GangFocus.RECRUITING;

  /** False when maximum number of members has been recruited */
  #isRecruiting = true;
  /** Don't ascend members while waiting to recruit the next member */
  #shouldWaitAscend = false;
  /**
   * True when all members are assigned to the best tasks for the current focus
   * Saves performance by not trying to optimize task assignments
   */
  isFocusOptimized = false;
  checkFocus = true;

  // Members
  /** @type {string[]} */
  #gangMemberNames = null;
  /** @type {string[]} */
  #membersTraining = [];
  /** @type {string[]} */
  #membersEthical = [];
  /** @type {string[]} */
  #membersWorking = [];

  /**
   * @param {NS} ns
   * @param {string[]} gangMemberNames
   * @param {boolean} isHackingGang
   */
  constructor(ns, gangMemberNames, isHackingGang) {
    this.#ns = ns;

    // Focus
    this.#gangType = isHackingGang ? GangFocus.MONEY : GangFocus.POWER;
    this.#defaultTrainingTask = getGangTrainingTask(this.#gangType);
    this.#defaultEthicalTask = getGangEthicalTask(this.#gangType);

    this.#gangMemberNames = gangMemberNames;
  }

  //#region Getters and Setters

  get type() {
    return this.#gangType;
  }

  get focus() {
    return this.#focus;
  }

  get trainingTask() {
    return this.#defaultTrainingTask;
  }

  get ethicalTask() {
    return this.#defaultEthicalTask;
  }

  get isRecruiting() {
    return this.#isRecruiting;
  }

  get shouldWaitAscend() {
    return this.#shouldWaitAscend;
  }

  set shouldWaitAscend(value) {
    const fname = "setShouldWaitAscend";
    if (value === this.#shouldWaitAscend) return;

    this.#shouldWaitAscend = value;
    if (value === true) {
      printLogInfo(
        this.#ns,
        `[${fname}] Waiting to recruit next member before ascending current members.`,
      );
    }
  }

  #changeFocus(newFocus) {
    if (newFocus === this.#focus) return;
    this.#focus = newFocus;
    this.isFocusOptimized = false;
    this.checkFocus = true;
  }

  stopRecruit() {
    const fname = "stopRecruit";
    if (this.isRecruiting === false) {
      throw new Error("stopRecruit called but isRecruiting is already false");
    }
    this.#isRecruiting = false;
    this.#changeFocus(this.#gangType);

    printLogInfo(
      this.#ns,
      `[${fname}] Maximum number of gang members have been recruited - ${this.memberCount()} members.`,
    );
  }

  get memberNames() {
    return [...this.#gangMemberNames];
  }

  get membersTraining() {
    return [...this.#membersTraining];
  }

  get membersWorking() {
    return [...this.#membersWorking];
  }
  get membersEthical() {
    return [...this.#membersEthical];
  }

  get isMembersTraining() {
    return this.#membersTraining.length > 0;
  }

  get isMembersEthical() {
    return this.#membersEthical.length > 0;
  }

  get isMembersWorking() {
    return this.#membersWorking.length > 0;
  }

  //#endregion Getters and Setters

  //#region Stringify

  #membersString() {
    let message = `Gang Members (${this.memberCount()}):`;

    message += `\n- Training: ${this.#membersTraining.length} `;
    if (this.#membersTraining.length > 0) {
      message += `(${this.#membersTraining.join(", ")})`;
    }

    message += `\n- Ethical: ${this.#membersEthical.length} `;
    if (this.#membersEthical.length > 0) {
      message += `(${this.#membersEthical.join(", ")})`;
    }

    message += `\n- Working: ${this.#membersWorking.length} `;
    if (this.#membersWorking.length > 0) {
      message += `(${this.#membersWorking.join(", ")})`;
    }

    return message;
  }

  toString() {
    let message = `Gang Status: `;
    message += `Recruiting? ${this.isRecruiting}, Wait to ascend? ${this.shouldWaitAscend}, Focus optimized? ${this.isFocusOptimized}\n`;
    message += this.#membersString();
    return message;
  }

  //#endregion Stringify

  //#region Members

  memberCount() {
    return this.#gangMemberNames.length;
  }

  ethicalMembersCount() {
    return this.#membersEthical.length;
  }

  sanityCheckMembers() {
    const fname = "sanityCheckMembers";
    const memberCount = this.#gangMemberNames.length;
    const totalCategorizedMembers =
      this.#membersTraining.length +
      this.#membersEthical.length +
      this.#membersWorking.length;
    if (memberCount === totalCategorizedMembers) return;

    let message = `[${fname}] Sanity Check Failed. Total members does not match sum of categorized members: ${totalCategorizedMembers}.\n`;
    message += this.#membersString();
    throw new Error(message);
  }

  //#endregion Members

  //#region Add Members

  #setMemberTask(memberName, taskName) {
    this.isFocusOptimized = false;
    this.#ns.gang.setMemberTask(memberName, taskName);
  }

  /**
   * Calling function should ensure member is only in one category list at a time
   * (training, ethical, working)
   */
  addMemberToTraining(memberName, taskName) {
    this.#setMemberTask(memberName, taskName);
    if (!this.#membersTraining.includes(memberName)) {
      this.#membersTraining.push(memberName);
    }
  }

  /**
   * Calling function should ensure member is only in one category list at a time
   * (training, ethical, working)
   */
  addMemberToEthical(memberName, taskName) {
    this.#setMemberTask(memberName, taskName);
    if (!this.#membersEthical.includes(memberName)) {
      this.#membersEthical.push(memberName);
    }
  }

  /**
   * Calling function should ensure member is only in one category list at a time
   * (training, ethical, working)
   */
  addMemberToWorking(memberName, taskName) {
    this.#setMemberTask(memberName, taskName);
    if (!this.#membersWorking.includes(memberName)) {
      this.#membersWorking.push(memberName);
    }
  }

  /**
   * Adds a new member to the gang and assigns them the default training task
   * New member should start with a training task to raise skill
   *
   * @param {string} memberName - the name of the new member to add
   */
  addNewMember(memberName) {
    const fname = "addNewMember";
    this.#gangMemberNames.push(memberName);
    this.addMemberToTraining(memberName, this.trainingTask);
    this.#ns.print(
      `[${fname}] Recruited '${memberName}' and assigned '${this.trainingTask}'. Total members: ${this.memberCount()}.`,
    );
  }

  //#endregion Add Members

  //#region Reassign Members

  /** Assigns the first training member to the gang's focus ethical task */
  assignFirstTrainingMemberToEthical(ethicalTask) {
    const fname = "assignFirstTrainingMemberToEthical";

    if (ethicalTask == null) {
      ethicalTask = this.ethicalTask;
    }

    const memberName = this.#membersTraining.shift();
    this.addMemberToEthical(memberName, ethicalTask);
    this.logMemberReassignTask(fname, memberName, "Training", ethicalTask);
  }

  /** Assigns the first training member to work task
   * @param {string} taskName : Work task to assign */
  assignFirstTrainingMemberToWork(taskName) {
    const fname = "assignFirstTrainingMemberToWork";

    const memberName = this.#membersTraining.shift();
    this.addMemberToWorking(memberName, taskName);
    this.logMemberReassignTask(fname, memberName, "Training", taskName);
  }

  assignEthicalMemberToWork(memberObject, taskName) {
    const fname = "assignEthicalMemberToWork";
    const prevTask = memberObject.task;

    this.addMemberToWorking(memberObject.name, taskName);
    this.#membersEthical = this.#membersEthical.filter(
      (name) => name !== memberObject.name,
    );

    this.logMemberReassignTask(fname, memberObject.name, prevTask, taskName);
  }

  /** Assign member to the default ethical task */
  assignWorkingMemberToEthical(memberObject) {
    const fname = "assignWorkingMemberToEthical";
    const memberName = memberObject.name;
    const prevTask = memberObject.task;

    this.addMemberToEthical(memberName, this.ethicalTask);
    this.#membersWorking = this.#membersWorking.filter(
      (name) => name !== memberName,
    );
    this.logMemberReassignTask(fname, memberName, prevTask, this.ethicalTask);
  }

  /** Update member task while preserving the member's category (training, ethical, working) */
  updateMemberTask(memberObject, currentTask, nextTask) {
    const fname = "updateMemberTask";
    this.#setMemberTask(memberObject.name, nextTask.name);

    this.logMemberAssignEx(fname, memberObject.name, currentTask, nextTask);
  }

  /**
   * @param {string} fromTask
   * @param {string} toTask
   */
  logMemberReassignTask(fname, memberName, fromTask, toTask) {
    printLogInfo(
      this.#ns,
      `[${fname}] Assigned member '${memberName}' task from '${fromTask}' to '${toTask}'.`,
    );
  }

  /**
   * @param {GangTaskStats} fromTask
   * @param {GangTaskStats} toTask
   */
  logMemberAssignEx(fname, memberName, fromTask, toTask) {
    let message = `[${fname}] Assigned member '${memberName}' `;
    message += `\n\tfrom '${fromTask.name}' (money: ${fromTask.baseMoney}, respect: ${fromTask.baseRespect}, wanted: ${fromTask.baseWanted}) `;
    message += `\n\tto '${toTask.name}' (money: ${toTask.baseMoney}, respect: ${toTask.baseRespect}, wanted: ${toTask.baseWanted}).`;
    printLogInfo(this.#ns, message);
  }

  //#endregion Reassign Members
}
