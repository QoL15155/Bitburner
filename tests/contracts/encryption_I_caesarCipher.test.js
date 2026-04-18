import { describe, it, expect } from "vitest";
import { caesarCipher } from "../../contracts/encryption_I_caesarCipher.js";

describe("Caesar Cipher", () => {
  it("should shift DEA by 3 to ABX", () => {
    expect(caesarCipher(["DEA", 3])).toBe("ABX");
  });

  it("should shift full phrase with spaces", () => {
    expect(caesarCipher(["CLOUD ENTER VIRUS SHELL LINUX", 22])).toBe(
      "GPSYH IRXIV ZMVYW WLIPP PMRYB",
    );
  });

  it("should handle zero shift", () => {
    expect(caesarCipher(["HELLO", 0])).toBe("HELLO");
  });

  it("should handle full alphabet shift (26)", () => {
    expect(caesarCipher(["HELLO", 26])).toBe("HELLO");
  });

  it("should preserve spaces", () => {
    expect(caesarCipher(["A B C", 1])).toBe("Z A B");
  });

  it("should handle large shift", () => {
    expect(caesarCipher(["A", 27])).toBe("Z");
  });
});
