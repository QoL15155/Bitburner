/**
Array Jumping Game

You are given the following array of integers:

9,10,7,0,2,6,8,8,3,0,10,8,3,0,0,6,4,8,8,7,4,10

Each element in the array represents your MAXIMUM jump length at that position.
This means that if you are at position i and your maximum jump length is n, you can jump to any position from i to i+n.

Assuming you are initially positioned at the start of the array, determine whether you are able to reach the last index.

Your answer should be submitted as 1 or 0, representing true and false respectively.
 */

function jumpingRecursive(jumpingArray, position) {
  const maxJump = jumpingArray[position];
  if (position + maxJump >= jumpingArray.length - 1) {
    return [position];
  }

  for (let i = 0; i < maxJump; i++) {
    const result = jumpingRecursive(jumpingArray, position + i + 1);
    if (result != null) {
      // add to the beginning of the array
      result.unshift(position);
      return result;
    }
  }
  return null;
}

/**
 * Jumping Array Game
 *
 * @param {string} jumpingArray - a comma-separated string of integers representing the maximum
 *          jump lengths at each position.
 * @return {number} 1 if you can jump to the end of the array, 0 otherwise.
 */
export function arrayJumpingGame(jumpingArray) {
  // convert to array
  // jumpingArray = jumpingArray.map(Number);
  // jumpingArray = jumpingArray.split(",").map(Number);

  const jumpingPath = jumpingRecursive(jumpingArray, 0);
  if (jumpingPath != null) {
    return 1;
  }

  // No jumping path found
  return 0;
}

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([
    ["help", false],
    ["h", false],
  ]);
  const jumpingArray = args._[0];
  if (args.help || args.h || !jumpingArray) {
    ns.tprint(`> Usage: run ${ns.getScriptName()} [ JUMPING_ARRAY ]`);
    ns.tprint("");
    ns.tprint("Array Jumping Game.");
    ns.tprint(
      " Determine if you can jump to the end of the array given the maximum jump lengths at each position.",
    );
    ns.tprint("");
    ns.tprint(` Example: run ${ns.getScriptName()} 1,1,0,1`);
    ns.tprint("");
    ns.tprint("Arguments");
    ns.tprint("==========");
    ns.tprint(
      "\tJUMPING_ARRAY : a comma-separated string of integers representing the maximum jump lengths at each position.",
    );
    return;
  }

  ns.tprint(`Jump Lengths: ${jumpingArray}, type: ${typeof jumpingArray}`);
  const jumpingArrayNumbers = jumpingArray.split(",").map(Number);
  const jumpingPath = jumpingRecursive(jumpingArrayNumbers, 0);
  ns.tprint(`Jumping Path: ${jumpingPath}`);

  // Run the official solution for the contract
  const officialResult = arrayJumpingGame(jumpingArray);
  ns.tprint(`Official Result: ${officialResult}`);
}
