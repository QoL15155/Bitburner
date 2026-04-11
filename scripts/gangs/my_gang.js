import { memberNamePrefix } from "./constants.js";
import { readGangEquipment } from "./utils.js";
import {
  GangFocus,
  getGangEthicalTask,
  getGangTrainingTask,
  shouldAscendMember,
} from "/gangs/manage.js";
import {
  Color,
  printLogError,
  printLogInfo,
  toGreen,
  toRed,
} from "/utils/print.js";

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

  // Number of times a killing was detected. Used for member naming.
  #killedTimes = 0;
  /** Don't ascend members while waiting to recruit the next member */
  #shouldWaitAscend = false;
  /**
   * True when all members are assigned to the best tasks for the current focus
   * Saves performance by not trying to optimize task assignments
   */
  isFocusOptimized = false;
  /** True when first starting or after focus change
   * Makes sure all members' tasks are optimized for the current focus
   */
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
    this.#gangType = isHackingGang ? GangFocus.MONEY : GangFocus.COMBAT;
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
        this.#buyAugmentationsForMember(memberInfo);
        this.#buyEquipmentForMember(memberInfo);
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

  get shouldWaitAscend() {
    return this.#shouldWaitAscend;
  }

  set shouldWaitAscend(value) {
    const fname = "MyGang.setShouldWaitAscend";
    if (value === this.#shouldWaitAscend) return;

    this.#shouldWaitAscend = value;
    if (value === true) {
      this.#ns.print(
        `[${fname}] ${toGreen("Waiting to ascend")} members until next recruitment.`,
      );
    }
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
    let message = `Gang Members ${toGreen(this.memberCount())}:`;

    message += `\n\t- Training: ${this.#membersTraining.length} `;
    if (this.#membersTraining.length > 0) {
      message += `(${this.#membersTraining.join(", ")})`;
    }

    message += `\n\t- Ethical: ${this.#membersEthical.length} `;
    if (this.#membersEthical.length > 0) {
      message += `(${this.#membersEthical.join(", ")})`;
    }

    message += `\n\t- Working: ${this.#membersWorking.length} `;
    if (this.#membersWorking.length > 0) {
      message += `(${this.#membersWorking.join(", ")})`;
    }

    return message;
  }

  toString() {
    const header = `${Color.FgCyan}⭐MyGang⭐${Color.Reset}`;
    const type = this.type === GangFocus.MONEY ? "Hacking" : "Combat";

    let message = `${header} Type: ${toMagenta(type)}, Focus: ${toMagenta(this.focus)}\n`;
    message += `\tWait to ascend? ${toGreen(this.shouldWaitAscend)}, Focus optimized? ${toGreen(this.isFocusOptimized)}\n`;

    const buyAugmentations = this.#buyAugmentations
      ? toGreen("✅ Buy Augmentations")
      : toRed("❌ Don't buy Augmentations");
    const buyEquipment = this.#buyEquipment
      ? toGreen("✅ Buy Equipment")
      : toRed("❌ Don't buy Equipment");
    message += `\t${buyAugmentations}, ${buyEquipment}\n`;
    message += this.#membersString();
    return message;

    function toMagenta(text) {
      return `${Color.FgMagenta}${text}${Color.Reset}`;
    }
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

  /**
   * Ascends gang members if they meet the criteria.
   *
   * 1. Checks we don't want to wait for recruitment before ascending.
   * 2. For each member, ascend if the member will gain at least 2 levels in any stat
   *    after ascending.
   */
  ascendMembers() {
    const fname = "MyGang.ascendMembers";

    if (this.shouldWaitAscend) {
      return;
    }

    for (const memberName of this.#gangMemberNames) {
      if (!shouldAscendMember(this.#ns, memberName)) {
        continue;
      }

      const result = this.#ns.gang.ascendMember(memberName);
      if (!result) {
        throw new Error(`Failed to ascend member '${memberName}'.`);
      }

      const memberInfo = this.#ns.gang.getMemberInformation(memberName);
      this.#buyEquipmentForMember(memberInfo);
    }
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
    this.#buyAugmentationsForMember(memberInfo);
    this.#buyEquipmentForMember(memberInfo);

    // Log
    const msgRecruited = `Recruited '${toGreen(memberName)}' and assigned '${this.trainingTask}' task`;
    this.#ns.print(
      `[${fname}] ${msgRecruited}. Total members: ${this.memberCount()}.`,
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
    const msgAssign = `'${toGreen(memberName)}': ${toGreen(fromTask)} -> ${toGreen(toTask)}.`;
    this.#ns.print(`[${fname}] ${msgAssign}`);
  }

  /**
   * @param {string} fname - calling function name for logging
   * @param {string} memberName
   * @param {GangTaskStats} fromTask
   * @param {GangTaskStats} toTask
   */
  logMemberReassignTaskEx(fname, memberName, fromTask, toTask) {
    const msgAssign = `'${toGreen(memberName)}': ${toGreen(fromTask.name)} -> ${toGreen(toTask.name)}.`;
    const msgFromTask = `\n\t${fromTask.name} (money: ${fromTask.baseMoney}, respect: ${fromTask.baseRespect}, wanted: ${fromTask.baseWanted})`;
    const msgToTask = `\n\t${toTask.name} (money: ${toTask.baseMoney}, respect: ${toTask.baseRespect}, wanted: ${toTask.baseWanted})`;
    this.#ns.print(`[${fname}] ${msgAssign}${msgFromTask}${msgToTask}`);
  }

  //#endregion Reassign Members

  //#region Recruitment

  #changeFocus(newFocus) {
    if (newFocus === this.#focus) return;
    this.#focus = newFocus;
    this.isFocusOptimized = false;
    this.checkFocus = true;
  }

  /** Start recruiting gang members
   * Called during Combat when a member is killed
   */
  startRecruit() {
    const fname = "MyGang.startRecruit";
    if (this.focus === GangFocus.RECRUITING) {
      throw new Error("startRecruit called when already recruiting");
    }

    this.#changeFocus(GangFocus.RECRUITING);

    this.#ns.print(
      `[${fname}] ${Color.FgMagenta}Recruiting new gang members${Color.Reset}`,
    );
  }

  getNewMemberName() {
    const members = this.memberCount();
    if (this.#killedTimes === 0) {
      return `${memberNamePrefix} #${members}`;
    }

    const killed = String(this.#killedTimes).padStart(2, "0");
    return `${memberNamePrefix}.K${killed} #${members}`;
  }

  /** Removes killed members from the gang and start recruiting new members.
   *
   * @param {string[]} memberNames - Members that were killed in combat.
   */
  handleKilledMembers(memberNames) {
    const fname = "MyGang.handleKilledMembers";
    this.#killedTimes++;

    // Log
    const killedMembers = toRed(memberNames.join(", "));
    const msgMembers = `Removing killed members (${toRed(memberNames.length)}): ${killedMembers}.`;
    const msgKilledTimes = `${Color.FgMagenta}Killed times: ${this.#killedTimes}${Color.Reset}.`;
    this.#ns.print(`[${fname}] ${msgMembers} ${msgKilledTimes}`);

    // Remove killed members
    for (const memberName of memberNames) {
      this.#gangMemberNames = this.#gangMemberNames.filter(
        (name) => name !== memberName,
      );

      // Remove killed members from task lists
      this.#membersTraining = this.#membersTraining.filter(
        (name) => name !== memberName,
      );
      this.#membersEthical = this.#membersEthical.filter(
        (name) => name !== memberName,
      );
      this.#membersWorking = this.#membersWorking.filter(
        (name) => name !== memberName,
      );
    }

    this.startRecruit();
  }

  stopRecruit() {
    const fname = "MyGang.stopRecruit";
    if (this.focus !== GangFocus.RECRUITING) {
      throw new Error(
        `${fname} called when not recruiting. Focus is ${this.focus}`,
      );
    }
    this.#changeFocus(this.#gangType);

    const msgMembers = `${Color.FgMagenta}Recruited maximum${Color.Reset} number of gang members - ${Color.FgMagenta}${this.memberCount()} members${Color.Reset}.`;
    const msgFocus = `Set focus to ${Color.FgMagenta}${this.focus}${Color.Reset}.`;
    this.#ns.print(`[${fname}] ${msgMembers} ${msgFocus}`);
  }

  //#endregion Recruitment

  //#region Equipment

  /** @param {GangMemberInfo} member */
  #buyAugmentationsForMember(member) {
    if (!this.#buyAugmentations) {
      return;
    }

    const augmentationsToBuy = this.#augmentations.filter(
      (augmentation) =>
        member.augmentations.includes(augmentation.name) === false,
    );

    this.#buyForMember(member.name, augmentationsToBuy, "Augmentation");
  }

  /** @param {GangMemberInfo} member */
  #buyEquipmentForMember(member) {
    if (!this.#buyEquipment) {
      return;
    }

    const equipmentToBuy = this.#equipment.filter(
      (equipment) => member.upgrades.includes(equipment.name) === false,
    );

    this.#buyForMember(member.name, equipmentToBuy, "Equipment");
  }

  #buyForMember(memberName, purchaseList, itemsType) {
    const fname = `MyGang.buyForMember`;

    let totalCost = 0;
    let itemsCount = 0;

    for (const item of purchaseList) {
      const name = item.name;
      const result = this.#ns.gang.purchaseEquipment(memberName, name);
      if (!result) {
        // Probably failed to buy item due to insufficient funds
        const formattedCost = this.#ns.formatNumber(item.cost);
        printLogError(
          this.#ns,
          `[${fname}] Failed to purchase ${itemsType} for member '${memberName}'.` +
            ` Item: ${name}, Cost: $${formattedCost}.`,
        );
      } else {
        totalCost += item.cost;
        itemsCount++;
      }
    }

    if (itemsCount > 0) {
      const formattedCost = this.#ns.formatNumber(totalCost);
      printLogInfo(
        this.#ns,
        `[${fname}] Member '${memberName}' purchased ${itemsCount} items (type ${itemsType}).` +
          ` Total cost: $${formattedCost}.`,
      );
    }
  }

  //#endregion Equipment

  //#region Warfare

  /** Check if the gang controls 100% territory
   * @returns true if gang controls 100% territory and false otherwise.
   * If true, also changes focus to Money.
   */
  handleMaxTerritory() {
    const fname = "MyGang.handleMaxTerritory";
    if (this.focus !== GangFocus.COMBAT) {
      throw new Error(
        "handleMaxTerritory should only be called for Combat gangs.",
      );
    }

    const gangInformation = this.#ns.gang.getGangInformation();
    if (gangInformation.territory !== 1) return false;

    this.#changeFocus(GangFocus.MONEY);

    const msgFocus = `Switching to ${Color.FgMagenta}${this.focus}${Color.Reset} focus.`;
    this.#ns.print(
      `[${fname}] ${Color.FgMagenta}Gang controls 100% territory${Color.Reset}! ${msgFocus}`,
    );
    return true;
  }

  //#endregion
}
