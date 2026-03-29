import {
  printError,
  printInfo,
  print,
  printLogInfo,
  printLogWarn,
  printWarn,
} from "/utils/print.js";

export class MyGang {
  /** @type {NS} */
  #ns = null;

  /** False when maximum number of members has been recruited */
  #canRecruit = true;
  #shouldWaitAscend = false;
  isFocusOptimized = false;

  /** @type {string[]} */
  #gangMemberNames = [];
  /** @type {string[]} */
  #membersTraining = [];
  /** @type {string[]} */
  #membersEthical = [];
  /** @type {string[]} */
  #membersWorking = [];

  /** @type {string} */
  #defaultTrainingTask = null;

  /**
   * @param {NS} ns
   * @param {string[]} gangMemberNames
   * @param {string} defaultTrainingTask
   */
  constructor(ns, gangMemberNames, defaultTrainingTask) {
    this.#ns = ns;

    // this.#canRecruit = true;
    // this.#shouldWaitAscend = false;
    // this.isFocusOptimized = false;

    // Members
    this.#gangMemberNames = gangMemberNames;
    // this.#membersTraining = [];
    // this.#membersEthical = [];
    // this.#membersWorking = [];
    this.#defaultTrainingTask = defaultTrainingTask;
  }

  //#region Getters and Setters

  get canRecruit() {
    return this.#canRecruit;
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

  stopRecruit() {
    const fname = "stopRecruit";
    if (this.#canRecruit === false) {
      throw new Error("stopRecruit called but canRecruit is already false");
    }
    this.isFocusOptimized = false;
    this.#canRecruit = false;
    // TODO:
    //   this.#evaluateFocus = true;

    printLogInfo(
      this.#ns,
      `[${fname}] Maximum number of gang members have been recruited - ${this.memberCount()} members.`,
    );
  }

  get memberNames() {
    return this.#gangMemberNames;
  }

  get membersWorking() {
    return this.#membersWorking;
  }
  get membersEthical() {
    return this.#membersEthical;
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

  //#region Members

  memberCount() {
    return this.#gangMemberNames.length;
  }

  membersEthicalCount() {
    return this.#membersEthical.length;
  }

  membersString() {
    let message = `- Training: ${this.#membersTraining.length} (${this.#membersTraining.join(", ")})\n`;
    message += `- Ethical: ${this.#membersEthical.length} (${this.#membersEthical.join(", ")})\n`;
    message += `- Working: ${this.#membersWorking.length} (${this.#membersWorking.join(", ")})`;
    return message;
  }

  sanityCheckMembers() {
    const fname = "sanityCheckMembers";
    const memberCount = this.#gangMemberNames.length;
    const totalCategorizedMembers =
      this.#membersTraining.length +
      this.#membersEthical.length +
      this.#membersWorking.length;
    if (memberCount === totalCategorizedMembers) return;

    let message = `[${fname}] Sanity Check Failed. Total members ${memberCount} does not match sum of categorized members ${totalCategorizedMembers}.\n`;
    message += this.membersString();
    throw new Error(message);
  }
  //#endregion Members

  //#region Add Members

  #setMemberTask(memberName, taskName) {
    this.isFocusOptimized = false;
    this.#ns.gang.setMemberTask(memberName, taskName);
  }

  addMemberToTraining(memberName, taskName) {
    this.#setMemberTask(memberName, taskName);
    if (!this.#membersTraining.includes(memberName)) {
      this.#membersTraining.push(memberName);
    }
  }

  addMemberToEthical(memberName, taskName) {
    this.#setMemberTask(memberName, taskName);
    if (!this.#membersEthical.includes(memberName)) {
      this.#membersEthical.push(memberName);
    }
  }

  addMemberToWorking(memberName, taskName) {
    this.#setMemberTask(memberName, taskName);
    if (!this.#membersWorking.includes(memberName)) {
      this.#membersWorking.push(memberName);
    }
  }

  /**
   * Adds a new member to the gang and assigns them the default training task
   * @param {string} memberName - the name of the new member to add
   */
  addNewMember(memberName) {
    const fname = "addNewMember";
    this.#gangMemberNames.push(memberName);
    this.addMemberToTraining(memberName, this.#defaultTrainingTask);
    this.#ns.print(
      `[${fname}] Recruited '${memberName}' and assigned '${this.#defaultTrainingTask}'. Total members: ${this.memberCount()}.`,
    );
  }

  //#endregion Add Members

  //#region Reassign Members

  /** @param taskName : Ethical task name */
  assignFirstTrainingMemberToEthical(taskName) {
    const fname = "assignFirstTrainingMemberToEthical";

    const memberName = this.#membersTraining.shift();
    this.addMemberToEthical(memberName, taskName);
    this.logMemberReassignTask(fname, memberName, "Training", taskName);
  }

  assignFirstTrainingMemberToWork(taskName) {
    const fname = "assignFirstTrainingMemberToWork";

    const memberName = this.#membersTraining.shift();
    this.addMemberToWorking(memberName, taskName);
    this.logMemberReassignTask(fname, memberName, "Training", taskName);
  }

  assignEthicalMemberToWork(memberObject, taskName) {
    const fname = "assignEthicalMemberToWork";
    const memberTask = memberObject.task;

    this.addMemberToWorking(memberObject.name, taskName);
    this.#membersEthical = this.#membersEthical.filter(
      (name) => name !== memberObject.name,
    );

    this.logMemberReassignTask(fname, memberObject.name, memberTask, taskName);
  }

  assignWorkingMemberToEthical(memberObject, taskName) {
    const fname = "assignWorkingMemberToEthical";
    const memberTask = memberObject.task;

    this.addMemberToEthical(memberObject.name, taskName);
    this.#membersWorking = this.#membersWorking.filter(
      (name) => name !== memberObject.name,
    );
    this.logMemberReassignTask(fname, memberObject.name, memberTask, taskName);
  }

  /**
   * @param {string} fromTaskName
   * @param {string} toTaskName
   */
  logMemberReassignTask(fname, memberName, fromTask, toTask) {
    printLogInfo(
      this.#ns,
      `[${fname}] Assigned member '${memberName}' task from '${fromTask}' to '${toTask}'.`,
    );
  }

  //#endregion Reassign Members
}
