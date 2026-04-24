export class AttackResult {
  constructor(success, delayTime, threads = 0, errorMessages = []) {
    this.success = success;
    this.duration = delayTime;
    this.threads = threads;
    /** @type {Array<string>} */
    this.errorMessages = errorMessages;
  }
}

export class AttackSuccess extends AttackResult {
  constructor(delayTime, threads, errorMessages = []) {
    super(true, delayTime, threads, errorMessages);
  }
}

export const AttackFailReason = Object.freeze({
  SCRIPT_RUNNING: 0, // script hasn't finished as expected
  SANITY_FAIL: 1,
  NOT_ENOUGH_RAM: 2,
  OTHER_ERROR: 3,
});

export class AttackFailure extends AttackResult {
  constructor(reason, delayTime, errorMessages = []) {
    super(false, delayTime, 0, errorMessages);
    /** @type {AttackFailReason} */
    this.reason = reason;
  }
}
