import {
  getContractScript,
  searchForServerContracts,
} from "./utils/contracts.js";

const contractFactionRegex = new RegExp("contract\-[0-9]*\-(.*)\.cct$");

class Contract {
  constructor(
    serverName,
    contractName,
    contractType,
    scriptPath,
    scriptCallback,
    associatedFaction = null,
  ) {
    this.serverName = serverName;
    this.contractName = contractName;
    this.contractType = contractType;
    this.scriptPath = scriptPath;
    this.scriptCallback = scriptCallback;
    this.associatedFaction = associatedFaction;
  }

  toString() {
    if (this.scriptPath) {
      return `Contract(Server: ${this.serverName}, Name: ${this.contractName}, Type: ${this.contractType}, Script: ${this.scriptPath})`;
    }

    return `Contract(Server: ${this.serverName}, filename: ${this.contractName}, Type: ${this.contractType})`;
  }
}

export function analyzeContractsServers(ns, logToConsole = true) {
  let availableContracts = [];
  const serversWithContracts = searchForServerContracts(ns);

  print("Interesting servers:");
  serversWithContracts.forEach(function (serverData) {
    let serverName = serverData.serverName;
    print(`\t - ${serverName} `);

    serverData.contracts.forEach(function (contractName) {
      const contractType = ns.codingcontract.getContractType(
        contractName,
        serverName,
      );
      const contractScript = getContractScript(ns, contractType);
      let associatedFaction = getAssociatedFaction(contractName);
      if (contractScript) {
        const contract = new Contract(
          serverName,
          contractName,
          contractType,
          contractScript.scriptName,
          contractScript.scriptCallback,
          associatedFaction,
        );
        availableContracts.push(contract);
        print(
          `\t\t[*] ${contractName} (${contractType}). Script: ${contractScript.scriptName}`,
        );
      } else {
        const contract = new Contract(
          serverName,
          contractName,
          contractType,
          null,
          null,
          associatedFaction,
        );
        availableContracts.push(contract);
        print(`\t\t${contractName} (${contractType})`);
      }
    });
  });

  return availableContracts;

  function getAssociatedFaction(contractName) {
    const factionMatch = contractName.match(contractFactionRegex);
    return factionMatch ? factionMatch[1] : null;
  }

  /** Prints message both to stdout and log file */
  function print(msg) {
    ns.printf(msg);
    if (logToConsole) {
      ns.tprint(msg);
    }
  }
}

/**
 * List all factions with associated contracts and number of contracts for each faction
 *
 * @param {NS} ns - the NS object provided by Bitburner
 * @param {Contract[]} contracts - array of Contract objects to analyze
 */
function listFactions(ns, contracts) {
  const factionMap = {};
  contracts.forEach((c) => {
    if (c.associatedFaction) {
      if (!factionMap[c.associatedFaction]) {
        factionMap[c.associatedFaction] = [];
      }
      factionMap[c.associatedFaction].push(c);
    }
  });

  ns.tprint("Factions with associated contracts:");
  for (const [factionName, contracts] of Object.entries(factionMap)) {
    ns.tprint(`\t - ${factionName}: ${contracts.length} contract(s)`);
  }
}

/**
 * List all contracts associated with a given faction
 *
 * @param {NS} ns - the NS object provided by Bitburner
 * @param {string} factionName - the name of the faction to filter contracts by
 * @param {Contract[]} contracts - array of Contract objects to analyze
 */
function showFactionContracts(ns, factionName, contracts) {
  const filteredContracts = contracts.filter(
    (c) => c.associatedFaction && c.associatedFaction.indexOf(factionName) > -1,
  );

  ns.tprint(
    `=> Contracts associated with faction '${factionName}': (${filteredContracts.length})`,
  );
  filteredContracts.forEach((c) => ns.tprint(`\t - ${c}`));
}

/**
 * List all unsolved contract types and the number of contracts for each type
 *
 * @param {NS} ns - the NS object provided by Bitburner
 * @param {Contract[]} contracts - array of Contract objects to analyze
 */
function listUnsolvedContractTypes(ns, contracts) {
  const contractTypes = {};
  contracts.forEach((c) => {
    if (!c.scriptCallback) {
      if (!contractTypes[c.contractType]) {
        contractTypes[c.contractType] = [];
      }
      contractTypes[c.contractType].push(c);
    }
  });

  // Sort contract types by number of contracts
  const sortedTypes = Object.entries(contractTypes).sort(
    (a, b) => b[1].length - a[1].length,
  );
  const sortedTypeMap = {};
  sortedTypes.forEach(([type, contracts]) => {
    sortedTypeMap[type] = contracts;
  });
  ns.tprint("Unsolved contract types:");
  for (const [typeName, contracts] of Object.entries(sortedTypeMap)) {
    ns.tprint(`\t - ${contracts.length}\t${typeName}`);
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

  let loggingOptions = ["--silent", "-s"];
  let statisticsOptions = ["--factions", "--contract_types"];

  if (args.some((a) => helpOptions.includes(a))) {
    return [];
  }

  if (args.some((a) => loggingOptions.includes(a))) {
    loggingOptions = [];
  }

  return [...defaultOptions, ...loggingOptions, ...statisticsOptions];
}

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([
    ["help", false],
    ["h", false],
    ["silent", false],
    ["s", false],
    ["factions", false],
    ["contract_types", false],
  ]);
  if (args.help || args.h) {
    ns.tprint(`Usage: run ${ns.getScriptName()} [FACTION]]`);
    ns.tprint("");
    ns.tprint("Analyzes coding contracts on all servers");
    ns.tprint("");
    ns.tprint("Arguments");
    ns.tprint("==========");
    ns.tprint("\t--help : show this help message");
    ns.tprint("\t--silent, -s : disable logging to console. Only log to file.");
    ns.tprint(
      "\tFACTION : List contracts for faction. Partial match is supported.",
    );
    ns.tprint("\t--factions : list all factions with associated contracts.");
    ns.tprint("\t--contract_types : list all unsolvable contract types.");
    ns.tprint("");
    ns.tprint("Example:");
    ns.tprint(`> run ${ns.getScriptName()} --factions`);
    return;
  }

  let isSilent = false;
  if (args.silent || args.s) {
    isSilent = true;
  }

  const searchedFaction = args._[0];

  const availableContracts = analyzeContractsServers(ns, !isSilent);
  const solvableContracts = availableContracts.filter(
    (c) => c.scriptCallback !== null,
  );

  ns.tprint(
    `=> Found ${solvableContracts.length}/${availableContracts.length} solvable contracts.`,
  );

  // Statistics

  if (args.factions) {
    listFactions(ns, availableContracts);
  }
  if (searchedFaction) {
    showFactionContracts(ns, searchedFaction, availableContracts);
  }

  if (args.contract_types) {
    listUnsolvedContractTypes(ns, availableContracts);
  }
}
