import http from 'http';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import StreamZip from 'node-stream-zip';
import { connect, createTable } from './database';
import provinceData from './data/provinces';
import type { CityData } from './types';

import config from '../config';

const TMP_DIR = path.join(__dirname, '../temp');
const ADMIN_AREAS_URL =
  'http://download.geonames.org/export/dump/admin1CodesASCII.txt';

/**
 * Simple wrapper that downloads a URL to a file
 */
function downloadFile(source: string, destination: string): Promise<void> {
  console.log(`Downloading ${source}`);
  const file = fs.createWriteStream(destination);
  return new Promise((resolve, reject) => {
    const request = http.get(source, (response) => {
      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });
    });
    request.on('error', reject);
  });
}

/**
 * Download and extract the city list
 */
async function downloadCities() {
  const zipfile = path.join(TMP_DIR, 'cities.zip');
  await downloadFile(config.seed, zipfile);

  // Extract
  console.log('Extracting city data');
  const txtfile = path.join(TMP_DIR, 'cities.txt');
  const zip = new StreamZip.async({ file: zipfile });
  const entries = await zip.entries();
  const cityEntry = Object.values(entries)[0];
  await zip.extract(cityEntry, txtfile);
}

/**
 * Download the administrative areas
 */
async function downloadAdminAreas() {
  const filepath = path.join(TMP_DIR, 'admin1CodesASCII.txt');
  await downloadFile(ADMIN_AREAS_URL, filepath);
}

/**
 * Load the JS map of region names
 */
async function getRegionMap() {
  const fileStream = fs.createReadStream(
    path.join(TMP_DIR, 'admin1CodesASCII.txt')
  );
  const lineStream = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const regionMap = new Map<string, string>();
  for await (const line of lineStream) {
    const [code, _name, nameAscii, _geonameid] = line.split('\t');
    const [country] = code.split('.');

    // Find province abbreviation data
    const data = provinceData.find((province) => {
      const name = province.english || province.name;
      return province.country === country && name === nameAscii;
    });

    if (data) {
      regionMap.set(code, data.short);
    }
  }
  return regionMap;
}

/**
 * Read the city text file and yield city data for each row
 */
async function* readCities() {
  const regions = await getRegionMap();

  // Load file
  const filepath = path.join(TMP_DIR, 'cities.txt');
  const fileStream = fs.createReadStream(filepath);
  const lineStream = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of lineStream) {
    const [
      id,
      _name,
      asciiname,
      _altname,
      latitude,
      longitude,
      featureClass,
      featureCode,
      countryCode,
      _cc2,
      admin1,
      admin2,
      _admin3,
      _admin4,
      population,
      _elevation,
      _dem,
      _timezone,
    ] = line.split('\t');
    const isCapital = ['PPLC', 'PPLCH', 'PPLA'].includes(featureCode);

    // Filter out locations that are not "places"
    if (featureClass !== 'P') {
      yield null;
    }

    // Get region
    let region;
    if (countryCode === 'US') {
      region = admin1;
    } else if (admin2.trim() !== '') {
      region = regions.get(`${countryCode}.${admin2}`) || null;
    }
    if (!region && admin1.trim() !== '') {
      region = regions.get(`${countryCode}.${admin1}`) || null;
    }

    // Return city
    const city: CityData = {
      id: parseInt(id),
      name: asciiname,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      population: parseInt(population),
      capital: isCapital,
      country: countryCode,
      feature_code: featureCode,
      region: region && region.trim() !== '' ? region : null,
    };
    yield city;
  }
}

/**
 * Import data into the city table
 */
export async function importCityData() {
  console.log('Importing city data');
  const conn = connect();
  const cities = await readCities();

  // Import all cities
  let all = 0;
  let imported = 0;
  let errors = 0;
  for await (const city of cities) {
    all++;
    if (city && city.population >= config.population) {
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);

      try {
        process.stdout.write(`Import: ${city.name}, ${city.country}`);
        await conn(config.postgres.metroTable).insert(city);
        imported++;
      } catch (err) {
        console.error(`\n${err.message}`);
        errors++;
      }

      if (errors > 20) {
        console.error('\nToo many errors, exiting!');
        process.exit(1);
      }
    }
  }

  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, 0);
  console.log(`${imported} of ${all} cities imported with ${errors} error(s).`);
}

export async function seed(overwriteData: boolean) {
  console.log('GET CITY DATA');

  // Setup DB table
  await createTable(overwriteData);

  // Download files
  fs.mkdirSync(TMP_DIR);
  await downloadAdminAreas();
  await downloadCities();

  // Load data into table
  await importCityData();
}
