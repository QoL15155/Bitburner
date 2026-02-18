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
        return n
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
        }
        else {
            right = mid - 1n;
        }
    }

    // ns.printf(`"Failed to find exact square root. Returning closest lower integer: ${right}`);
    return right;
}


/** @param {NS} ns */
export async function main(ns) {
    test();

    function test() {
        const bigIntStr = BigInt("82174920767709014264359125774247005983182641454218761959062312234050539703754855634631421327126005298067841039438961274596837489905885403880047665014778464110341685880615090761126564813764930460666300");
        const expectedResult = BigInt("9065038376516064935415161598025316019457048828155601103176631684846031317435548509562494382498976300");
        const result = findSquareRoot(bigIntStr);
        if (result !== expectedResult) {
            ns.alert(`Test failed. Expected ${expectedResult}, but got ${result}`);
        }

        const input2 = BigInt("130493527461448832591871443261380007128546257302069986531746312828044833334965835148209383490948881394796368823845710700841871980749486227178944296537154680096725614794923831824238893533600360702884961");
        const expectedResult2 = BigInt("11423376359966821674072478097888243535751814988724998178438938295109692305804108169936495844553844639");
        const result2 = findSquareRoot(input2);
        if (result2 !== expectedResult2) {
            ns.alert(`Test failed. Expected ${expectedResult2}, but got ${result2}`);
        }

        ns.tprint("Finished running tests");
    }
}