# Bitburner Scripts

A collection of scripts for [Bitburner](https://github.com/bitburner-official/bitburner-src) — a programming-based incremental game.

## Repository Structure

```
├── scripts/          # In-game scripts to run inside Bitburner
│   ├── hack/         # Batch hacking system
│   ├── gangs/        # Gang management
│   ├── stocks/       # Stock market analysis
│   ├── contracts/    # Coding contract solvers
│   ├── filesystem/   # File system utilities
│   ├── utils/        # Shared utilities
│   └── data/         # Static game data (JSON)
└── contracts/        # Local practice implementations of contract algorithms
```

## Scripts

### Root Scripts

| Script | Description |
|---|---|
| `backdoor.js` | Backdoors a specified server or a default list of faction-required servers (CSEC, avmnite-02h, etc.). |
| `backdoor_all.js` | Backdoors all accessible servers. |
| `connect.js` | Connects to a server by navigating the network path from home. |
| `distribute.js` | Distributes hack/grow/weaken scripts across all available servers and runs them against a target. Automatically selects the best target if none is specified. |
| `distribute_simple.js` | Simplified version of the distribute script. |
| `do_hack.js` | Worker script — runs `hack()` against a target server. |
| `do_grow.js` | Worker script — runs `grow()` against a target server. |
| `do_weaken.js` | Worker script — runs `weaken()` against a target server. |
| `get_money_now.js` | Single-script hack/grow/weaken loop against a target server. |
| `get_money_simple.js` | More efficient version of `get_money_now.js`. |
| `money_info.js` | Prints money-related information about servers. |
| `purchase-servers.js` | Automatically purchases servers and runs a hacking script on them. |
| `server_info.js` | Displays information about servers. |
| `target_hack.js` / `target_grow.js` / `target_weaken.js` | Targeted single-operation scripts for manual control. |
| `contracts_analyze.js` | Scans all servers for coding contracts and maps them to solver functions. |
| `contracts_find.js` | Lists all coding contracts found across the network. |
| `contracts_solve.js` | Finds all solvable coding contracts and automatically submits answers. |

### `hack/` — Batch Hacking System

A coordinated hack-grow-weaken (HGW) batch attack system.

| File | Description |
|---|---|
| `attack_action.js` | Represents a single attack action (hack, grow, or weaken) with thread and timing info. |
| `attack_batch.js` | Manages a full HGW batch for a single target, including timing, thread calculation, and execution. |
| `attack_measurements.js` | Calculates and tracks attack timing measurements. |
| `attack_result.js` | Tracks and reports the result of an attack batch. |
| `belief_check.js` | Validates assumptions about server state before launching an attack. |
| `controller_batch.js` | Orchestrates batch attacks across multiple targets. |
| `distribute_batch.js` | Distributes batch attack scripts to attacking servers. |
| `scan_server_issues.js` | Diagnoses issues with servers targeted for hacking. |
| `utils.js` | Shared utilities for hacking calculations (thread counts, timing, server selection). |

### `gangs/` — Gang Management

| File | Description |
|---|---|
| `manage.js` | Main gang management controller. |
| `my_gang.js` | Displays current gang status and member information. |
| `start.js` | Starts or initializes gang activities. |
| `rename_members.js` | Renames gang members. |
| `info.js` | Prints gang and member info. |
| `constants.js` | Gang-related constants. |
| `utils.js` | Shared gang utilities. |

### `stocks/` — Stock Market

| File | Description |
|---|---|
| `analyze_stocks.js` | Continuously monitors and displays stock market data (requires TIX and 4S API access). |
| `stock_information.js` | Stock data model with display logic. |
| `info.js` | Prints a snapshot of current stock information. |
| `utils.js` | Shared stock utilities. |

### `contracts/` — In-Game Contract Solvers

JavaScript implementations of Bitburner coding contract algorithms, run inside the game.

| File | Algorithm |
|---|---|
| `algorithmic_stock_trader_1.js` | Maximum profit from one transaction. |
| `algorithmic_stock_trader_2.js` | Maximum profit from unlimited transactions. |
| `algorithmic_stock_trader_3.js` | Maximum profit from at most two transactions. |
| `algorithmic_stock_trader_4.js` | Maximum profit from at most k transactions. |
| `array_jumping_game.js` | Determine if the end of an array is reachable. |
| `encryption_I_caesarCipher.js` | Caesar cipher encryption. |
| `hamming_codes_binary_to_integer.js` | Decode Hamming code to integer. |
| `largest_prime_factor.js` | Find the largest prime factor of a number. |
| `merge_overlapping_intervals.js` | Merge overlapping intervals. |
| `minimum_path_sum_triangle.js` | Find minimum path sum through a triangle. |
| `square_root.js` | Compute integer square root. |
| `unique_paths_grid_1.js` | Count unique paths in a grid (no obstacles). |
| `unique_paths_grid_2.js` | Count unique paths in a grid (with obstacles). |

### `filesystem/` — File System Utilities

| File | Description |
|---|---|
| `download_folder.js` | Downloads all files in a folder from Bitburner to your real computer as a zip file (uses JSZip). |
| `upload_file.js` | Uploads a file from your real computer into Bitburner. |
| `delete_folder.js` | Deletes all files in a specified folder. |
| `clean.js` | Cleans up temporary or old script files. |

### `utils/` — Shared Utilities

| File | Description |
|---|---|
| `formatters.js` | Number and time formatting helpers (e.g. `formatMoney`, `formatTime`). |
| `logger.js` | File-based logger for persistent script logs. |
| `print.js` | Colored terminal print helpers (`toRed`, `printError`, `printInfo`, etc.). |
| `servers.js` | Server scanning, hacking helpers, and terminal command utilities. |
| `contracts.js` | Contract discovery and matching utilities. |

## `contracts/` — Local Practice Implementations

These are Python and JavaScript implementations of contract algorithms written for local development and testing.

> Scripts ready to run inside Bitburner are located under `scripts/contracts/`.

| File | Algorithm |
|---|---|
| `algorithmic_stock_trader_4.js` | Maximum profit from at most k transactions (JS). |
| `array_jumping_game.py` | Array jumping game (Python). |
| `hamming_codes_binary_to_integer.js` | Hamming code decoding (JS). |
| `minimum_path_sum_triangle.py` | Minimum triangle path sum (Python). |
| `overlapping_intervals.py` | Merge overlapping intervals (Python). |
| `prime_factor.py` | Largest prime factor (Python). |
| `square_root.py` | Integer square root (Python). |
| `uniqe_paths_grid_1.py` | Unique grid paths (Python). |

## Getting Started

### Uploading Scripts to the Game

Bitburner exposes an HTTP API that external tools can use to push files directly into the game without any manual copy-pasting.

**Option A — Use the VSCode extension (recommended)**

Install the [Bitburner VSCode Integration](https://marketplace.visualstudio.com/items?itemName=bitburner.bitburner-vscode) extension. It connects to the Bitburner API and lets you push individual files or entire folders from your editor directly into the game with a single command.

**Option B — Manual upload via `upload_file.js`**

If you prefer not to use the game API, you can bootstrap the upload workflow manually:

1. Open Bitburner and navigate to the in-game script editor.
2. Create a new file called `upload_file.js` and paste the contents of [`scripts/filesystem/upload_file.js`](scripts/filesystem/upload_file.js) into it.
3. Save and run the script from the terminal:
   ```
   run upload_file.js
   ```
4. When prompted, select a `.zip` file containing all the scripts you want to upload. The script will extract the zip and write every file into the `home` server, preserving the folder structure.
5. You can create a zip of the entire `scripts/` directory (e.g. with `zip -r scripts.zip scripts/`) and upload it in one shot.

Once the scripts are in the game, start with `distribute.js` to begin automated money farming, or run individual scripts as needed.

### Recommended Script Order for Early Game

1. `get_money_simple.js <server>` — Simple hack loop to start earning money.
2. `purchase-servers.js` — Buy private servers to increase hacking power.
3. `distribute.js` — Distribute hack/grow/weaken across all servers for maximum efficiency.
4. `backdoor.js` — Backdoor faction servers to join factions.
5. `contracts_solve.js` — Automatically solve coding contracts for reputation and money rewards.
