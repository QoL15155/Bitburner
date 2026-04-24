/**
 * File Logger with log rotation support for Bitburner.
 *
 * Writes log entries to a .txt file and automatically rotates
 * when the number of entries exceeds a configurable threshold.
 * Old rotated files are deleted to prevent unbounded growth.
 */
export class FileLogger {
  static errorDirectory = "/errors/";

  /**
   * @param {NS} ns
   * @param {object} options
   * @param {string} options.logFile - Base log file path (must end in .txt, e.g. "/logs/controller.txt")
   * @param {number} [options.maxEntries=500] - Max log entries before rotation
   * @param {number} [options.maxFiles=3] - Max rotated log files to keep
   */
  constructor(ns, { logFile, maxEntries = 500, maxFiles = 3 }) {
    this.ns = ns;
    this.logFile = logFile;
    this.maxEntries = maxEntries;
    this.maxFiles = maxFiles;

    // Count existing entries so rotation is correct across restarts
    this.entryCount = 0;
    const content = ns.read(logFile);
    if (content) {
      this.entryCount = content.split("\n").filter((l) => l.length > 0).length;
    }
  }

  _getFormattedTime() {
    const d = new Date();
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    const s = String(d.getSeconds()).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  /**
   * Generates the rotated file name for a given index.
   * e.g. "/logs/controller.txt" → "/logs/controller.1.txt"
   */
  _getRotatedFileName(index) {
    const dotPos = this.logFile.lastIndexOf(".");
    if (dotPos === -1) return `${this.logFile}.${index}`;
    return `${this.logFile.slice(0, dotPos)}.${index}${this.logFile.slice(dotPos)}`;
  }

  /**
   * Rotates log files:
   *   - Deletes the oldest rotated file if it exceeds maxFiles
   *   - Shifts existing files: .N-1 → .N, .N-2 → .N-1, ..., .1 → .2
   *   - Moves the current log to .1
   *   - Clears the current log file
   */
  _rotate() {
    const oldest = this._getRotatedFileName(this.maxFiles);
    this.ns.rm(oldest);

    for (let i = this.maxFiles - 1; i >= 1; i--) {
      const src = this._getRotatedFileName(i);
      const dst = this._getRotatedFileName(i + 1);
      const content = this.ns.read(src);
      if (content) {
        this.ns.write(dst, content, "w");
        this.ns.rm(src);
      }
    }

    const content = this.ns.read(this.logFile);
    if (content) {
      this.ns.write(this._getRotatedFileName(1), content, "w");
    }

    this.ns.write(this.logFile, "", "w");
    this.entryCount = 0;
  }

  _write(level, fname, msg) {
    if (this.entryCount >= this.maxEntries) {
      this._rotate();
    }

    const time = this._getFormattedTime();
    const line = `[${time}] [${level}] [${fname}] ${msg}\n`;
    this.ns.write(this.logFile, line, "a");
    this.entryCount++;
  }

  /**
   * Copies the current log file and all rotated log files into an
   * error snapshot directory (e.g. "/errors/20260320_143052/").
   * The original log files are not removed.
   */
  _collectLogsOnError() {
    const d = new Date();
    const timestamp =
      `${d.getFullYear()}` +
      String(d.getMonth() + 1).padStart(2, "0") +
      String(d.getDate()).padStart(2, "0") +
      "_" +
      String(d.getHours()).padStart(2, "0") +
      String(d.getMinutes()).padStart(2, "0") +
      String(d.getSeconds()).padStart(2, "0");

    const baseDir = FileLogger.errorDirectory + timestamp;
    const baseName = this.logFile.slice(this.logFile.lastIndexOf("/") + 1);

    // Copy the current (active) log file
    const content = this.ns.read(this.logFile);
    if (content) {
      this.ns.write(`${baseDir}/${baseName}`, content, "w");
    }

    // Copy each rotated log file that exists
    for (let i = 1; i <= this.maxFiles; i++) {
      const rotatedSrc = this._getRotatedFileName(i);
      const rotatedContent = this.ns.read(rotatedSrc);
      if (!rotatedContent) continue;

      const rotatedName = rotatedSrc.slice(rotatedSrc.lastIndexOf("/") + 1);
      this.ns.write(`${baseDir}/${rotatedName}`, rotatedContent, "w");
    }
  }

  /**
   * @param {string} fname - Function name
   * @param {string} msg - Log message
   */
  error(fname, msg) {
    this._write("ERROR", fname, msg);
    this._collectLogsOnError();
  }

  /**
   * @param {string} fname - Function name
   * @param {string} msg - Log message
   */
  warn(fname, msg) {
    this._write("WARN", fname, msg);
  }

  /**
   * @param {string} fname - Function name
   * @param {string} msg - Log message
   */
  info(fname, msg) {
    this._write("INFO", fname, msg);
  }

  /**
   * @param {string} fname - Function name
   * @param {string} msg - Log message
   */
  debug(fname, msg) {
    this._write("DEBUG", fname, msg);
  }
}
