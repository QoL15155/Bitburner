# Bitburner Scripts

This project contains automation scripts for [Bitburner](https://github.com/bitburner-official/bitburner-src) v2.8.1, an incremental hacking game. Scripts run inside the game's Netscript 2.0 (NS2) runtime.

## Netscript API

All scripts target the **Netscript 2.8.1 (NS2)** JavaScript API. The `ns` object (type `NS`) is the game's global context providing all API methods.

Official API documentation: https://github.com/bitburner-official/bitburner-src/blob/stable/markdown/bitburner.ns.md

## Script Structure

Every script follows this pattern:

```javascript
import { helper } from "/utils/module.js";

/** @param {AutocompleteData} data */
export function autocomplete(data, args) {
  return [...data.servers];
}

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([["help", false]]);
  // ...
}
```

- Entry point is always `export async function main(ns)`.
- Provide `export function autocomplete(data, args)` for CLI tab-completion when the script accepts arguments.
- Parse arguments with `ns.flags()`.
- Use JSDoc `@param {NS} ns` so the game editor provides autocomplete.

## Import Paths

Imports use **root-relative paths starting with `/`**, matching how Bitburner resolves modules:

```javascript
import { listServers } from "/utils/servers.js";
import { AttackAction } from "/hack/attack_action.js";
```

Always include the `.js` extension.

## Project Layout

| Path          | Purpose                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| `*.js` (root) | Entry-point scripts run directly in-game                                |
| `hack/`       | HGW (Hack/Grow/Weaken) batch orchestration and thread calculations      |
| `gangs/`      | Gang member management, tasks, equipment, territory warfare             |
| `stocks/`     | Stock market analysis and trading                                       |
| `contracts/`  | Individual coding contract solvers                                      |
| `utils/`      | Shared helpers: logging, formatting, server scanning, contract registry |
| `filesystem/` | File upload/download/cleanup utilities                                  |
| `data/`       | Runtime JSON data files                                                 |

## Conventions

- **Functions**: camelCase. Prefix with verb (`getTargetServers`, `exportServersData`).
- **Classes**: PascalCase (`AttackAction`, `FileLogger`).
- **Constants**: camelCase
- **Indentation**: 2 spaces.
- **Logging**: Use `printError(ns, msg)`, `printInfo(ns, msg)`, `print(ns, msg)` from `/utils/print.js` for colored dual-output (log + terminal).
- **Disable noisy logs**: Call `ns.disableLog("functionName")` for frequently called APIs to keep the log readable.
- **Data persistence**: `ns.write(file, JSON.stringify(data), "w")` and `JSON.parse(ns.read(file))`.
  - Might also be used to minimize RAM usage by offloading large data structures to disk.
- **Error handling**: Throw `Error` with descriptive messages for critical failures. Use `ns.alert()` for user-facing notifications.
- Prefer const over let; never use var
- Use arrow functions for React components
- Always include TypeScript type annotations
- Use descriptive variable names (no abbreviations)

## RAM Awareness

Every Netscript API call costs RAM. The game calculates a script's RAM cost by statically analyzing which `ns.*` functions it references. Keep this in mind:

- Minimal scripts (`do_hack.js`, `do_grow.js`, `do_weaken.js`) are intentionally tiny so they can run many threads on low-RAM servers.
- Don't add unnecessary API calls to scripts that need to run with high thread counts.
- Thread counts and RAM availability drive most orchestration logic.
