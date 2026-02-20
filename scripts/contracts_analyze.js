import { list_servers } from "./utils.js"
import { arrayJumpingGame } from "./contracts/array_jumping_game.js";
import { algorithmicStockTrader1 } from "./contracts/algorithmic_stock_trader_1.js";
import { algorithmicStockTrader2 } from "./contracts/algorithmic_stock_trader_2.js";
import { algorithmicStockTrader3 } from "./contracts/algorithmic_stock_trader_3.js";
import { algorithmicStockTrader4 } from "./contracts/algorithmic_stock_trader_4.js";
import { findLargestPrimeFactor } from "./contracts/largest_prime_factor.js";
import { triangleMinimumPathSum } from "./contracts/minimum_path_sum_triangle.js"
import { findSquareRoot } from "./contracts/square_root.js";
import { uniquePathsInGrid1 } from "./contracts/unique_paths_grid_1.js";
import { uniquePathsInGrid2 } from "./contracts/unique_paths_grid_2.js";

class Contract {
  constructor(serverName, contractName, contractType, scriptPath, scriptCallback) {
    this.serverName = serverName;
    this.contractName = contractName;
    this.contractType = contractType;
    this.scriptPath = scriptPath;
    this.scriptCallback = scriptCallback;
  }

  toString() {
    return `Contract(Server: ${this.serverName}, Name: ${this.contractName}, Type: ${this.contractType}, Script: ${this.scriptPath})`;
  }
}

export function analyzeContractsServers(ns) {
  const servers = list_servers(ns);
  const interestingServers = servers.filter(s => ns.ls(s).find(f => f.endsWith("cct")));

  let solvableContracts = [];

  print("Interesting servers:");
  interestingServers.forEach(
    function (serverName) {
      const contracts = ns.ls(serverName).filter(f => f.endsWith("cct"))
      print(`\t - ${serverName} `)

      contracts.forEach(
        function (filename) {
          const contractType = ns.codingcontract.getContractType(filename, serverName);
          const contractScript = GetContractScript(contractType);
          if (contractScript) {
            solvableContracts.push(new Contract(serverName, filename, contractType, contractScript.scriptName, contractScript.scriptCallback));
            print(`\t\t[*] ${filename} (${contractType}). Script: ${contractScript.scriptName} `);
          } else {
            print(`\t\t${filename} (${contractType})`)
          }
        }
      )
    }
  )
  return solvableContracts

  /** Prints message both to stdout and log file */
  function print(msg) {
    ns.printf(msg);
    ns.tprint(msg);
  }

  function GetContractScript(contractType) {
    switch (contractType) {
      case ns.enums.CodingContractName.ArrayJumpingGame:
        return { scriptName: "array_jumping_game.js", scriptCallback: arrayJumpingGame };
      // Stock Trader
      case ns.enums.CodingContractName.AlgorithmicStockTraderI:
        return { scriptName: "algorithmic_stock_trader_1.js", scriptCallback: algorithmicStockTrader1 };
      case ns.enums.CodingContractName.AlgorithmicStockTraderII:
        return { scriptName: "algorithmic_stock_trader_2.js", scriptCallback: algorithmicStockTrader2 };
      case ns.enums.CodingContractName.AlgorithmicStockTraderIII:
        return { scriptName: "algorithmic_stock_trader_3.js", scriptCallback: algorithmicStockTrader3 };
      case ns.enums.CodingContractName.AlgorithmicStockTraderIV:
        return { scriptName: "algorithmic_stock_trader_4.js", scriptCallback: algorithmicStockTrader4 };

      case ns.enums.CodingContractName.FindLargestPrimeFactor:
        return { scriptName: "largest_prime_factor.js", scriptCallback: findLargestPrimeFactor };
      case ns.enums.CodingContractName.MinimumPathSumInATriangle:
        return { scriptName: "minimum_path_sum_triangle.js", scriptCallback: triangleMinimumPathSum };
      case ns.enums.CodingContractName.SquareRoot:
        return { scriptName: "square_root.js", scriptCallback: findSquareRoot };
      // Unique Paths in a Grid
      case ns.enums.CodingContractName.UniquePathsInAGridI:
        return { scriptName: "unique_paths_grid_1.js", scriptCallback: uniquePathsInGrid1 };
      case ns.enums.CodingContractName.UniquePathsInAGridII:
        return { scriptName: "unique_paths_grid_2.js", scriptCallback: uniquePathsInGrid2 };

      // case ns.enums.CodingContractName.TotalWaysToSum:
      // return { scriptName: "total_ways_to_sum.js", scriptCallback: totalWaysToSum };
      default:
        return null;
    }
  }
}

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
  const defaultOptions = ["-h", "--help", "--tail"];

  return [...defaultOptions];
}

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([["help", false], ["h", false]]);
  if (args.help || args.h) {
    ns.tprint(`Usage: run ${ns.getScriptName()} `);
    ns.tprint("");
    ns.tprint("Analyzes coding contracts on all servers");

    return;
  }

  const solvableContracts = analyzeContractsServers(ns);
  ns.tprint(`=> Found ${solvableContracts.length} solvable contracts.`);
  // TODO: add statistics
}