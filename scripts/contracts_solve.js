import { analyzeContractsServers } from "./contracts_analyze.js";

// Debug mode flag.
// When true, the script will not submit answers to contracts, allowing you to test and debug the solving logic without risking failed attempts.
// const debug = true;
const debug = false;

export function solveContract(ns, contract) {
  const fname = "solveContract";
  print(`[${fname}] Solving ${contract}`);

  const contractData = ns.codingcontract.getData(
    contract.contractName,
    contract.serverName,
  );
  if (typeof contractData !== "bigint") {
    ns.printf(`[${fname}] Contract Data : ${JSON.stringify(contractData)}`);
  } else {
    ns.printf(`[${fname}] Contract Data : ${contractData}`);
  }

  let contractAnswer = contract.scriptCallback(contractData);
  if (contractAnswer === null) {
    ns.tprint(`Failed to solve contract ${contract}. No answer found.`);
    return;
  }
  if (Array.isArray(contractAnswer)) {
    contractAnswer = JSON.stringify(contractAnswer);
  }
  ns.printf(
    `[${fname}] Contract Answer: ${contractAnswer} (${typeof contractAnswer})`,
  );

  if (debug) {
    ns.tprint(
      `Debug mode is ON. Not submitting the answer for contract ${contract}.`,
    );
    return;
  }

  const result = ns.codingcontract.attempt(
    contractAnswer.toString(),
    contract.contractName,
    contract.serverName,
  );
  if (result !== null) {
    ns.tprint(result);
  } else {
    ns.tprint(
      `[${fname}] Failed to solve contract '${contract.contractName}' from ${contract.serverName}. Result : ${result}`,
    );
    ns.alert(
      `[${fname}] Failed to solve contract '${contract.contractName}' from ${contract.serverName}. Result : ${result}`,
    );
  }

  /** Prints message both to stdout and log file */
  function print(msg) {
    ns.printf(msg);
    ns.tprint(msg);
  }
}

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
  const helpOptions = ["-h", "--help"];
  const defaultOptions = helpOptions.concat("--tail");

  if (args.some((a) => helpOptions.includes(a))) {
    return [];
  }

  return [...defaultOptions];
}

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([
    ["help", false],
    ["h", false],
  ]);
  if (args.help || args.h) {
    ns.tprint(`Usage: run ${ns.getScriptName()}`);
    ns.tprint("");
    ns.tprint("Contract Solver.");
    ns.tprint(
      "Analyzes all coding contracts on all servers and finds the ones that can be solved with existing scripts, then solves them.",
    );
    return;
  }

  const availableContracts = analyzeContractsServers(ns);
  const solvableContracts = availableContracts.filter(
    (c) => c.scriptCallback !== null,
  );

  ns.tprint(
    `=> Found ${solvableContracts.length}/${availableContracts.length} solvable contracts.`,
  );
  solvableContracts.forEach(solveContract.bind(null, ns));
}
