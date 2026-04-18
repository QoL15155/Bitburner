import { describe, it, expect } from "vitest";
import { findSquareRoot } from "../../contracts/square_root.js";

describe("Square Root", () => {
  it("should find exact square root of perfect square", () => {
    expect(findSquareRoot(16n)).toBe(4n);
  });

  it("should find square root of 0", () => {
    expect(findSquareRoot(0n)).toBe(0n);
  });

  it("should find square root of 1", () => {
    expect(findSquareRoot(1n)).toBe(1n);
  });

  it("should find nearest integer square root", () => {
    // sqrt(10) ≈ 3.16, nearest is 3
    expect(findSquareRoot(10n)).toBe(3n);
  });

  it("should handle large BigInt perfect square", () => {
    const number = BigInt(
      "82174920767709014264359125774247005983182641454218761959062312234050539703754855634631421327126005298067841039438961274596837489905885403880047665014778464110341685880615090761126564813764930460666300",
    );
    const expected = BigInt(
      "9065038376516064935415161598025316019457048828155601103176631684846031317435548509562494382498976300",
    );
    expect(findSquareRoot(number)).toBe(expected);
  });

  it("should find square root of large number", () => {
    const number = BigInt(
      "215995057448243115908111577069443612751962068497025094297290073891500199650392518478196021975496074149959058101339064599775497789349242697632426822684806116807454042952958058089530534169208410690109664",
    );
    const expected = BigInt(
      "14696770306711713588633295771575023504890559054472790890341768440658621854914547433786086294733162394",
    );
    expect(findSquareRoot(number)).toBe(expected);
  });
});
