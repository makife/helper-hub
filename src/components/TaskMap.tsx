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

// Injects the pulsing-marker keyframes into the document once.
const ensurePulseStyles = () => {
  if (document.getElementById("task-pulse-styles")) return;
  const style = document.createElement("style");
  style.id = "task-pulse-styles";
  style.innerHTML = `
    @keyframes task-pulse-ring {
      0% { transform: scale(0.9); opacity: 0.7; }
      70% { transform: scale(1.8); opacity: 0; }
      100% { transform: scale(1.8); opacity: 0; }
    }
    .task-pulse-wrap { position: relative; width: 40px; height: 40px; }
    .task-pulse-ring {
      position: absolute; inset: 0; border-radius: 50%;
      animation: task-pulse-ring 1.6s ease-out infinite;
    }
    .task-pulse-dot {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      border-radius: 50%; font-size: 18px; border: 2px solid white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
  `;
  document.head.appendChild(style);
};

const createEmojiIcon = (emoji: string, urgent?: boolean) => {
  ensurePulseStyles();
  const ringColor = urgent ? "rgba(231,76,60,0.55)" : "hsl(24, 90%, 55%, 0.45)";
  const dotBg = urgent
    ? "linear-gradient(135deg, #e74c3c, #c0392b)"
    : "linear-gradient(135deg, hsl(24, 90%, 55%), hsl(35, 95%, 58%))";
  return L.divIcon({
    html: `
      <div class="task-pulse-wrap">
        <div class="task-pulse-ring" style="background:${ringColor}"></div>
        <div class="task-pulse-dot" style="background:${dotBg}">${emoji}</div>
      </div>
    `,
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
        >
          <Popup>
            <div className="min-w-[160px] text-center">
              {task.urgent && (
                <p className="mb-1 text-[10px] font-bold text-destructive">🔥 ACİL YARDIM</p>
              )}
              <p className="font-bold">{task.title}</p>
              {typeof task.estimatedMinutes === "number" && (
                <p className="text-xs text-muted-foreground">~{task.estimatedMinutes} dk</p>
              )}
              <p className="mt-0.5 text-primary font-black">{task.price} ₺</p>
              {onTaskClick && (
                <button
                  onClick={() => onTaskClick(task)}
                  className="mt-2 w-full rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                >
                  Detayları Gör
                </button>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default TaskMap;
