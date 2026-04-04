import { Color, toGreen } from "/utils/print.js";

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
  const defaultOptions = ["-h", "--help", "--tail"];

  return [...defaultOptions];
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
  ]);

  if (args.help || args.h) {
    const usage = toGreen(`run ${ns.getScriptName()}`);
    const options = `${Color.Italic}folder${Color.Reset}`;

    ns.tprint(`Usage: ${usage} [<${options}>]`);
    ns.tprint("");
    ns.tprint("Upload File");
    ns.tprint("=====================");
    ns.tprint("");
    ns.tprint(
      "Prompts you to select a 'zip', 'js', or 'ts' file from your computer,",
    );
    ns.tprint("then writes/extracts the file(s) into the home directory.");
    ns.tprint("");
    ns.tprint("Options:");
    ns.tprint(`  <${options}>       Folder to upload files to (default: home)`);
    ns.tprint("");
    ns.tprint("Example:");
    ns.tprint(`> run ${ns.getScriptName()}`);
    ns.tprint(`> run ${ns.getScriptName()} /hack/`);
    return;
  }
  let destinationDir = args._[0];
  if (destinationDir) {
    if (!destinationDir.startsWith("/")) destinationDir = `/${destinationDir}`;
    if (!destinationDir.endsWith("/")) destinationDir = `${destinationDir}/`;
  }

  const doc = globalThis["document"];

  // Prompt user to pick a file
  ns.tprint("Please select a 'zip', 'js', or 'ts' file...");
  const file = await pickFile(doc, ".zip,.js,.ts");
  if (!file) {
    ns.tprint("No file selected. Aborting.");
    return;
  }

  ns.tprint(`Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

  const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

  if (ext === ".js" || ext === ".ts") {
    // Single script file upload
    const content = await file.text();
    let targetPath = destinationDir
      ? `${destinationDir}${file.name}`
      : `/${file.name}`;
    await ns.write(targetPath, content, "w");
    ns.tprint(`  Uploaded: ${targetPath}`);
    ns.tprint(`Done. Uploaded 1 file to ${destinationDir || "home"}.`);
    return;
  }
  // Zip file: load JSZip if needed, then extract
  if (typeof globalThis.JSZip === "undefined") {
    ns.tprint("Loading JSZip library...");
    const script = doc.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    doc.head.appendChild(script);
    try {
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
      });
    } catch (e) {
      ns.tprint("Failed to load JSZip library. Aborting.");
      return;
    }
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
    if (destinationDir) {
      targetPath = `${destinationDir}${targetPath.substring(1)}`;
    }

    await ns.write(targetPath, content, "w");
    ns.tprint(`  Extracted: ${targetPath}`);
    uploaded++;
  }

  ns.tprint(
    `Done. Extracted ${uploaded} file(s) to ${destinationDir || "home"}.`,
  );
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
