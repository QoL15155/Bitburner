import { printError } from "../utils_print.js";
/**
Merge Overlapping Intervals

Given the following array of arrays of numbers representing a list of intervals, merge all overlapping intervals.

[[12,19],[12,17],[24,27],[10,15],[5,12],[25,28],[16,24],[25,32],[3,7],[10,17],[21,25],[12,15],[14,20],[8,11],[10,18],[15,20],[7,9]]

Example:

[[1, 3], [8, 10], [2, 6], [10, 16]]

would merge into [[1, 6], [8, 16]].

The intervals must be returned in ASCENDING order. 
You can assume that in an interval, the first number will always be smaller than the second.

If your solution is an empty string, you must leave the text box empty. 
Do not use "", '', or ``.
*/

export function mergeOverlappingIntervals(intervalsArray) {
    // Sort intervals based on the starting point
    intervalsArray.sort((a, b) => a[0] - b[0]);

    let mergedInternals = [];
    let currentPair = null;
    for (const pair of intervalsArray) {
        if (currentPair == null) {
            currentPair = pair;
            continue;
        }

        if (pair[0] <= currentPair[1]) {
            // Merge items
            currentPair[1] = Math.max(pair[1], currentPair[1]);
            continue;
        }

        // Items cannot be merged. 
        mergedInternals.push(currentPair);
        currentPair = pair;
    }
    if (currentPair != null) {
        mergedInternals.push(currentPair);
    }
    return mergedInternals;
}


function runTests(ns) {
    let testCase = [[1, 3], [8, 10], [2, 6], [10, 16]];
    let expected = [[1, 6], [8, 16]];
    doTest(ns, 1, testCase, expected);

    testCase = [[24, 29], [19, 26], [19, 20], [2, 10], [15, 19], [13, 22], [14, 24], [1, 7], [4, 8], [6, 15],]
    expected = [[1, 29]];
    doTest(ns, 2, testCase, expected);

    testCase = [[12, 19], [12, 17], [24, 27], [10, 15], [5, 12], [25, 28], [16, 24], [25, 32], [3, 7], [10, 17], [21, 25], [12, 15], [14, 20], [8, 11], [10, 18], [15, 20], [7, 9]];
    expected = [[3, 32]]
    doTest(ns, 3, testCase, expected);

    testCase = [[25, 28], [11, 21], [15, 20], [1, 5], [13, 18], [19, 23], [22, 29], [16, 19], [24, 29], [17, 24], [4, 6], [2, 11], [21, 24]];
    expected = [[1, 29]];
    doTest(ns, 4, testCase, expected);

    // testCase = [[12,16],[25,34],[15,16],[12,15]]
}

function doTest(ns, testNum, intervals, expected) {

    const result = mergeOverlappingIntervals(intervals);
    const expectedString = JSON.stringify(expected);
    const resultString = JSON.stringify(result);
    if (resultString !== expectedString) {
        printError(ns, `Failed TestCase #${testNum}. Expected ${expectedString}, but got ${resultString}`);
        return false
    }
    ns.tprint(`[V] TestCase #${testNum} passed.`);
    return true;
}


/** @param {NS} ns */
export async function main(ns) {
    runTests(ns);
}