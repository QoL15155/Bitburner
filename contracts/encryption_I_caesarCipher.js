import { printError } from "../utils/print.js";
/**
 * Encryption I: Caesar Cipher
 *
 * Caesar cipher is one of the simplest encryption technique.
 * It is a type of substitution cipher in which each letter in the plaintext is replaced by a letter some fixed number
 * of positions down the alphabet.
 * For example, with a left shift of 3, D would be replaced by A, E would become B, and A would become X
 * (because of rotation).
 *
 * You are given an array with two elements:
 * ["CLOUD ENTER VIRUS SHELL LINUX", 22]
 * The first element is the plaintext, the second element is the left shift value.
 *
 *
 * @returns the ciphertext as uppercase string. Spaces remains the same.
 */

export function caesarCipher([plaintext, shift]) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  plaintext = plaintext.toUpperCase();

  let ciphertext = "";
  for (let i = 0; i < plaintext.length; i++) {
    if (!alphabet.includes(plaintext[i])) {
      ciphertext += plaintext[i];
      continue;
    }
    let charValue = plaintext.charCodeAt(i);
    charValue -= "A".charCodeAt(0);
    charValue = (charValue - shift) % 26;
    if (charValue < 0) {
      charValue += 26;
    }

    charValue += "A".charCodeAt(0);
    ciphertext += String.fromCharCode(charValue);
  }
  return ciphertext;
}

function testCase(ns, testNum, [plaintext, shift], expected) {
  const result = caesarCipher([plaintext, shift]);
  if (result !== expected) {
    printError(
      ns,
      `Failed TestCase #${testNum}. Expected ${expected}, but got ${result}`,
    );
    return false;
  }
  ns.tprint(`[V] TestCase #${testNum} passed.`);
  return true;
}

function runTests(ns) {
  testCase(ns, 1, ["DEA", 3], "ABX");

  let expected = "GPSYH IRXIV ZMVYW WLIPP PMRYB";
  testCase(ns, 2, ["CLOUD ENTER VIRUS SHELL LINUX", 22], expected);
}

/** @param {NS} ns */
export async function main(ns) {
  runTests(ns);
}
