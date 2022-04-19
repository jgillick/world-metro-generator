import fs from 'fs';
import path from 'path';
import { Writable } from 'stream';
import { connect } from './database';
import type { ExportData } from './types';

import config from '../config';

type ExportType = 'js' | 'json' | 'ts';

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
  const types = [];
  if (config.export.includes('city')) {
    types.push('  city: string;');
  }
  if (config.export.includes('region')) {
    types.push('  region: string | null;');
  }
  if (config.export.includes('country')) {
    types.push('  country: string;');
  }
  if (config.export.includes('latitude')) {
    types.push('  latitude: number;');
  }
  if (config.export.includes('longitude')) {
    types.push('  longitude: number;');
  }
  if (config.export.includes('population')) {
    types.push('  population: number;');
  }

  await jsHeader(stream);
  await writeStream(
    stream,
    `
type MetroExport = {
${types.join('\n')}
};\n`
  );
}

/**
 * Serialize a row of data
 */
function serializeRow(data: ExportData, type: ExportType): string {
  // Filter out the columns that aren't included
  const rowData = {};
  config.export.forEach((field) => (rowData[field] = data[field]));

  if (type !== 'ts') {
    return JSON.stringify(rowData);
  }

  const row = Object.entries(rowData).reduce<string[]>((acc, [name, value]) => {
    if (typeof value === 'undefined') {
      return acc;
    }
    return acc.concat(`${name}:${JSON.stringify(value)}`);
  }, []);
  return `{${row.join(',')}}`;
}

/**
 * Get export type from the file extension
 */
function getExportType(filepath: string): ExportType {
  const type = path.extname(filepath).toLocaleLowerCase();
  switch (type) {
    case '.js':
      return 'js';
    case '.ts':
      return 'ts';
    default:
      return 'json';
  }
}

/**
 * Save metros to a JSON file
 */
export async function exportData(filepath: string) {
  const tablename = config.postgres.metroTable;
  const exportType = getExportType(filepath);
  filepath = path.resolve(filepath);

  try {
    // Create the file wth the start of the array
    if (fs.existsSync(filepath)) {
      fs.truncateSync(filepath);
    }
    const filestream = fs.createWriteStream(filepath, { flags: 'a' });

    // JS/TS Add file header and export
    if (exportType === 'js') {
      await jsHeader(filestream);
      await writeStream(filestream, 'module.exports = ');
    } else if (exportType === 'ts') {
      await tsHeader(filestream);
      await writeStream(filestream, 'export default ');
    }

    // Create query stream
    const db = connect();
    const metros = await db
      .select<ExportData[]>(
        'name as city',
        'region',
        'country',
        'latitude',
        'longitude',
        'population'
      )
      .from(tablename)
      .orderBy('population', 'DESC');

    // Write file
    let i = 0;
    await writeStream(filestream, `[\n`);
    for (const metro of metros) {
      if (i > 0) {
        await writeStream(filestream, `,\n`);
      }
      const row = serializeRow(metro, exportType);
      await writeStream(filestream, row);
      i++;
    }
    await writeStream(filestream, `\n]`);

    // Finish the file
    if (exportType === 'ts') {
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
