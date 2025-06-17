<script setup lang="ts">
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useRoadsService } from "~/services/roads";

const { getRoads } = useRoadsService();

const mapContainer = ref<HTMLDivElement | null>(null);
let leafletMap: L.Map | null = null;
let roadsLayer: L.GeoJSON | null = null;

const startPoint = ref<L.LatLng | null>(null);
const endPoint = ref<L.LatLng | null>(null);
const startMarker = ref<L.Marker | null>(null);
const endMarker = ref<L.Marker | null>(null);
const routeLayer = ref<L.Polyline | null>(null);

const { data: roadsData, status } = useLazyAsyncData(
  Math.random().toString(),
  async () => {
    const response = (await getRoads()) as any;
    console.log(response);
    return response;
  },
);

onMounted(() => {
  console.log(
    "Component Mounted. mapContainer available:",
    !!mapContainer.value,
  );
  if (mapContainer.value) {
    leafletMap = L.map(mapContainer.value).setView([43.6047, 1.4442], 13);
    // L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    //   attribution:
    //     '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    // }).addTo(leafletMap);
    nextTick(() => {
      if (leafletMap) {
        console.log("Invalidating map size...");
        leafletMap.invalidateSize();
      }
    });
  }
});

watch(
  () => roadsData.value,
  () => {
    if (leafletMap && roadsData.value) {
      if (roadsLayer) {
        leafletMap.removeLayer(roadsLayer);
        roadsLayer = null;
      }
      roadsLayer = L.geoJSON(roadsData.value, {
        style: (_feature) => ({
          color: "#ff7800",
          weight: 2,
          opacity: 1,
        }),
      }).addTo(leafletMap);
    }
  },
);

onUnmounted(() => {
  if (leafletMap) {
    leafletMap.remove();
    leafletMap = null;
  }
});
</script>

<template>
  <div
    ref="mapContainer"
    class="map-container"
  />
</template>

<style scoped lang="scss">
.map-container {
  width: 500px;
  height: 500px;
  border: 1px solid #ccc;
}
</style>
