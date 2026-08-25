import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const collection = "ch.swisstopo-vd.ortschaftenverzeichnis_plz";
const stacUrl = `https://data.geo.admin.ch/api/stac/v0.9/collections/${collection}/items?limit=10`;
const root = resolve(import.meta.dirname, "..");
const temporaryDirectory = await mkdtemp(resolve(tmpdir(), "dayhelp-postcodes-"));
const zipPath = resolve(temporaryDirectory, "postcodes.zip");

function parseRow(line) {
  const cells = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ";" && !quoted) {
      cells.push(cell);
      cell = "";
    } else {
      cell += character;
    }
  }

  cells.push(cell);
  return cells;
}

try {
  const stacResponse = await fetch(stacUrl);
  if (!stacResponse.ok) throw new Error(`STAC request failed: ${stacResponse.status}`);
  const stac = await stacResponse.json();
  const item = stac.features?.[0];
  const asset = Object.entries(item?.assets ?? {}).find(([name]) => name.endsWith("_4326.csv.zip"))?.[1];
  if (!asset?.href) throw new Error("Official postcode CSV asset was not found.");

  const zipResponse = await fetch(asset.href);
  if (!zipResponse.ok) throw new Error(`Postcode download failed: ${zipResponse.status}`);
  await writeFile(zipPath, Buffer.from(await zipResponse.arrayBuffer()));

  const { stdout } = await run("unzip", ["-p", zipPath], { maxBuffer: 5_000_000 });
  const lines = stdout.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const headers = parseRow(lines.shift());
  const cityIndex = headers.indexOf("Ortschaftsname");
  const postcodeIndex = headers.indexOf("PLZ4");
  if (cityIndex < 0 || postcodeIndex < 0) throw new Error("Unexpected official CSV format.");

  const places = [...new Set(lines.map((line) => {
    const row = parseRow(line);
    return `${row[postcodeIndex]} ${row[cityIndex]}`.trim();
  }).filter(Boolean))].sort((left, right) => left.localeCompare(right, "de-CH", { numeric: true }));

  const payload = {
    source: "Federal Office of Topography swisstopo — Official index of localities",
    updated: item.properties?.updated?.slice(0, 10) ?? null,
    places,
  };
  await writeFile(resolve(root, "src/assets/postcodes.json"), `${JSON.stringify(payload)}\n`);
  console.log(`Saved ${places.length} Swiss postcode and locality combinations.`);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
