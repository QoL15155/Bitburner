import { describe, it, expect } from "vitest";
import { hammingCodeBinaryToInteger } from "../../scripts/contracts/hamming_codes_binary_to_integer.js";

describe("Hamming Codes: Binary to Integer", () => {
  it("should decode 11110000 to 8", () => {
    expect(hammingCodeBinaryToInteger("11110000")).toBe(8);
  });

  it("should decode 1001101010 with error correction to 21", () => {
    expect(hammingCodeBinaryToInteger("1001101010")).toBe(21);
  });

  it("should decode long binary string", () => {
    expect(
      hammingCodeBinaryToInteger(
        "0010100010000000000000011011101111111000001001011110110011101011",
      ),
    ).toBe(953418116331);
  });
});
