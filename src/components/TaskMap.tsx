import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Map, Satellite } from "lucide-react";
import { useT } from "@/lib/i18n";


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
  ownerName?: string;
  ownerAvatar?: string | null;
  filled?: number;
  personCount?: number;
  needsTools?: boolean;
  toolProvider?: "helper" | "owner";
  toolsCount?: number;
  isOwn?: boolean;
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
    .leaflet-container { background: #1a2418; }
    .leaflet-tile { opacity: 0; transition: opacity 0.35s ease-in; will-change: opacity; }
    .leaflet-tile.leaflet-tile-loaded { opacity: 1; }
    .leaflet-popup-content-wrapper { padding: 10px 0; border-radius: 12px; }
    .leaflet-popup-content { margin: 0 10px !important; line-height: 1; }
    .leaflet-popup-close-button { display: none !important; }
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

const createEmojiIcon = (emoji: string, urgent?: boolean, isOwn?: boolean) => {
  ensurePulseStyles();
  const ringColor = urgent ? "rgba(231,76,60,0.55)" : "hsl(24, 90%, 55%, 0.45)";
  const dotBg = urgent
    ? "linear-gradient(135deg, #e74c3c, #c0392b)"
    : "linear-gradient(135deg, hsl(24, 90%, 55%), hsl(35, 95%, 58%))";

  if (!isOwn) {
    // Başkalarına ait çağrılar: pulse efekti yok, sabit sade işaretçi
    return L.divIcon({
      html: `
        <div class="task-pulse-wrap">
          <div class="task-pulse-dot" style="background:${dotBg}">${emoji}</div>
        </div>
      `,
      className: "",
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -24],
    });
  }

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
  const firstRun = useRef(true);
  useEffect(() => {
    const zoom = Math.max(map.getZoom() ?? 14, 14);
    if (firstRun.current) {
      // İlk yerleşimde animasyon yok: sayfaya dönünce titreme olmasın
      firstRun.current = false;
      map.setView(center, zoom, { animate: false });
      return;
    }
    // Çok küçük GPS oynamalarında haritayı zıplatma (~40m eşik)
    if (map.getCenter().distanceTo(L.latLng(center)) < 40) return;
    map.flyTo(center, zoom, { animate: true, duration: 0.8 });
  }, [center, map]);
  return null;
};



type Props = {
  tasks: TaskPin[];
  center?: [number, number];
  userPos?: [number, number] | null;
  onTaskClick?: (task: TaskPin) => void;
  mapType?: "standard" | "satellite";
};

const TaskMap = ({ tasks, center = [40.9903, 29.0297], userPos = null, onTaskClick, mapType = "satellite" }: Props) => {

  const t = useT();
  const mapCenter = center || userPos || [40.9903, 29.0297];

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
      className="h-full w-full rounded-t-none"
      zoomControl={false}
      attributionControl={false}
    >
      {mapType === "satellite" ? (
        <>
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
            maxNativeZoom={17}
            keepBuffer={4}
            updateWhenIdle={false}
            crossOrigin
          />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
            maxNativeZoom={19}
            keepBuffer={4}
            updateWhenIdle={false}
            crossOrigin
          />
        </>
      ) : (
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          maxNativeZoom={19}
          keepBuffer={4}
          updateWhenIdle={false}
          crossOrigin
        />
      )}
      <LocationUpdater center={mapCenter} />


      {userPos && <Marker position={userPos} icon={userIcon} />}

      {tasks.map((task) => (
        <Marker
          key={task.id}
          position={[task.lat, task.lng]}
          icon={createEmojiIcon(task.emoji, task.urgent, task.isOwn)}
        >
          <Popup>
            <div className="flex min-w-[200px] flex-col leading-none">
              {task.urgent && (
                <p className="m-0 pb-1 text-center text-[10px] font-bold text-destructive">{t("🔥 ACİL YARDIM")}</p>
              )}

              <div className="flex items-center justify-between border-b border-border/40 py-1">
                <span className="text-[10px] font-semibold text-muted-foreground">{t("Kategori:")}</span>
                <span className="line-clamp-1 max-w-[120px] text-right text-xs font-bold">{task.title}</span>
              </div>

              {task.ownerName && (
                <div className="flex items-center justify-between border-b border-border/40 py-1">
                  <span className="text-[10px] font-semibold text-muted-foreground">{t("Çağrı yapan:")}</span>
                  <span className="line-clamp-1 max-w-[120px] text-right text-xs text-muted-foreground">{task.ownerName}</span>
                </div>
              )}

              {typeof task.estimatedMinutes === "number" && (
                <div className="flex items-center justify-between border-b border-border/40 py-1">
                  <span className="text-[10px] font-semibold text-muted-foreground">{t("Süre:")}</span>
                  <span className="text-right text-xs text-muted-foreground">~{task.estimatedMinutes} {t("dk")}</span>
                </div>
              )}

              {task.needsTools && (
                <div className="flex items-center justify-between border-b border-border/40 py-1">
                  <span className="text-[10px] font-semibold text-muted-foreground">{t("Alet/Edevat:")}</span>
                  <span className="line-clamp-1 max-w-[130px] text-right text-xs font-semibold text-primary">
                    {task.toolProvider === "owner" ? t("Ben Sağlıyorum") : t("El Atan Getirsin")}
                    {typeof task.toolsCount === "number" && task.toolsCount > 0 ? ` (${task.toolsCount})` : ""}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between border-b border-border/40 py-1">
                <span className="text-[10px] font-semibold text-muted-foreground">{t("Fiyat:")}</span>
                <span className="text-right font-black text-primary">{task.price} ₺</span>
              </div>

              {(task.personCount ?? 1) > 1 && (
                <p className="m-0 py-1 text-right text-xs font-bold text-muted-foreground">
                  👥 {task.filled ?? 0}/{task.personCount} {t("dolu")}
                </p>
              )}

              {onTaskClick && (
                <button
                  onClick={() => onTaskClick(task)}
                  className="mt-1 w-full rounded-md bg-primary px-3 py-1 text-xs font-bold text-primary-foreground"
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
