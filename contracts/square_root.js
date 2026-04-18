import { printError, print } from "/utils/print.js";
/**
 * Square Root
 *
 * You are given a ~200 digit BigInt.
 * Find the square root of this number, to the nearest integer.
 *
 * The input is a BigInt value.
 * The answer must be the string representing the solution's BigInt value.
 * The trailing "n" is not part of the string.
 *
 * Hint: If you are having trouble, you might consult
 * https://en.wikipedia.org/wiki/Methods_of_computing_square_roots
 */

export function findSquareRoot(n) {
  n = BigInt(n);

  if (n < 2n) {
    return n;
  }

  let left = 1n;
  let right = n;

  while (left <= right) {
    const mid = (left + right) / 2n;
    const midSquared = mid * mid;

    if (midSquared === n) {
      return mid;
    } else if (midSquared < n) {
      left = mid + 1n;
    } else {
      right = mid - 1n;
    }
  }

  const leftSquared = left * left;
  const rightSquared = right * right;
  if (leftSquared - n < n - rightSquared) {
    // ns.printf(`Failed to find exact square root. Returning closest higher integer: ${left}`);
    return left;
  }

  // ns.printf(`"Failed to find exact square root. Returning closest lower integer: ${right}`);
  return right;
}

function test(ns) {
  let number = BigInt(
    "82174920767709014264359125774247005983182641454218761959062312234050539703754855634631421327126005298067841039438961274596837489905885403880047665014778464110341685880615090761126564813764930460666300",
  );
  let expectedResult = BigInt(
    "9065038376516064935415161598025316019457048828155601103176631684846031317435548509562494382498976300",
  );
  performTest(1, number, expectedResult);

  // FIXME: this test currently fails (expected *lower* number). But this might be ok.
  number = BigInt(
    "130493527461448832591871443261380007128546257302069986531746312828044833334965835148209383490948881394796368823845710700841871980749486227178944296537154680096725614794923831824238893533600360702884961",
  );
  expectedResult = BigInt(
    "11423376359966821674072478097888243535751814988724998178438938295109692305804108169936495844553844639",
  );
  performTest(2, number, expectedResult);

  number = BigInt(
    "215995057448243115908111577069443612751962068497025094297290073891500199650392518478196021975496074149959058101339064599775497789349242697632426822684806116807454042952958058089530534169208410690109664",
  );
  expectedResult = BigInt(
    "14696770306711713588633295771575023504890559054472790890341768440658621854914547433786086294733162394",
  );
  performTest(3, number, expectedResult);

  number = BigInt(
    "83871190181778405930934787411564167619964724528469343074346398048146847667280472539192790200007285450499690232242925611089517216884187990289555750953851523984762372272295854270549193846304948120113987",
  );
  expectedResult = BigInt(
    "9158121542203859937311870878942052355620557139991833384754665989044077107563965285136873330267982688",
  );
  performTest(4, number, expectedResult);

  ns.tprint("Finished running tests");

  function performTest(n, input, expected_result) {
    const result = findSquareRoot(input);
    if (result !== expected_result) {
      printError(
        ns,
        `Test Case #${n} failed.\nExpected ${expected_result}\nReceived ${result}`,
      );
    } else {
      print(ns, `Test Case #${n} passed`);
    }
  }
}

/** @param {NS} ns */
export async function main(ns) {
  test(ns);
}
