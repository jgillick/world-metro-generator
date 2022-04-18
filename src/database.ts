import { knex, Knex } from "knex";
import config from "../config";

/**
 * Connect to DB
 */
export function connect(): Knex<any, unknown[]> {
  return knex({
    client: "postgresql",
    connection: config.postgres.connect,
  });
}

/**
 * Create DB table for metros
 */
export async function createTable(overwriteData: boolean) {
  const db = connect();
  const tableName = config.postgres.metroTable;

  // Check if the table exists
  if (!overwriteData) {
    const existing = await db
      .select("*")
      .from("pg_catalog.pg_tables")
      .where("tablename", config.postgres.metroTable);
    if (existing.length) {
      throw new Error(
        `The postgres table ${config.postgres.connect.database}.${config.postgres.metroTable} already exists! Use the --overwrite-data option to overwrite this table.`
      );
    }
  }

  console.log(`Creating DB table: ${tableName}`);
  await db.schema.raw(`DROP TABLE IF EXISTS ${tableName}`);
  await db.schema.raw(`
    CREATE TABLE ${tableName} (
      id int primary key NOT NULL,
      name varchar NOT NULL,
      region varchar,
      country varchar NOT NULL,
      population integer,
      capital boolean DEFAULT false,
      latitude real,
      longitude real,
      feature_code varchar,
      metro boolean DEFAULT false
    )
  `);

  await db.schema.raw(`CREATE EXTENSION IF NOT EXISTS cube`);
  await db.schema.raw(`CREATE EXTENSION IF NOT EXISTS earthdistance`);
  await db.schema.raw(`DROP INDEX IF EXISTS idx_${tableName}_geo`);
  await db.schema.raw(`DROP INDEX IF EXISTS idx_${tableName}_population`);
  await db.schema.raw(
    `CREATE INDEX idx_${tableName}_population ON ${tableName}(metro,population)`
  );
  await db.schema.raw(`
    CREATE INDEX idx_${tableName}_geo ON ${tableName} USING GIST (
      (
        ll_to_earth(
          latitude :: double precision,
          longitude :: double precision
        )
      ) gist_cube_ops
    )
  `);
}
