# World Metro List Generator

This is a simple script to divide the world into cities that are all a minimum distance away from each other. In my case, this was to group users into large geographic areas for analytics.

My primary requirements:

> Divide the world into the largest cities within any given area on the map.
> No two cities in the dataset can be closer than _N_ km to each other.

The results, if plotted on a map, produces metros that are spaced pretty uniformly across highly populated areas while still having points in more rural areas.

<img src="./example.png" wide="400" />

## How it works

This uses Postgres for it's geo querying and the world city data freely provided by the [GeoNames Project](http://geonames.org/).

1. World cities are imported into a postgres DB table
2. The data is sorted by population with the largest cities at the top.
3. The first city is marked as a "metro".
4. Using a simple Postgres geo query, all other non-metro cities within _N_ km of this metro are deleted.
5. Repeat steps 2 - 4 until only rows marked as metros remain.

## Usage

### Required software

- [git](https://github.com/git-guides/install-git)
- [Node](https://nodejs.org/en/)
- [Postgres](https://www.postgresql.org/download/)

### Installation

From your terminal:

```bash
git clone git@github.com:jgillick/world-metro-generator.git

cd world-metro-generator

npm install
```

### Configuration

Edit the `./config.ts` file to adjust the settings.

### Database

Create a Postgres database that this script can use (the name should match the `postgres.connect.database` value in `./config.ts`)

From your terminal:

```bash
createdb world-metros
```

### Generate

To generate metros

```bash
npm run cli -- generate
```

### Export

Export the data as JSON, JS, or TypeScript:

**JS**

```bash
npm run cli -- export metros.js
```

**JSON**

```bash
npm run cli -- export metros.json
```

**TypeScript**

```bash
npm run cli -- export metros.ts
```

## Limitations

- Since this is based on a simple algorithm, some of the metros will not be true metropolitan areas, or could use a name that is not recognized locally as the metropolitan areas.
- This uses Postgres [earthdistance](https://www.postgresql.org/docs/current/earthdistance.html) and [cube](https://www.postgresql.org/docs/current/cube.html), not [PostGIS](https://postgis.net/), so the distance calculations are not always exact.

## Why call it a metro

I'm using the term metro very loosely to describe geographic areas around the largest city in an area.

## Alternatives

- OECD has a more comprehensive list of world metropolitan areas: https://www.oecd.org/regional/regional-statistics/metropolitan-areas.htm

## Source datasets

- [GeoNames Project](http://geonames.org/)
- Province/State abbreviations: https://github.com/substack/provinces/blob/master/provinces.json
