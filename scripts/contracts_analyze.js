import { list_servers } from "./utils.js"
import { arrayJumpingGame } from "./contracts/array_jumping_game.js";
import { algorithmicStockTrader1 } from "./contracts/algorithmic_stock_trader_1.js";
import { algorithmicStockTrader2 } from "./contracts/algorithmic_stock_trader_2.js";
import { algorithmicStockTrader3 } from "./contracts/algorithmic_stock_trader_3.js";
import { findLargestPrimeFactor } from "./contracts/largest_prime_factor.js";
import { triangleMinimumPathSum } from "./contracts/minimum_path_sum_triangle.js"
import { findSquareRoot } from "./contracts/square_root.js";
import { uniquePathsInGrid } from "./contracts/unqiue_paths_grid_1.js";

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
      // TODO: make sure this works when result is 1 !
      // case ns.enums.CodingContractName.ArrayJumpingGame:
      // return { scriptName: "array_jumping_game.js", scriptCallback: arrayJumpingGame };
      // Stock Trader
      case ns.enums.CodingContractName.AlgorithmicStockTraderI:
        return { scriptName: "algorithmic_stock_trader_1.js", scriptCallback: algorithmicStockTrader1 };
      case ns.enums.CodingContractName.AlgorithmicStockTraderII:
        return { scriptName: "algorithmic_stock_trader_2.js", scriptCallback: algorithmicStockTrader2 };
      case ns.enums.CodingContractName.AlgorithmicStockTraderIII:
        return { scriptName: "algorithmic_stock_trader_3.js", scriptCallback: algorithmicStockTrader3 };
      // case ns.enums.CodingContractName.AlgorithmicStockTraderIV:
      // return { scriptName: "algorithmic_stock_trader_4.js", scriptCallback: null };

      case ns.enums.CodingContractName.FindLargestPrimeFactor:
        return { scriptName: "largest_prime_factor.js", scriptCallback: findLargestPrimeFactor };
      case ns.enums.CodingContractName.MinimumPathSumInATriangle:
        return { scriptName: "minimum_path_sum_triangle.js", scriptCallback: triangleMinimumPathSum };
      case ns.enums.CodingContractName.SquareRoot:
        return { scriptName: "square_root.js", scriptCallback: findSquareRoot };
      // Unique Paths in a Grid
      case ns.enums.CodingContractName.UniquePathsInAGridI:
        return { scriptName: "unqiue_paths_grid_1.js", scriptCallback: uniquePathsInGrid };

      // case ns.enums.CodingContractName.TotalWaysToSum:
      // return { scriptName: "total_ways_to_sum.js", scriptCallback: totalWaysToSum };
      default:
        return null;
    }
  }
}

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([["help", false], ["h", false]]);
  if (args.help || args.h) {
    ns.tprint("This script helps you find an unsolved coding contract.");
    ns.tprint(`Usage: run ${ns.getScriptName()} `);
    ns.tprint("Example:");
    ns.tprint(`> run ${ns.getScriptName()} `);
    return;
  }

  const solvableContracts = analyzeContractsServers(ns);
  ns.tprint(`=> Found ${solvableContracts.length} solvable contracts.`);
  // TODO: add statistics
}