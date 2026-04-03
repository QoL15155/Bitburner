/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
  const helpOptions = ["-h", "--help"];
  const defaultOptions = helpOptions.concat("--tail");

  if (args.some((arg) => helpOptions.includes(arg))) {
    return [];
  }

  return defaultOptions;
}

/**
 * Prompts the user to select a zip, js, or ts file from their computer,
 * then writes/extracts the file(s) into the home directory.
 *
 * @param {NS} ns
 */
export async function main(ns) {
  const args = ns.flags([
    ["help", false],
    ["h", false],
    ["prefix", ""],
  ]);

  if (args.help || args.h) {
    ns.tprint(`Usage: run ${ns.getScriptName()} [--prefix /folder/]`);
    ns.tprint("");
    ns.tprint("Upload File");
    ns.tprint("=====================");
    ns.tprint("");
    ns.tprint(
      "Prompts you to select a zip, js, or ts file from your computer,",
    );
    ns.tprint("then writes/extracts the file(s) into the home directory.");
    ns.tprint("");
    ns.tprint("Options:");
    ns.tprint(
      "  --prefix path  Prefix to prepend to extracted file paths (default: none)",
    );
    ns.tprint("");
    ns.tprint("Example:");
    ns.tprint(`> run ${ns.getScriptName()}`);
    ns.tprint(`> run ${ns.getScriptName()} --prefix /scripts/`);
    return;
  }

  const doc = globalThis["document"];

  // Prompt user to pick a file
  ns.tprint("Please select a zip, js, or ts file...");
  const file = await pickFile(doc, ".zip,.js,.ts");
  if (!file) {
    ns.tprint("No file selected. Aborting.");
    return;
  }

  ns.tprint(`Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

  let prefix = args.prefix;
  if (prefix && !prefix.startsWith("/")) prefix = `/${prefix}`;
  if (prefix && !prefix.endsWith("/")) prefix = `${prefix}/`;

  const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

  if (ext === ".js" || ext === ".ts") {
    // Single script file upload
    const content = await file.text();
    let targetPath = prefix ? `${prefix}${file.name}` : `/${file.name}`;
    await ns.write(targetPath, content, "w");
    ns.tprint(`  Uploaded: ${targetPath}`);
    ns.tprint("Done. Uploaded 1 file to home.");
  } else {
    // Zip file: load JSZip if needed, then extract
    if (typeof globalThis.JSZip === "undefined") {
      ns.tprint("Loading JSZip library...");
      const script = doc.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
      doc.head.appendChild(script);
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const zip = await globalThis.JSZip.loadAsync(arrayBuffer);

    const entries = Object.keys(zip.files);
    let uploaded = 0;

    for (const entryName of entries) {
      const entry = zip.files[entryName];

      // Skip directories
      if (entry.dir) continue;

      const content = await entry.async("string");
      let targetPath = entryName;

      // Ensure path starts with /
      if (!targetPath.startsWith("/")) targetPath = `/${targetPath}`;

      // Prepend prefix if provided
      if (prefix) {
        targetPath = `${prefix}${targetPath.substring(1)}`;
      }

      await ns.write(targetPath, content, "w");
      ns.tprint(`  Extracted: ${targetPath}`);
      uploaded++;
    }

    ns.tprint(`Done. Extracted ${uploaded} file(s) to home.`);
  }
}

/**
 * Creates a temporary file input to let the user pick a file.
 * @param {Document} doc
 * @param {string} accept - file type filter (e.g. ".zip")
 * @returns {Promise<File|null>}
 */
function pickFile(doc, accept) {
  return new Promise((resolve) => {
    const input = doc.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.style.display = "none";
    doc.body.appendChild(input);

    input.addEventListener("change", () => {
      const file = input.files.length > 0 ? input.files[0] : null;
      input.remove();
      resolve(file);
    });

    // Handle cancel (input loses focus without selecting)
    input.addEventListener("cancel", () => {
      input.remove();
      resolve(null);
    });

    input.click();
  });
}
