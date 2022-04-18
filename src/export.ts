import fs from "fs";
import path from "path";
import Stringify from "streaming-json-stringify";
import { connect } from "./database";
import type { ExportData } from "./types";

import config from "../config";

/**
 * Save metros to a JSON file
 */
export async function exportData(filepath: string) {
  const tablename = config.postgres.metroTable;

  try {
    // Create the file wth the start of the array
    fs.truncateSync(filepath);
    const filestream = fs.createWriteStream(filepath, { flags: "a" });

    // Create query stream
    const db = connect();
    const queryStream = db
      .select<ExportData[]>(
        "name as city",
        "region",
        "country",
        "latitude",
        "longitude",
        "population"
      )
      .from(tablename)
      .orderBy("population", "DESC")
      .stream();

    // Stream output
    await new Promise((resolve, reject) => {
      queryStream.pipe(Stringify()).pipe(filestream);
      queryStream.on("error", reject);
      queryStream.on("end", resolve);
    });

    filestream.end();
    console.log(`All metros written to ${filepath}`);
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
  }
}
