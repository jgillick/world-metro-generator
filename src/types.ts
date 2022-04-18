export type CityData = {
  id: number;
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  capital: boolean;
  population: number;
  feature_code: string;
};

export type ExportData = {
  city: string;
  region: string;
  country: string;
  population: number;
  latitude: number;
  longitude: number;
};
