import { list_servers } from "./utils.js"
import { triangleMinimumPathSum } from "./contracts/minimum_path_sum_triangle.js"
import { algorithmicStockTrader2 } from "./contracts/algorithmic_stock_trader_2.js";

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
      case ns.enums.CodingContractName.AlgorithmicStockTraderII:
        return { scriptName: "algorithmic_stock_trader_2.js", scriptCallback: algorithmicStockTrader2 };
      // case ns.enums.CodingContractName.AlgorithmicStockTraderIII:
      //   return { scriptName: "algorithmic_stock_trader_3.js", scriptCallback: triangleMinimumPathSum };
      case ns.enums.CodingContractName.MinimumPathSumInATriangle:
        return { scriptName: "minimum_path_sum_triangle.js", scriptCallback: triangleMinimumPathSum };
      // TODO: need to make sure regarding the BigInt support.
      // case ns.enums.CodingContractName.SquareRoot:
      //     return "square_root.js";
      default:
        return null;
    }
  }


  // function GetContractScript(contractType) {
  //   switch (contractType) {
  //     case ns.enums.CodingContractName.AlgorithmicStockTraderII:
  //       return "algorithmic_stock_trader_2.js";
  //     case ns.enums.CodingContractName.MinimumPathSumInATriangle:
  //       return "fake.js";
  //     case ns.enums.CodingContractName.SquareRoot:
  //       return "square_root.js";
  //     default:
  //       return null;
  //   }
  // }
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

  analyzeContractsServers(ns);
}