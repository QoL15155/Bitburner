/**
 * Downloads all files within a folder to your real computer.
 * Uses the DOM to trigger browser file downloads.
 *
 * @param {NS} ns
 */
export async function main(ns) {
  const args = ns.flags([
    ["help", false],
    ["h", false],
  ]);

  const folder = args._[0];

  if (args.help || args.h || !folder) {
    ns.tprint(`Usage: run ${ns.getScriptName()} <folder> [--delay ms]`);
    ns.tprint("");
    ns.tprint("Download Folder");
    ns.tprint("=====================");
    ns.tprint("");
    ns.tprint("Recursively downloads all files within the given folder");
    ns.tprint("to your real computer via browser downloads.");
    ns.tprint("Assumes the folder is in the home directory. ");
    ns.tprint("");
    ns.tprint("Example:");
    ns.tprint(`> run ${ns.getScriptName()} /scripts/`);
    return;
  }

  // Normalize folder to ensure it starts with /
  const prefix = folder.startsWith("/") ? folder : `/${folder}`;

  const allFiles = ns.ls("home", prefix);

  if (allFiles.length === 0) {
    ns.tprint(`No files found matching "${prefix}".`);
    return;
  }

  ns.tprint(
    `Found ${allFiles.length} file(s) matching "${prefix}". Downloading...`,
  );

  const doc = globalThis["document"];

  // Dynamically load JSZip from CDN if not already available
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

  const zip = new globalThis.JSZip();

  let baseFolder = folder.startsWith("/") ? folder.substring(1) : folder;
  baseFolder = baseFolder.endsWith("/") ? baseFolder : `${baseFolder}/`;

  for (const file of allFiles) {
    const relativePath = file.startsWith(baseFolder)
      ? file.substring(baseFolder.length)
      : file;
    const content = ns.read(file);
    zip.file(relativePath, content);
    ns.tprint(`  Added: ${relativePath}`);
  }

  ns.tprint("Generating zip...");
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const element = doc.createElement("a");
  element.href = url;
  // Name the zip after the folder
  const zipName =
    baseFolder.replace(/\//g, "_").replace(/^_|_$/g, "") || "download";
  element.download = `${zipName}.zip`;
  element.click();
  URL.revokeObjectURL(url);

  ns.tprint(`Done. Downloaded ${allFiles.length} file(s) as ${zipName}.zip.`);
}
