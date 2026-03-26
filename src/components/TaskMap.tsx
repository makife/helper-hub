import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type TaskPin = {
  id: string;
  title: string;
  emoji: string;
  price: number;
  lat: number;
  lng: number;
  urgent?: boolean;
  distance?: string;
  estimatedMinutes?: number;
};

const createEmojiIcon = (emoji: string, urgent?: boolean) => {
  return L.divIcon({
    html: `<div style="
      width: 40px; height: 40px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 50%;
      background: ${urgent ? 'linear-gradient(135deg, #e74c3c, #c0392b)' : 'linear-gradient(135deg, hsl(24, 90%, 55%), hsl(35, 95%, 58%))'};
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      font-size: 18px;
      border: 2px solid white;
    ">${emoji}</div>`,
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -24],
  });
};

const LocationUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 14);
  }, [center, map]);
  return null;
};

type Props = {
  tasks: TaskPin[];
  center?: [number, number];
  onTaskClick?: (task: TaskPin) => void;
};

const TaskMap = ({ tasks, center = [40.9903, 29.0297], onTaskClick }: Props) => {
  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
        () => {} // silently fail
      );
    }
  }, []);

  const mapCenter = userPos || center;

  const userIcon = useMemo(() => L.divIcon({
    html: `<div style="
      width: 16px; height: 16px;
      border-radius: 50%;
      background: hsl(220, 55%, 18%);
      border: 3px solid white;
      box-shadow: 0 0 10px rgba(0,0,0,0.3);
    "></div>`,
    className: "",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  }), []);

  return (
    <MapContainer
      center={mapCenter}
      zoom={14}
      className="h-full w-full rounded-2xl"
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <LocationUpdater center={mapCenter} />

      {userPos && <Marker position={userPos} icon={userIcon} />}

      {tasks.map((task) => (
        <Marker
          key={task.id}
          position={[task.lat, task.lng]}
          icon={createEmojiIcon(task.emoji, task.urgent)}
          eventHandlers={{ click: () => onTaskClick?.(task) }}
        >
          <Popup>
            <div className="text-center">
              <p className="font-bold">{task.title}</p>
              <p className="text-primary font-black">{task.price} ₺</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default TaskMap;
