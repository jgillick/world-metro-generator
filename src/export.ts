import fs from "fs";
import path from "path";
import { Writable } from "stream";
import { connect } from "./database";
import type { ExportData } from "./types";

import config from "../config";

/**
 * Promise wrapper for the write method of a writable stream
 */
function writeStream(stream: Writable, chunk: any): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    stream.write(chunk, (err) => (err ? reject(err) : resolve()));
  });
}

/**
 * JS file headers
 */
async function jsHeader(stream: Writable) {
  await writeStream(
    stream,
    `/**
 * File generated with https://github.com/jgillick/world-metro-generator
 * Date: ${new Date().toISOString()}
 */
`
  );
}

/**
 * TypeScript file header
 */
async function tsHeader(stream: Writable) {
  await jsHeader(stream);
  await writeStream(
    stream,
    `
type MetroExport = {
  city: string;
  region: string | null;
  country: string;
  population: number;
  latitude: number;
  longitude: number;
};\n`
  );
}

/**
 * Save metros to a JSON file
 */
export async function exportData(filepath: string) {
  const tablename = config.postgres.metroTable;
  const fileType = path.extname(filepath).toLocaleLowerCase();
  filepath = path.resolve(filepath);

  try {
    // Create the file wth the start of the array
    if (fs.existsSync(filepath)) {
      fs.truncateSync(filepath);
    }
    const filestream = fs.createWriteStream(filepath, { flags: "a" });

    // JS/TS Add file header and export
    if (fileType === ".js") {
      await jsHeader(filestream);
      await writeStream(filestream, "module.exports = ");
    } else if (fileType === ".ts") {
      await tsHeader(filestream);
      await writeStream(filestream, "export default ");
    }

    // Create query stream
    const db = connect();
    const metros = await db
      .select<ExportData[]>(
        "name as city",
        "region",
        "country",
        "latitude",
        "longitude",
        "population"
      )
      .from(tablename)
      .orderBy("population", "DESC");

    // Write file
    let i = 0;
    await writeStream(filestream, `[\n`);
    for (const metro of metros) {
      if (i > 0) {
        await writeStream(filestream, `,\n`);
      }
      await writeStream(filestream, JSON.stringify(metro));
      i++;
    }
    await writeStream(filestream, `\n]`);

    // Finish the file
    if (fileType === ".ts") {
      await writeStream(filestream, ` as MetroExport[];\n`);
    } else {
      await writeStream(filestream, `\n`);
    }
    filestream.end();
    console.log(`All metros written to ${filepath}`);
  } catch (err) {
    console.log(err.stack);
    console.error(`ERROR: ${err.message}`);
  }
}
