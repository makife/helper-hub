import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Mountain, Compass, Map as MapIcon } from "lucide-react";

export type TaskPin = {
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
};

type Props = {
  tasks: TaskPin[];
  center?: [number, number];
  onTaskClick?: (task: TaskPin) => void;
};

// Ücretsiz ve API Anahtarı Gerektirmeyen MapLibre Vektör & Terrain Stil Yapılandırması
const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "osm-tiles": {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors",
    },
    "terrain-source": {
      type: "raster-dem",
      // AWS S3 Üzerinde kamuya açık ve API anahtarsız Terrarium DEM Yükselti Verisi
      tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
      tileSize: 256,
      encoding: "terrarium",
      maxzoom: 15,
    },
  },
  layers: [
    {
      id: "osm-tiles-layer",
      type: "raster",
      source: "osm-tiles",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
  terrain: {
    source: "terrain-source",
    exaggeration: 1.5, // 3D Yükselti belirginliği
  },
};

const TaskMap = ({ tasks, center = [40.9903, 29.0297], onTaskClick }: Props) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: maplibregl.Marker }>({});
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);

  const [is3DMode, setIs3DMode] = useState(false);
  const [terrainEnabled, setTerrainEnabled] = useState(true);

  // Haritayı İlklendir
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: [center[1], center[0]], // MapLibre [lng, lat] sıralaması kullanır
      zoom: 13,
      pitch: 0,
      bearing: 0,
      maxPitch: 85,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

    mapRef.current = map;

    // Kullanıcı Konumunu Al
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const uLng = pos.coords.longitude;
          const uLat = pos.coords.latitude;
          if (mapRef.current) {
            mapRef.current.flyTo({ center: [uLng, uLat], zoom: 14 });

            // Kullanıcı Mavi Nokta Pini
            const el = document.createElement("div");
            el.className = "w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-md animate-pulse";
            
            if (userMarkerRef.current) userMarkerRef.current.remove();
            userMarkerRef.current = new maplibregl.Marker({ element: el })
              .setLngLat([uLng, uLat])
              .addTo(mapRef.current);
          }
        },
        () => {}
      );
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 3D Eğim (Pitch) ve Döndürme Modu Geçişi
  const toggle3DMode = () => {
    if (!mapRef.current) return;
    const nextState = !is3DMode;
    setIs3DMode(nextState);
    mapRef.current.easeTo({
      pitch: nextState ? 60 : 0,
      bearing: nextState ? -17.6 : 0,
      duration: 1000,
    });
  };

  // Arazi (Terrain Yükselti) Aç/Kapa
  const toggleTerrain = () => {
    if (!mapRef.current) return;
    const nextState = !terrainEnabled;
    setTerrainEnabled(nextState);

    if (nextState) {
      mapRef.current.setTerrain({ source: "terrain-source", exaggeration: 1.5 });
    } else {
      mapRef.current.setTerrain(null);
    }
  };

  // Görev Pinlerini (Task Markers) Güncelle
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Eski marker'ları temizle
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    tasks.forEach((task) => {
      const el = document.createElement("div");
      el.className = "relative cursor-pointer group";
      
      const ringColor = task.urgent ? "bg-red-500/50" : "bg-orange-500/40";
      const dotBg = task.urgent 
        ? "bg-gradient-to-br from-red-500 to-red-700" 
        : "bg-gradient-to-br from-orange-400 to-amber-600";

      el.innerHTML = `
        <div class="relative w-10 h-10 flex items-center justify-center">
          <div class="absolute inset-0 rounded-full animate-ping ${ringColor}"></div>
          <div class="relative w-10 h-10 rounded-full ${dotBg} border-2 border-white shadow-lg flex items-center justify-center text-lg">
            ${task.emoji}
          </div>
        </div>
      `;

      // Popup İçeriği
      const popupContent = document.createElement("div");
      popupContent.className = "p-2 text-center min-w-[140px]";
      popupContent.innerHTML = `
        ${task.urgent ? '<p class="text-[10px] font-bold text-red-600 mb-0.5">🔥 ACİL YARDIM</p>' : ''}
        <p class="font-bold text-xs text-gray-900">${task.title}</p>
        ${task.ownerName ? `<p class="text-[11px] text-gray-500">👤 ${task.ownerName}</p>` : ''}
        ${typeof task.estimatedMinutes === "number" ? `<p class="text-[11px] text-gray-500">~${task.estimatedMinutes} dk</p>` : ''}
        <p class="mt-1 font-black text-orange-600 text-sm">${task.price} ₺</p>
        <button id="btn-${task.id}" class="mt-2 w-full bg-orange-500 text-white text-xs font-bold py-1.5 px-3 rounded-lg hover:bg-orange-600 transition-colors">
          Detayları Gör
        </button>
      `;

      const popup = new maplibregl.Popup({ offset: 25 }).setDOMContent(popupContent);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([task.lng, task.lat])
        .setPopup(popup)
        .addTo(map);

      // Popup buton tıklandığında parent callback tetikle
      popup.on("open", () => {
        const btn = document.getElementById(`btn-${task.id}`);
        if (btn) {
          btn.onclick = () => {
            if (onTaskClick) onTaskClick(task);
          };
        }
      });

      markersRef.current[task.id] = marker;
    });
  }, [tasks, onTaskClick]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full" />

      {/* 3D ve Terrain Kontrol Butonları */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        <button
          onClick={toggle3DMode}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold shadow-md backdrop-blur transition-all active:scale-95 ${
            is3DMode ? "bg-primary text-primary-foreground" : "bg-card/90 text-foreground hover:bg-card"
          }`}
        >
          <Compass size={16} className={is3DMode ? "animate-spin" : ""} />
          {is3DMode ? "2D Mod" : "3D Mod"}
        </button>

        <button
          onClick={toggleTerrain}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold shadow-md backdrop-blur transition-all active:scale-95 ${
            terrainEnabled ? "bg-primary text-primary-foreground" : "bg-card/90 text-foreground hover:bg-card"
          }`}
        >
          {terrainEnabled ? <Mountain size={16} /> : <MapIcon size={16} />}
          {terrainEnabled ? "Arazi Aktif" : "Düz Arazi"}
        </button>
      </div>
    </div>
  );
};

export default TaskMap;
