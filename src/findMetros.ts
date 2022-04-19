/**
 * Filters the DB table to cities into metros that are a minimum distance from each other.
 */

import { Knex } from 'knex';
import readline from 'readline';
import { connect } from './database';
import type { CityData } from './types';

import config from '../config';

/**
 * Set the forced metros
 */
async function setForcedMetros(db: Knex): Promise<number> {
  const tablename = config.postgres.metroTable;

  // Fetch metros
  const find = config.forcedMetros.map(async (search) => {
    const metro = await db(tablename)
      .select<CityData>('*')
      .where({
        name: search.city,
        region: search.region,
        country: search.country,
      })
      .limit(1)
      .first();
    if (!metro) {
      const name = [search.city, search.region, search.country]
        .filter((i) => !!i)
        .join(', ');
      console.warn(`WARNING: Could not find the forced metro: ${name}`);
    }
    return metro;
  });
  let metros = await Promise.all(find);
  metros = metros.filter((i) => !!i);
  if (!metros.length) {
    return 0;
  }

  // First mark all cities as metros
  for (const metro of metros) {
    await setMetro(db, metro);
  }

  // Clear all other cities around these metros
  for (const metro of metros) {
    await clearMetro(db, metro);
  }

  return metros.length;
}

/**
 * Set the initial tracked metros
 */
function setMetro(db, metro: CityData) {
  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, 0);
  process.stdout.write(`Found metro: ${metro.name}`);

  const tablename = config.postgres.metroTable;
  return db(tablename).update({ metro: true }).where('id', metro.id);
}

/**
 * Delete all non-metro cities around this metro.
 */
function clearMetro(db, metro: CityData) {
  const meters = config.distance * 1000;
  const tablename = config.postgres.metroTable;

  return db(tablename)
    .whereRaw(
      `
       earth_box(ll_to_earth(${metro.latitude}, ${metro.longitude}), ${meters})
       @> ll_to_earth(latitude, longitude)
     `
    )
    .whereNot('id', metro.id)
    .where('metro', false)
    .delete();
}

/**
 * Find the next metro and process it
 */
async function findNextMetro(db: Knex): Promise<CityData | null> {
  const tablename = config.postgres.metroTable;
  const metro = await db(tablename)
    .select<CityData>('*')
    .where('metro', false)
    .orderBy('population', 'DESC')
    .limit(1)
    .first();
  if (!metro) {
    return null;
  }
  await Promise.all([setMetro(db, metro), clearMetro(db, metro)]);
  return metro;
}

/**
 * Main program entrypoint
 */
export async function findMetros(): Promise<void> {
  console.log('\nFIND METROS');

  const db = await connect();

  // Set forced metros
  let count = await setForcedMetros(db);

  // Find all other metros
  while (true) {
    const metro = await findNextMetro(db);
    if (!metro) {
      break;
    }
    count++;
  }

  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, 0);
  console.log(
    `Add ${count} metros to ${config.postgres.connect.database}.${config.postgres.metroTable}`
  );
}
