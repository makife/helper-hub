export type LatLng = [number, number];

export type Maneuver = {
  type: string;
  modifier?: string;
  instruction?: string;
};

export type RouteStep = {
  distance: number;
  duration: number;
  name: string;
  maneuver: Maneuver;
  geometry: {
    coordinates: [number, number][];
  };
};

export type RouteLeg = {
  steps: RouteStep[];
  distance: number;
  duration: number;
};

export type OSRMRoute = {
  distance: number;
  duration: number;
  geometry: {
    coordinates: [number, number][];
  };
  legs: RouteLeg[];
};

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

export const haversine = (a: LatLng, b: LatLng) => {
  const R = 6371e3;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

export const formatDistance = (meters: number) => {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  if (meters >= 100) return `${Math.round(meters / 10) * 10} m`;
  return `${Math.round(meters)} m`;
};

export const formatDuration = (seconds: number) => `${Math.round(seconds / 60)} dk`;

export const turkishInstruction = (step: RouteStep, distance?: number) => {
  const type = step.maneuver?.type || "continue";
  const modifier = step.maneuver?.modifier || "";
  const road = step.name && step.name !== "unnamed" ? step.name : "hedef yönünde";
  const distText = distance !== undefined ? formatDistance(distance) : "";
  const prefix = distText ? `${distText} sonra ` : "";

  if (type === "depart") return `Başlangıç noktasından ${road} yönüne ilerle.`;
  if (type === "arrive") return "Hedefe vardın.";

  const turnMap: Record<string, string> = {
    uturn: "geriye dön",
    "sharp right": "sağa keskin dön",
    right: "sağa dön",
    "slight right": "hafif sağa dön",
    straight: "düz devam et",
    "slight left": "hafif sola dön",
    left: "sola dön",
    "sharp left": "sola keskin dön",
  };

  if (type === "roundabout" || type === "rotary") {
    return `${prefix}kavşaktan ${road} yönüne çık.`;
  }
  if (type === "exit roundabout" || type === "exit rotary") {
    return `${prefix}kavşaktan çık.`;
  }
  if (type === "merge") {
    return `${prefix}yola gir, sonra ${road} yönüne ilerle.`;
  }
  if (type === "fork") {
    const dir = modifier.includes("right") ? "sağ" : "sol";
    return `${prefix}yol ayrımında ${dir} tarafa sap, ${road} yönüne devam et.`;
  }
  if (type === "end of road") {
    const dir = modifier.includes("right") ? "sağa" : "sola";
    return `${prefix}yolun sonunda ${dir} dön, ${road} yönüne devam et.`;
  }
  if (type === "new name" || type === "continue") {
    return `${prefix}${road} yönünde düz devam et.`;
  }

  const turnText = turnMap[modifier] || turnMap["straight"];
  return `${prefix}${turnText}${road ? `, ${road} yönüne devam et` : ""}.`;
};

export const nearestPointOnRoute = (pos: LatLng, route: LatLng[]) => {
  let minDist = Infinity;
  let nearestIndex = 0;
  for (let i = 0; i < route.length; i++) {
    const d = haversine(pos, route[i]);
    if (d < minDist) {
      minDist = d;
      nearestIndex = i;
    }
  }
  return { distance: minDist, index: nearestIndex };
};

export const buildStepsFromLegs = (legs: RouteLeg[]) => legs.flatMap((leg) => leg.steps);

export const findCurrentStepIndex = (
  pos: LatLng,
  steps: RouteStep[],
  visitedIndex: number
) => {
  for (let i = visitedIndex; i < steps.length; i++) {
    const coords = steps[i].geometry.coordinates.map((c) => [c[1], c[0]] as LatLng);
    const { distance } = nearestPointOnRoute(pos, coords);
    if (distance < 60) return i;
  }
  return visitedIndex;
};

export const remainingDistanceToStepEnd = (pos: LatLng, step: RouteStep) => {
  const coords = step.geometry.coordinates.map((c) => [c[1], c[0]] as LatLng);
  const { index } = nearestPointOnRoute(pos, coords);
  let remaining = 0;
  for (let i = index; i < coords.length - 1; i++) {
    remaining += haversine(coords[i], coords[i + 1]);
  }
  return remaining;
};

export const speak = (text: string, lang = "tr-TR") => {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 1.05;
  u.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  const trVoice = voices.find((v) => v.lang.startsWith("tr")) || voices[0];
  if (trVoice) u.voice = trVoice;
  window.speechSynthesis.speak(u);
};

export const fetchOSRMRoute = async (
  from: LatLng,
  to: LatLng
): Promise<OSRMRoute | null> => {
  const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=true`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!data.routes?.[0]) return null;
    return data.routes[0] as OSRMRoute;
  } catch {
    return null;
  }
};
