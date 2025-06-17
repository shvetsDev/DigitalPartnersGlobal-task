
import L from "leaflet";
import { useRoadsService } from "~/services/roads";

type GeoJsonRoads = GeoJSON.FeatureCollection<
  GeoJSON.LineString | GeoJSON.MultiLineString
>;

interface GraphNode {
  id: string;
  lat: number;
  lng: number;
  neighbors: Map<string, number>;
}
type RoadGraph = Record<string, GraphNode>;

const latLngToString = (latLng: L.LatLng): string =>
  `${latLng.lat},${latLng.lng}`;

class PriorityQueue {
  private items: { element: string; priority: number }[] = [];
  enqueue(element: string, priority: number) {
    const queueElement = { element, priority };
    let added = false;
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i].priority > queueElement.priority) {
        this.items.splice(i, 0, queueElement);
        added = true;
        break;
      }
    }
    if (!added) {
      this.items.push(queueElement);
    }
  }
  dequeue(): { element: string; priority: number } | undefined {
    return this.items.shift();
  }
  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

export const useMapsStore = defineStore("maps", () => {
  const { getRoads } = useRoadsService();

  const roadsData = ref<GeoJsonRoads | null>(null);
  const roadsStatus = ref<"idle" | "pending" | "success" | "error">("idle");
  const startPoint = ref<L.LatLng | null>(null);
  const endPoint = ref<L.LatLng | null>(null);
  const routePath = ref<L.LatLng[] | null>(null);
  const isLoadingPath = ref(false);
  const roadGraph = ref<RoadGraph | null>(null);

  const hasStartAndEndPoints = computed(
    () => !!startPoint.value && !!endPoint.value,
  );

  function _snapToNearestRoadVertex(
    point: L.LatLng,
    currentRoadsData: GeoJsonRoads | null,
  ): L.LatLng | null {
    if (
      !currentRoadsData ||
      !currentRoadsData.features ||
      currentRoadsData.features.length === 0
    ) {
      return null;
    }
    let minDistance = Infinity;
    let closestVertex: L.LatLng | null = null;
    const MAX_SNAP_DISTANCE_METERS = 500;

    currentRoadsData.features.forEach((feature) => {
      if (feature.geometry) {
        let lines: GeoJSON.Position[][] = [];
        if (feature.geometry.type === "LineString") {
          lines.push(feature.geometry.coordinates as GeoJSON.Position[]);
        } else if (feature.geometry.type === "MultiLineString") {
          lines = feature.geometry.coordinates as GeoJSON.Position[][];
        } else {
          return;
        }

        if (lines.length === 0) return;

        lines.forEach((lineCoordinates) => {
          if (!lineCoordinates || lineCoordinates.length === 0) return;
          lineCoordinates.forEach((coord) => {
            if (
              !Array.isArray(coord) ||
              coord.length < 2 ||
              typeof coord[0] !== "number" ||
              typeof coord[1] !== "number"
            )
              return;
            const vertexLatLng = L.latLng(coord[1], coord[0]);
            const distance = point.distanceTo(vertexLatLng);
            if (distance < minDistance) {
              minDistance = distance;
              closestVertex = vertexLatLng;
            }
          });
        });
      }
    });
    return closestVertex && minDistance < MAX_SNAP_DISTANCE_METERS
      ? closestVertex
      : null;
  }

  function _buildGraphInternal(currentRoadsData: GeoJsonRoads): RoadGraph {
    const graph: RoadGraph = {};
    const addNode = (latLng: L.LatLng): string => {
      const id = latLngToString(latLng);
      if (!graph[id])
        graph[id] = {
          id,
          lat: latLng.lat,
          lng: latLng.lng,
          neighbors: new Map(),
        };
      return id;
    };
    const addEdge = (fromLatLng: L.LatLng, toLatLng: L.LatLng) => {
      const fromId = addNode(fromLatLng);
      const toId = addNode(toLatLng);
      const distance = fromLatLng.distanceTo(toLatLng);
      if (distance > 0) {
        graph[fromId].neighbors.set(toId, distance);
        graph[toId].neighbors.set(fromId, distance);
      }
    };

    currentRoadsData.features.forEach((feature) => {
      if (feature.geometry) {
        let linesCoordinates: GeoJSON.Position[][] = [];
        if (feature.geometry.type === "LineString") {
          linesCoordinates.push(
            feature.geometry.coordinates as GeoJSON.Position[],
          );
        } else if (feature.geometry.type === "MultiLineString") {
          linesCoordinates = feature.geometry
            .coordinates as GeoJSON.Position[][];
        } else {
          return;
        }
        linesCoordinates.forEach((lineCoords) => {
          for (let i = 0; i < lineCoords.length - 1; i++) {
            const p1 = L.latLng(lineCoords[i][1], lineCoords[i][0]);
            const p2 = L.latLng(lineCoords[i + 1][1], lineCoords[i + 1][0]);
            addEdge(p1, p2);
          }
        });
      }
    });
    console.log(`Graph built with ${Object.keys(graph).length} nodes.`);
    return graph;
  }

  function _dijkstra(
    graph: RoadGraph,
    startNodeId: string,
    endNodeId: string,
  ): L.LatLng[] | null {
    const distances = new Map<string, number>();
    const previousNodes = new Map<string, string | null>();
    const pq = new PriorityQueue();
    const visited = new Set<string>();

    for (const nodeId in graph) {
      distances.set(nodeId, Infinity);
      previousNodes.set(nodeId, null);
    }
    if (!graph[startNodeId] || !graph[endNodeId]) {
      console.error(
        "Dijkstra: Start or end node not found in graph.",
        startNodeId,
        endNodeId,
      );
      return null;
    }
    distances.set(startNodeId, 0);
    pq.enqueue(startNodeId, 0);

    while (!pq.isEmpty()) {
      const { element: currentNodeId, priority: currentDistance } =
        pq.dequeue()!;
      if (visited.has(currentNodeId)) continue;
      visited.add(currentNodeId);

      if (currentNodeId === endNodeId) {
        const pathCoords: L.LatLng[] = [];
        let tempId: string | null = endNodeId;
        while (tempId) {
          const node = graph[tempId!];
          pathCoords.unshift(L.latLng(node.lat, node.lng));
          tempId = previousNodes.get(tempId!)!;
        }
        return pathCoords.length > 1 || startNodeId === endNodeId
          ? pathCoords
          : null;
      }
      const currentNode = graph[currentNodeId];
      if (!currentNode || !currentNode.neighbors) continue;
      for (const [neighborId, weight] of currentNode.neighbors.entries()) {
        if (visited.has(neighborId)) continue;
        const distanceToNeighbor = currentDistance + weight;
        if (distanceToNeighbor < (distances.get(neighborId) ?? Infinity)) {
          distances.set(neighborId, distanceToNeighbor);
          previousNodes.set(neighborId, currentNodeId);
          pq.enqueue(neighborId, distanceToNeighbor);
        }
      }
    }
    return null;
  }

  async function fetchRoads() {
    if (roadsStatus.value === "pending" || roadsData.value) return;
    roadsStatus.value = "pending";
    try {
      const response = (await getRoads()) as GeoJsonRoads;
      roadsData.value = response;
      roadsStatus.value = "success";
      roadGraph.value = null;
    } catch (error) {
      console.error("Failed to fetch roads data:", error);
      roadsStatus.value = "error";
      roadsData.value = null;
    }
  }

  function _updatePath() {
    if (hasStartAndEndPoints.value && roadsData.value) {
      isLoadingPath.value = true;
      routePath.value = null;
      if (!roadGraph.value) {
        roadGraph.value = _buildGraphInternal(roadsData.value);
      }

      if (startPoint.value && endPoint.value && roadGraph.value) {
        const startNodeId = latLngToString(startPoint.value);
        const endNodeId = latLngToString(endPoint.value);
        const path = _dijkstra(roadGraph.value, startNodeId, endNodeId);
        routePath.value = path;
        if (!path) {
          console.warn("Path not found between selected points.");
        }
      }
      isLoadingPath.value = false;
    } else {
      routePath.value = null;
    }
  }

  function setStartPoint(rawLatLng: L.LatLng) {
    if (!roadsData.value) return;
    const snapped = _snapToNearestRoadVertex(rawLatLng, roadsData.value);
    if (snapped) {
      startPoint.value = snapped;
      _updatePath();
    } else {
      console.warn("Start point could not be snapped to road.");
    }
  }

  function setEndPoint(rawLatLng: L.LatLng) {
    if (!roadsData.value) return;
    const snapped = _snapToNearestRoadVertex(rawLatLng, roadsData.value);
    if (snapped) {
      endPoint.value = snapped;
      _updatePath();
    } else {
      console.warn("End point could not be snapped to road.");
    }
  }

  function updateStartPointAfterDrag(newLatLng: L.LatLng): L.LatLng | null {
    if (!roadsData.value) return null;
    const snapped = _snapToNearestRoadVertex(newLatLng, roadsData.value);
    if (snapped) {
      startPoint.value = snapped;
      _updatePath();
      return snapped;
    }
    return startPoint.value;
  }

  function updateEndPointAfterDrag(newLatLng: L.LatLng): L.LatLng | null {
    if (!roadsData.value) return null;
    const snapped = _snapToNearestRoadVertex(newLatLng, roadsData.value);
    if (snapped) {
      endPoint.value = snapped;
      _updatePath();
      return snapped;
    }
    return endPoint.value;
  }

  function clearPointsAndRoute() {
    startPoint.value = null;
    endPoint.value = null;
    routePath.value = null;
  }

  return {
    roadsData,
    roadsStatus,
    startPoint,
    endPoint,
    routePath,
    isLoadingPath,
    hasStartAndEndPoints,
    fetchRoads,
    setStartPoint,
    setEndPoint,
    updateStartPointAfterDrag,
    updateEndPointAfterDrag,
    clearPointsAndRoute,
  };
});
