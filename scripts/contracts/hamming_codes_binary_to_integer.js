/**
 * HammingCodes: Encoded Binary to Integer

You are given the following encoded binary string:
'1100000000000000000110010100001100011110101010000100101011101111'

Decode it as an 'extended Hamming code' and convert it to a decimal value.
The binary string may include leading zeroes.
A parity bit is inserted at position 0 and at every position N where N is a power of 2.
Parity bits are used to make the total number of '1' bits in a given set of data **even**.
The parity bit at position 0 considers all bits including parity bits.
Each parity bit at position 2^N alternately considers 2^N bits then ignores 2^N bits, starting at position 2^N.
The endianness of the parity bits is reversed compared to the endianness of the data bits:
Data bits are encoded most significant bit first and the parity bits encoded least significant bit first.
The parity bit at position 0 is set last.

There is a ~55% chance for an altered bit at a random index.
Find the possible altered bit, fix it and extract the decimal value.

Examples:

'11110000' passes the parity checks and has data bits of 1000, which is 8 in binary.
'1001101010' fails the parity checks and needs the last bit to be corrected to get '1001101011', after which the data bits are found to be 10101, which is 21 in binary.

For more information on the 'rule' of encoding, refer to Wikipedia (https://wikipedia.org/wiki/Hamming_code) or the 3Blue1Brown videos on Hamming Codes. (https://youtube.com/watch?v=X8jsijhllIA)
 */

import { printError } from "../utils_print.js";

const Position = {
    Unknown: -1,
    Flipped: 0,
    Good: 1,
}

/** @return highest order of 2 */
function getParityPosition(len) {
    const powerOf2 = Math.floor(getBaseLog(2, len));
    return Math.pow(2, powerOf2);

    function getBaseLog(base, num) {
        return Math.log(num) / Math.log(base);
    }
}

/** 
 * @returns true when the bit checks out. (to update isFlipped)
*/
function checkParityBit(initialPosition, binaryCode, positionArray, isFlipped) {
    let positions = [];

    // Count ones
    const indexAdvance = Math.max(1, 2 * initialPosition);
    let countOnes = 0;
    for (let i = initialPosition; i < binaryCode.length; i += indexAdvance) {
        positions.push(i);
        countOnes += isOne(i);

        for (let j = i + 1; j < i + initialPosition && j < binaryCode.length; j++) {
            positions.push(j);
            countOnes += isOne(j);
        }
    }

    if (countOnes % 2 == 0) {
        // Parity checks out. Update corresponding bits
        for (let pos of positions) {
            positionArray[pos] = Position.Good;
        }
        return true;
    }

    // One of the bits have been flipped

    if (!isFlipped) {
        // This is the first time we find a faulty position. 
        // Update 'Flipped' on all relevant positions
        for (let pos of positions) {
            if (positionArray[pos] == Position.Unknown) {
                positionArray[pos] = Position.Flipped;
            }
        }
    }

    // We assume there is only one bad parity-bit. So whatever is not in *positions* array should be good.
    for (let index = 0; index < positionArray.length; index++) {
        if (positions.indexOf(index) == -1) {
            // if (positionArray[index] == Position.Unknown) {
            positionArray[index] = Position.Good;
        }
    }
    return false;

    function isOne(idx) {
        return binaryCode[idx] == "1";
    }
}


function sanitizePositionsArray(positionsArray, wasFaultFound) {
    let faultCorrected = false;
    for (let idx in positionsArray) {
        switch (positionsArray[idx]) {
            case Position.Good:
                break;
            case Position.Flipped:
                if (wasFaultFound) {
                    if (faultCorrected) {
                        throw new Error(`More than one fault has been found. Position (${idx}): ${JSON.stringify(positionsArray)}`);
                    }
                } else {
                    throw new Error(`Found a flipped position in an 'un-faulted' code at idx ${idx}`);
                }
                faultCorrected = true;
                break;
            default:
                throw new Error(`Unexpected position in positions array: idx: ${idx}, Position: ${positionsArray[idx]}`);
        }
    }
}


function getNumericalValue(binaryCode, positionsArray) {
    // Read numerical number
    const initialDataPosition = 3;
    let parityPosition = 4;  // initial parity position
    let resultCode = "";
    for (let idx = initialDataPosition; idx < binaryCode.length; idx++) {
        if (idx != parityPosition) {
            if (positionsArray[idx] == Position.Good) {
                resultCode += binaryCode[idx]
            } else {
                resultCode += binaryCode[idx] == "1" ? "0" : "1";

            }
        } else {
            // Skip parity position
            parityPosition *= 2;
        }
    }
    resultCode = parseInt(resultCode, 2);
    return resultCode;
}

/** 
 * Decodes a binary string encoded with an extended Hamming code and converts it to a decimal value.
 * If a single bit is found to be altered, it is corrected before decoding.
 * 
 * Assumes only one bit may be altered.
 *
 * @param {string} binaryCode - the encoded binary string to decode
 * @returns {number} the decoded decimal value
 */
export function hammingCodeBinaryToInteger(binaryCode) {
    let positionsArray = new Array(binaryCode.length).fill(Position.Unknown);
    const len = binaryCode.length - 1;

    // Check parity bit
    let parityPosition = getParityPosition(len);
    let wasFaultFound = false;
    for (let idx = len; idx >= 0; idx--) {
        if (parityPosition != idx) {
            continue;
        }

        const isSuccess = checkParityBit(idx, binaryCode, positionsArray, wasFaultFound);
        wasFaultFound |= !isSuccess;
        parityPosition = Math.floor(parityPosition / 2);
    }

    sanitizePositionsArray(positionsArray, wasFaultFound);
    return getNumericalValue(binaryCode, positionsArray);
}

function testBinaryToInteger(ns) {
    let testCase = "11110000";
    runTest(1, testCase, 8);

    testCase = "1001101010";
    runTest(2, testCase, 21);

    testCase = "0010100010000000000000011011101111111000001001011110110011101011";
    runTest(3, testCase, 953418116331);


    function runTest(n, testCase, expected) {
        const result = hammingCodeBinaryToInteger(testCase);
        if (result != expected) {
            printError(ns, `TestCase #${n} failed. Expected ${expected}, got ${result}`);
        } else {
            ns.tprint(`TestCase #${n} passed.`);
        }
    }
}

function test(ns) {
    testBinaryToInteger(ns);
}

/** @param {NS} ns */
export async function main(ns) {
    test(ns);
}

