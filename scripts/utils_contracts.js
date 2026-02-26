import { listServers } from "./utils.js"
import { algorithmicStockTrader1 } from "./contracts/algorithmic_stock_trader_1.js";
import { algorithmicStockTrader2 } from "./contracts/algorithmic_stock_trader_2.js";
import { algorithmicStockTrader3 } from "./contracts/algorithmic_stock_trader_3.js";
import { algorithmicStockTrader4 } from "./contracts/algorithmic_stock_trader_4.js";
import { arrayJumpingGame } from "./contracts/array_jumping_game.js";
import { caesarCipher } from "./contracts/encryption_I_caesarCipher.js";
import { findLargestPrimeFactor } from "./contracts/largest_prime_factor.js";
import { findSquareRoot } from "./contracts/square_root.js";
import { mergeOverlappingIntervals } from "./contracts/merge_overlapping_intervals.js";
import { triangleMinimumPathSum } from "./contracts/minimum_path_sum_triangle.js"
import { uniquePathsInGrid1 } from "./contracts/unique_paths_grid_1.js";
import { uniquePathsInGrid2 } from "./contracts/unique_paths_grid_2.js";
import { hammingCodeBinaryToInteger } from "./contracts/hamming_codes_binary_to_integer.js";


export function searchForServerContracts(ns) {
    const listedServers = listServers(ns);

    let contracts = [];
    listedServers.forEach(server => {
        const serverContracts = ns.ls(server).filter(f => f.endsWith("cct"))
        if (serverContracts.length > 0) {
            contracts.push({ serverName: server, contracts: serverContracts });
        }
    });
    return contracts;
}

/**
 * Returns the script name and callback function for a given contract type, 
 * or null if the contract type is not supported.
 * 
 * @param {NS} ns - the NS object provided by Bitburner
 * @param {string} contractType - the type of the contract
 * @returns {{scriptName: string, scriptCallback: function} | null} 
 *      an object containing the script name and callback function for the contract type, 
 *      or null if the contract type is not supported
 */
export function getContractScript(ns, contractType) {
    switch (contractType) {
        // Stock Trader
        case ns.enums.CodingContractName.AlgorithmicStockTraderI:
            return { scriptName: "algorithmic_stock_trader_1.js", scriptCallback: algorithmicStockTrader1 };
        case ns.enums.CodingContractName.AlgorithmicStockTraderII:
            return { scriptName: "algorithmic_stock_trader_2.js", scriptCallback: algorithmicStockTrader2 };
        case ns.enums.CodingContractName.AlgorithmicStockTraderIII:
            return { scriptName: "algorithmic_stock_trader_3.js", scriptCallback: algorithmicStockTrader3 };
        case ns.enums.CodingContractName.AlgorithmicStockTraderIV:
            return { scriptName: "algorithmic_stock_trader_4.js", scriptCallback: algorithmicStockTrader4 };

        case ns.enums.CodingContractName.ArrayJumpingGame:
            return { scriptName: "array_jumping_game.js", scriptCallback: arrayJumpingGame };

        case ns.enums.CodingContractName.EncryptionICaesarCipher:
            return { scriptName: "encryption_I_caesarCipher.js", scriptCallback: caesarCipher };

        case ns.enums.CodingContractName.HammingCodesEncodedBinaryToInteger:
            return { scriptName: "hamming_codes_binary_to_integer.js", scriptCallback: hammingCodeBinaryToInteger };

        case ns.enums.CodingContractName.FindLargestPrimeFactor:
            return { scriptName: "largest_prime_factor.js", scriptCallback: findLargestPrimeFactor };
        case ns.enums.CodingContractName.MergeOverlappingIntervals:
            return { scriptName: "merge_overlapping_intervals.js", scriptCallback: mergeOverlappingIntervals };
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