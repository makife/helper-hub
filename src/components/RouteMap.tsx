import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { X, Navigation } from "lucide-react";

type Props = {
  taskLat: number;
  taskLng: number;
  taskTitle: string;
  onClose: () => void;
};

const FitBounds = ({ points }: { points: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) {
      const bounds = L.latLngBounds(points.map((p) => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [points, map]);
  return null;
};

const userIcon = L.divIcon({
  html: `<div style="width:16px;height:16px;border-radius:50%;background:hsl(220,55%,18%);border:3px solid white;box-shadow:0 0 10px rgba(0,0,0,0.3)"></div>`,
  className: "",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const taskIcon = L.divIcon({
  html: `<div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:linear-gradient(135deg,hsl(24,90%,55%),hsl(35,95%,58%));box-shadow:0 4px 12px rgba(0,0,0,0.2);font-size:16px;border:2px solid white">📍</div>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const RouteMap = ({ taskLat, taskLng, taskTitle, onClose }: Props) => {
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const uPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserPos(uPos);
          // Fetch route from OSRM
          fetch(
            `https://router.project-osrm.org/route/v1/driving/${uPos[1]},${uPos[0]};${taskLng},${taskLat}?overview=full&geometries=geojson`
          )
            .then((r) => r.json())
            .then((data) => {
              if (data.routes?.[0]) {
                const coords = data.routes[0].geometry.coordinates.map(
                  (c: [number, number]) => [c[1], c[0]] as [number, number]
                );
                setRoute(coords);
                const dist = data.routes[0].distance;
                const dur = data.routes[0].duration;
                setDistance(dist >= 1000 ? `${(dist / 1000).toFixed(1)} km` : `${Math.round(dist)} m`);
                setDuration(`${Math.round(dur / 60)} dk`);
              }
            })
            .catch(() => {});
        },
        () => {}
      );
    }
  }, [taskLat, taskLng]);

  const center: [number, number] = userPos || [taskLat, taskLng];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pb-3 pt-4 safe-top">
        <div>
          <h2 className="text-base font-black text-foreground">{taskTitle}</h2>
          {distance && (
            <p className="text-xs text-muted-foreground">
              <Navigation size={10} className="mr-1 inline" />
              {distance} · ~{duration}
            </p>
          )}
        </div>
        <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-card">
          <X size={20} className="text-foreground" />
        </button>
      </div>

      {/* Map */}
      <div className="flex-1">
        <MapContainer center={center} zoom={14} className="h-full w-full" zoomControl={false} attributionControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {userPos && route.length >= 2 && <FitBounds points={[userPos, [taskLat, taskLng]]} />}
          {userPos && <Marker position={userPos} icon={userIcon} />}
          <Marker position={[taskLat, taskLng]} icon={taskIcon} />
          {route.length > 0 && (
            <Polyline positions={route} pathOptions={{ color: "hsl(24, 90%, 55%)", weight: 5, opacity: 0.8 }} />
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default RouteMap;
