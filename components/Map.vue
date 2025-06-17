<script setup lang="ts">
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useRoadsService } from "~/services/roads";

const { getRoads } = useRoadsService();

const mapStore = useMapsStore();

const mapContainer = ref<HTMLDivElement | null>(null);
let leafletMap: L.Map | null = null;
let roadsGeoJsonLayer: L.GeoJSON | null = null;
let startPointMarker = ref<L.Marker | null>(null);
let endPointMarker = ref<L.Marker | null>(null);
let routePolylineLayer = ref<L.Polyline | null>(null);

onMounted(async () => {
  if (mapContainer.value && !leafletMap) {
    leafletMap = L.map(mapContainer.value).setView([43.6047, 1.4442], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(leafletMap);

    leafletMap.on("click", handleMapClick);
    nextTick(() => leafletMap?.invalidateSize());
  }
  if (!mapStore.roadsData && mapStore.roadsStatus !== "pending") {
    await mapStore.fetchRoads();
  }
});

function handleMapClick(e: L.LeafletMouseEvent) {
  if (mapStore.roadsStatus !== "success") {
    console.warn("Данные о дорогах еще не загружены или произошла ошибка.");
    return;
  }

  if (!mapStore.startPoint) {
    mapStore.setStartPoint(e.latlng);
  } else if (!mapStore.endPoint) {
    mapStore.setEndPoint(e.latlng);
  } else {
    mapStore.clearPointsAndRoute();
    mapStore.setStartPoint(e.latlng);
  }
}

watch(
  () => mapStore.roadsData,
  (newData) => {
    if (leafletMap && newData) {
      if (roadsGeoJsonLayer) {
        leafletMap.removeLayer(roadsGeoJsonLayer);
        roadsGeoJsonLayer = null;
      }
      roadsGeoJsonLayer = L.geoJSON(newData, {
        style: () => ({ color: "#ff7800", weight: 3, opacity: 0.7 }),
      }).addTo(leafletMap);
    } else if (leafletMap && !newData && roadsGeoJsonLayer) {
      leafletMap.removeLayer(roadsGeoJsonLayer);
      roadsGeoJsonLayer = null;
    }
  },
  { immediate: true },
);

watch(
  () => mapStore.startPoint,
  (newPoint) => {
    if (leafletMap) {
      if (newPoint) {
        if (startPointMarker.value) {
          startPointMarker.value.setLatLng(newPoint);
        } else {
          startPointMarker.value = L.marker(newPoint, {
            draggable: true,
            title: "Начальная точка",
          })
            .addTo(leafletMap)
            .on("dragend", function (event) {
              const newPos = mapStore.updateStartPointAfterDrag(
                event.target.getLatLng(),
              );
              if (newPos) this.setLatLng(newPos);
              else if (mapStore.startPoint) this.setLatLng(mapStore.startPoint);
            });
        }
      } else if (startPointMarker.value) {
        leafletMap.removeLayer(startPointMarker.value);
        startPointMarker.value = null;
      }
    }
  },
  { immediate: true },
);

watch(
  () => mapStore.endPoint,
  (newPoint, oldPoint) => {
    if (leafletMap) {
      if (newPoint) {
        const endIcon = L.icon({
          iconUrl:
            "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
          shadowUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        });
        if (endPointMarker.value) {
          endPointMarker.value.setLatLng(newPoint);
        } else {
          endPointMarker.value = L.marker(newPoint, {
            draggable: true,
            icon: endIcon,
            title: "Конечная точка",
          })
            .addTo(leafletMap)
            .on("dragend", function (event) {
              const newPos = mapStore.updateEndPointAfterDrag(
                event.target.getLatLng(),
              );
              if (newPos) this.setLatLng(newPos);
              else if (mapStore.endPoint) this.setLatLng(mapStore.endPoint);
            });
        }
      } else if (endPointMarker.value) {
        leafletMap.removeLayer(endPointMarker.value);
        endPointMarker.value = null;
      }
    }
  },
  { immediate: true },
);

watch(
  () => mapStore.routePath,
  (newPath) => {
    if (leafletMap) {
      if (routePolylineLayer.value) {
        leafletMap.removeLayer(routePolylineLayer.value);
        routePolylineLayer.value = null;
      }
      if (newPath && newPath.length > 0) {
        routePolylineLayer.value = L.polyline(newPath, {
          color: "blue",
          weight: 5,
          opacity: 0.7,
        }).addTo(leafletMap);
      }
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  if (leafletMap) {
    leafletMap.off("click", handleMapClick);
    leafletMap.remove();
    leafletMap = null;
    roadsGeoJsonLayer = null;
  }
});
</script>

<template>
  <div class="map">
    <div class="controls">
      <button
        :disabled="!mapStore.startPoint"
        @click="mapStore.clearPointsAndRoute()"
      >
        Сбросить точки
      </button>
      <p v-if="mapStore.roadsStatus == 'pending'">
        Загрузка данных о дорогах...
      </p>
      <p v-else-if="mapStore.roadsStatus == 'error'">Ошибка загрузки данных.</p>
      <p v-else-if="!mapStore.startPoint">
        Кликните на карту, чтобы поставить начальную точку.
      </p>
      <p v-else-if="!mapStore.endPoint">
        Кликните на карту, чтобы поставить конечную точку.
      </p>
      <p v-else>
        {{
          mapStore.isLoadingPath
            ? "Поиск маршрута..."
            : mapStore.routePath
              ? "Маршрут построен."
              : "Маршрут не найден."
        }}
      </p>
    </div>
    <div
      ref="mapContainer"
      class="map__container"
    />
  </div>
</template>

<style scoped lang="scss">
.map {
  display: flex;
  gap: 20px;
  &__container {
    height: 500px;
    width: 500px;
    border: 1px solid #ccc;
  }
}
.controls {
  margin-bottom: 10px;
  padding: 10px;
  background-color: #f0f0f0;
  border-radius: 5px;
  p {
    margin: 5px 0;
  }
}
</style>
