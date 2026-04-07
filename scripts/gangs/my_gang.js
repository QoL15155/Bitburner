import { readGangEquipment } from "./utils.js";
import {
  GangFocus,
  getGangEthicalTask,
  getGangTrainingTask,
} from "/gangs/manage.js";
import { printLogError, printLogInfo } from "/utils/print.js";

export class MyGang {
  /** @const {NS} */
  #ns = null;

  /**
   * Determines the gang's focus when done recruiting members
   * money (hacking) vs power (combat)
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

  // Equipment
  #buyAugmentations = false;
  #buyEquipment = false;
  #augmentations = null;
  #equipment = null;

  /**
   * @param {NS} ns
   * @param {boolean} isHackingGang - Whether the gang is focused on hacking (money) or combat (power).
   * @param {string[]} gangMemberNames - Names of the gang members.
   * @param {boolean} buyAugmentations - whether to buy augmentations for gang members when they are available.
   * @param {boolean} buyEquipment - whether to buy equipment for gang members when it is available.
   */
  constructor(
    ns,
    isHackingGang,
    gangMemberNames,
    buyAugmentations,
    buyEquipment,
  ) {
    this.#ns = ns;

    // Focus
    this.#gangType = isHackingGang ? GangFocus.MONEY : GangFocus.POWER;
    this.#defaultTrainingTask = getGangTrainingTask(this.#gangType);
    this.#defaultEthicalTask = getGangEthicalTask(this.#gangType);

    this.#gangMemberNames = gangMemberNames;

    // Equipment
    if (buyEquipment && !buyAugmentations) {
      throw new TypeError(
        "Buy equipment is set while buy augmentations is not set.",
      );
    }

    this.#buyAugmentations = buyAugmentations;
    this.#buyEquipment = buyEquipment;
    if (buyEquipment || buyAugmentations) {
      const equipmentByType = readGangEquipment(ns);
      if (isHackingGang) {
        this.#augmentations = equipmentByType.augmentations.hacking;
        this.#equipment = equipmentByType.regular.hacking;
      } else {
        this.#augmentations = equipmentByType.augmentations.combat;
        this.#equipment = equipmentByType.regular.combat;
      }

      for (const memberName of gangMemberNames) {
        const memberInfo = this.#ns.gang.getMemberInformation(memberName);
        this.buyAugmentationsForMember(memberInfo);
        this.buyEquipmentForMember(memberInfo);
      }
    }
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
    const fname = "MyGang.setShouldWaitAscend";
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
    const fname = "MyGang.stopRecruit";
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
    message += `Buy Augmentations? ${this.#buyAugmentations}, Buy Equipment? ${this.#buyEquipment}\n`;
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
    const fname = "MyGang.sanityCheckMembers";
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
    const fname = "MyGang.addNewMember";
    this.#gangMemberNames.push(memberName);
    this.addMemberToTraining(memberName, this.trainingTask);

    const memberInfo = this.#ns.gang.getMemberInformation(memberName);
    this.buyAugmentationsForMember(memberInfo);
    this.buyEquipmentForMember(memberInfo);

    this.#ns.print(
      `[${fname}] Recruited '${memberName}' and assigned '${this.trainingTask}'. Total members: ${this.memberCount()}.`,
    );
  }

  //#endregion Add Members

  //#region Reassign Members

  /** Assigns the first training member to the gang's focus ethical task
   * @param {string} [ethicalTask] - ethical task to assign.
   *    Defaults to the gang's default Ethical task
   */
  assignFirstTrainingMemberToEthical(ethicalTask = this.ethicalTask) {
    const fname = "MyGang.assignFirstTrainingMemberToEthical";

    const memberName = this.#membersTraining.shift();
    this.addMemberToEthical(memberName, ethicalTask);
    this.logMemberReassignTask(fname, memberName, "Training", ethicalTask);
  }

  /** Assigns the first training member to work task
   * @param {string} taskName : Work task to assign */
  assignFirstTrainingMemberToWork(taskName) {
    const fname = "MyGang.assignFirstTrainingMemberToWork";

    const memberName = this.#membersTraining.shift();
    this.addMemberToWorking(memberName, taskName);
    this.logMemberReassignTask(fname, memberName, "Training", taskName);
  }

  assignEthicalMemberToWork(memberObject, taskName) {
    const fname = "MyGang.assignEthicalMemberToWork";
    const prevTask = memberObject.task;

    this.addMemberToWorking(memberObject.name, taskName);
    this.#membersEthical = this.#membersEthical.filter(
      (name) => name !== memberObject.name,
    );

    this.logMemberReassignTask(fname, memberObject.name, prevTask, taskName);
  }

  /** Assign member to the default ethical task
   * @param {GangMemberInfo} memberObject
   */
  assignWorkingMemberToEthical(memberObject) {
    const fname = "MyGang.assignWorkingMemberToEthical";
    const memberName = memberObject.name;
    const prevTask = memberObject.task;

    this.addMemberToEthical(memberName, this.ethicalTask);
    this.#membersWorking = this.#membersWorking.filter(
      (name) => name !== memberName,
    );
    this.logMemberReassignTask(fname, memberName, prevTask, this.ethicalTask);
  }

  /** Assign member to the provided Ethical task
   * @param {GangMemberInfo} memberObject
   * @param {GangTaskStats} currentTask
   * @param {GangTaskStats} nextTask
   * */
  assignWorkingMemberToEthicalTask(memberObject, currentTask, nextTask) {
    const fname = "MyGang.assignWorkingMemberToEthicalTask";
    const memberName = memberObject.name;

    this.addMemberToEthical(memberName, nextTask.name);
    this.#membersWorking = this.#membersWorking.filter(
      (name) => name !== memberName,
    );
    this.logMemberReassignTaskEx(fname, memberName, currentTask, nextTask);
  }

  /** Update member task while preserving the member's category (training, ethical, working)
   * @param {GangMemberInfo} memberObject
   * @param {GangTaskStats} currentTask
   * @param {GangTaskStats} nextTask
   */
  updateMemberTask(memberObject, currentTask, nextTask) {
    const fname = "MyGang.updateMemberTask";
    this.#setMemberTask(memberObject.name, nextTask.name);

    this.logMemberReassignTaskEx(
      fname,
      memberObject.name,
      currentTask,
      nextTask,
    );
  }

  /**
   * @param {string} fname - calling function name for logging
   * @param {string} memberName
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
   * @param {string} fname - calling function name for logging
   * @param {string} memberName
   * @param {GangTaskStats} fromTask
   * @param {GangTaskStats} toTask
   */
  logMemberReassignTaskEx(fname, memberName, fromTask, toTask) {
    let message = `[${fname}] Assigned member '${memberName}' `;
    message += `\n\tfrom '${fromTask.name}' (money: ${fromTask.baseMoney}, respect: ${fromTask.baseRespect}, wanted: ${fromTask.baseWanted}) `;
    message += `\n\tto '${toTask.name}' (money: ${toTask.baseMoney}, respect: ${toTask.baseRespect}, wanted: ${toTask.baseWanted}).`;
    printLogInfo(this.#ns, message);
  }

  //#endregion Reassign Members

  //#region Equipment

  /** @param {GangMemberInfo} member */
  buyAugmentationsForMember(member) {
    const fname = "MyGang.buyAugmentationsForMember";
    if (!this.#buyAugmentations) {
      return;
    }

    const augmentationsToBuy = this.#augmentations.filter(
      (augmentation) =>
        member.augmentations.includes(augmentation.name) === false,
    );

    let newAugmentations = [];
    for (const augmentation of augmentationsToBuy) {
      const name = augmentation.name;
      const result = this.#ns.gang.purchaseEquipment(member.name, name);
      if (!result) {
        printLogError(
          this.#ns,
          `[${fname}] Failed to purchase augmentation '${name}' for member '${member.name}'.`,
        );
      } else {
        newAugmentations.push(name);
      }
    }
    if (newAugmentations.length > 0) {
      printLogInfo(
        this.#ns,
        `[${fname}] Member '${member.name}' purchased augmentations: '${newAugmentations.join(", ")}'.`,
      );
    }
  }

  /** @param {GangMemberInfo} member */
  buyEquipmentForMember(member) {
    const fname = "MyGang.buyEquipmentForMember";
    if (!this.#buyEquipment) {
      return;
    }

    const equipmentToBuy = this.#equipment.filter(
      (equipment) => member.upgrades.includes(equipment.name) === false,
    );

    //TODO: consolidate function
    let newEquipment = [];
    let totalCost = 0;
    let items = 0;
    for (const equipment of equipmentToBuy) {
      const name = equipment.name;
      const result = this.#ns.gang.purchaseEquipment(member.name, name);
      if (!result) {
        printLogError(
          this.#ns,
          `[${fname}] Failed to purchase equipment '${name}' for member '${member.name}'.`,
        );
        return;
      } else {
        newEquipment.push(name);
        totalCost += equipment.cost;
        items++;
      }
    }
    if (newEquipment.length > 0) {
      printLogInfo(
        this.#ns,
        `[${fname}] Member '${member.name}' purchased ${items} items. Total cost: ${totalCost}.`,
      );
    }
  }

  //#endregion Equipment
}
