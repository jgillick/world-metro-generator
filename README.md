# World Metro List Generator

This is a simple script to divide the world into "metros" that are all a minimum distance away from each other (I use the term metro very loosely here). In my case, this is to group users into large geographic areas for analytics.

My primary requirement for defining a metro:

> No two metros could be closer than _N_ miles/km to each other.
> A metro should be centered around a city/town with a minimum population size.

For example, if we defined metros by population alone, neighboring cities like San Francisco, Ca and Oakland, Ca might be considered two metros, even though they're just a
few miles from each other.

## How it works

This uses Postgres for it's geo querying and the world city data freely provided by the [GeoNames Project](http://geonames.org/).

1. World cities are imported into a postgres DB table
2. The data is sorted by population with the largest cities at the top.
3. This city is marked as a "metro".
4. Using a simple Postgres geo query, all other non-metro cities within _N_ miles/km of this metro are deleted.
5. Repeat steps 2 - 4 until the only rows are cities marked as metros.

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

yarn install
```

### Configuration

Edit the `./config.ts` file to adjust the settings.

### Database

Create the Postgres database that will be used (the name should match the config value `postgres.connect.database`)

From your terminal:

```bash
createdb world-metros
```

### Generate

To generate metros

```bash
npm run generate
```

### Export

To export the data as JSON

```bash
npm run export
```

## Limitations

- Since this is based on a simple algorithm, many of the metros will not be actual metropolitan areas, or could use a name that is not recognized locally as the metropolitan areas.
- This uses Postgres [earthdistance](https://www.postgresql.org/docs/current/earthdistance.html) and [cube](https://www.postgresql.org/docs/current/cube.html), not [PostGIS](https://postgis.net/), so the distance calculations are not always exact.

## Why call it a metro

I'm using the term metro very loosely to describe geographic areas around a city. In the cases of bigger cities the name will actually match the metropolitan area recognized locally (i.e. New York, London, or San Francisco).

## Alternatives

- OECD has a more comprehensive list of world metropolitan areas: https://www.oecd.org/regional/regional-statistics/metropolitan-areas.htm

## Source datasets

- [GeoNames Project](http://geonames.org/)
- Province/State abbreviations: https://github.com/substack/provinces/blob/master/provinces.json
