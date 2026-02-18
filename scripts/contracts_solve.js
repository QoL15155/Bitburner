import { analyzeContractsServers } from "./contracts_analyze.js"

export function solveContract(ns, contract) {
    print(`Solving contract ${contract}`);

    const contractData = ns.codingcontract.getData(contract.contractName, contract.serverName);
    ns.printf(`Contract Data: ${JSON.stringify(contractData)}`);
    const contractAnswer = contract.scriptCallback(contractData);
    if (!contractAnswer) {
        ns.tprint(`Failed to solve contract ${contract}. No answer found.`);
        return;
    }
    ns.printf(`Contract Answer: ${contractAnswer}`);
    const result = ns.codingcontract.attempt(contractAnswer, contract.contractName, contract.serverName);
    if (result) {
        ns.tprint(result);
    } else {
        ns.print(`Failed to solve contract. ${result}`);
    }

    /** Prints message both to stdout and log file */
    function print(msg) {
        ns.printf(msg);
        ns.tprint(msg);
    }
}

/** @param {NS} ns */
export async function main(ns) {
    const args = ns.flags([["help", false], ["h", false]]);
    if (args.help || args.h) {
        ns.tprint("This script analyzes all coding contracts on all servers and finds the ones that can be solved with existing scripts.");
        ns.tprint(`Usage: run ${ns.getScriptName()}`);
        ns.tprint("Example:");
        ns.tprint(`> run ${ns.getScriptName()}`);
        return;
    }

    const solvableContracts = analyzeContractsServers(ns);
    ns.tprint(`=> Found ${solvableContracts.length} solvable contracts.`);
    solvableContracts.forEach(solveContract.bind(null, ns));

}