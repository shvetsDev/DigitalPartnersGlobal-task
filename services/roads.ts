import type { FeatureCollection } from "geojson";

export function useRoadsService() {
  async function getRoads() {
    const response = await fetch("/roads.geojson");
    return (await response.json()) as FeatureCollection;
  }

  return { getRoads };
}
