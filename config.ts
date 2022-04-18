type ForcedMetro = {
  city: string;
  region: string;
  country: string;
};

export default {
  /**
   * Minimum distance (in kilometers) between metro areas
   */
  distance: 100,

  /**
   * Minimum population of the metro area.
   * Setting a size smaller than the seed dataset (see `seed` value), will effectively negate this filter.
   */
  population: 15000,

  /**
   * List of cities that are forced to be considered metros.
   *
   * For example:
   * ```
   * forcedMetros: [
   *   { city: 'Los Angeles', region: 'CA', country: 'US' },
   *   { city: 'San Diego', region: 'CA', country: 'US' },
   * ],
   * ```
   *
   */
  forcedMetros: [] as ForcedMetro[],

  postgres: {
    /**
     * How to connect to your database
     */
    connect: {
      host: "localhost",
      port: 5432,
      user: "admin",
      password: "",
      database: "world-metros",
    },

    /**
     * The Postgres table to create with metros
     */
    metroTable: "metros",
  },

  /**
   * The URL to the city list file to seed the data with.
   * This will affect the minimum population size. For example, by default we use the `cities15000` file, which is only cities of the world with populations >= 15,000.
   * If you use a larger dataset, the script will take longer and use way more memory.
   */
  seed: "http://download.geonames.org/export/dump/cities15000.zip",
};
