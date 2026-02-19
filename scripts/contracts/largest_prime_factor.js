/**
Find Largest Prime Factor
A prime factor is a factor that is a prime number. What is the largest prime factor of 971392119?
 */


export function findLargestPrimeFactor(n) {
    n = BigInt(n);
    let largestFactor = 1n;

    while (n % 2n === 0n) {
        largestFactor = 2n;
        n /= 2n;
    }

    // n must be odd at this point, so we can skip even numbers
    for (let i = 3n; i * i <= n; i += 2n) {
        while (n % i === 0n) {
            largestFactor = i;
            n /= i;
        }
    }

    // Make sure n is a prime number greater than 2
    if (n > 2n) {
        largestFactor = n;
    }
    return largestFactor;
}

/** @param {NS} ns */
export async function main(ns) {
    const args = ns.flags([["help", false], ["h", false]]);
    const primeNumber = args._[0];
    if (args.help || args.h) {
        ns.tprint(`> Usage: run ${ns.getScriptName()} [ PRIME_NUMBER ]`);
        ns.tprint("");
        ns.tprint("Find the largest prime factor of a number.  ");
        ns.tprint("");
        ns.tprint("Arguments");
        ns.tprint("==========");
        ns.tprint("\tPRIME_NUMBER : the number to find the largest prime factor of. ");
        ns.tprint("\tIf not specified, the script will run tests.");
        return;
    }

    if (primeNumber) {
        const result = findLargestPrimeFactor(primeNumber);
        ns.tprint(`The largest prime factor of ${primeNumber} is ${result}`);
    }
    else {
        test();
    }

    function test() {
        if (findLargestPrimeFactor(56086774) != 1649611) {
            ns.alert(`Test failed for largestPrimeFactor. Expected 1649611, but got ${findLargestPrimeFactor(56086774)}`);
        }
        if (findLargestPrimeFactor(971392119) != 17041967) {
            ns.alert(`Test failed for largestPrimeFactor. Expected 17041967, but got ${findLargestPrimeFactor(971392119)}`);
        }

        if (findLargestPrimeFactor(912736500) != 46807) {
            ns.alert(`Test failed for largestPrimeFactor. Expected 46807, but got ${findLargestPrimeFactor(912736500)}`);
        }
    }
}