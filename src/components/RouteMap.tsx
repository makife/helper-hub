import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { X, Navigation, Volume2, VolumeX, MapPin } from "lucide-react";
import {
  type LatLng,
  type RouteStep,
  formatDistance,
  formatDuration,
  turkishInstruction,
  nearestPointOnRoute,
  buildStepsFromLegs,
  findCurrentStepIndex,
  remainingDistanceToStepEnd,
  speak,
  fetchOSRMRoute,
} from "@/lib/navigation";

type Props = {
  taskLat: number;
  taskLng: number;
  taskTitle: string;
  onClose: () => void;
};

const MapController = ({
  userPos,
  followUser,
}: {
  userPos: LatLng | null;
  followUser: boolean;
}) => {
  const map = useMap();
  useEffect(() => {
    if (userPos && followUser) {
      map.panTo(userPos, { animate: true, duration: 0.4 });
    }
  }, [userPos, followUser, map]);
  return null;
};

const FitBounds = ({ points }: { points: LatLng[] }) => {
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
  html: `<div style="width:18px;height:18px;border-radius:50%;background:hsl(220,55%,18%);border:3px solid white;box-shadow:0 0 10px rgba(0,0,0,0.3)"></div>`,
  className: "",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const taskIcon = L.divIcon({
  html: `<div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:linear-gradient(135deg,hsl(24,90%,55%),hsl(35,95%,58%));box-shadow:0 4px 12px rgba(0,0,0,0.2);font-size:16px;border:2px solid white">📍</div>`,
  className: "",
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const RouteMap = ({ taskLat, taskLng, taskTitle, onClose }: Props) => {
  const [userPos, setUserPos] = useState<LatLng | null>(null);
  const [route, setRoute] = useState<LatLng[]>([]);
  const [steps, setSteps] = useState<RouteStep[]>([]);
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [nextInstruction, setNextInstruction] = useState<string | null>(null);
  const [nextDistance, setNextDistance] = useState<number | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [followUser, setFollowUser] = useState(true);
  const [loadingRoute, setLoadingRoute] = useState(true);
  const [offRoute, setOffRoute] = useState(false);
  const announcedRef = useRef<Set<number>>(new Set());
  const watchIdRef = useRef<number | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const destination: LatLng = [taskLat, taskLng];

  const loadRoute = async (from: LatLng) => {
    setLoadingRoute(true);
    const data = await fetchOSRMRoute(from, destination);
    if (!data) {
      setLoadingRoute(false);
      return;
    }
    const coords = data.geometry.coordinates.map((c) => [c[1], c[0]] as LatLng);
    setRoute(coords);
    setSteps(buildStepsFromLegs(data.legs));
    setDistance(formatDistance(data.distance));
    setDuration(formatDuration(data.duration));
    setCurrentStepIndex(0);
    setNextInstruction(turkishInstruction(data.legs[0].steps[0]));
    setNextDistance(data.legs[0].steps[0].distance);
    announcedRef.current.clear();
    setLoadingRoute(false);
  };

  useEffect(() => {
    if (!("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const uPos: LatLng = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(uPos);
        loadRoute(uPos);
      },
      () => setLoadingRoute(false)
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const uPos: LatLng = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(uPos);

        if (route.length > 0) {
          const { distance: offDist } = nearestPointOnRoute(uPos, route);
          setOffRoute(offDist > 80);
          if (offDist > 120) {
            loadRoute(uPos);
            return;
          }
        }

        if (steps.length > 0) {
          const idx = findCurrentStepIndex(uPos, steps, currentStepIndex);
          if (idx !== currentStepIndex) {
            setCurrentStepIndex(idx);
            announcedRef.current.delete(idx + 1);
          }
          const step = steps[idx];
          const remaining = remainingDistanceToStepEnd(uPos, step);
          setNextDistance(remaining);
          setNextInstruction(turkishInstruction(step));

          if (voiceEnabled) {
            if (remaining < 60 && !announcedRef.current.has(idx)) {
              announcedRef.current.add(idx);
              const text = turkishInstruction(step, remaining);
              speak(text);
            } else if (remaining < 250 && !announcedRef.current.has(idx + 1)) {
              announcedRef.current.add(idx + 1);
              const text = turkishInstruction(step, remaining);
              speak(text);
            }
          }
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskLat, taskLng, route.length, steps.length, voiceEnabled]);

  const center: LatLng = userPos || destination;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pb-3 pt-4 safe-top">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-black text-foreground">{taskTitle}</h2>
          {distance && (
            <p className="text-xs text-muted-foreground">
              <Navigation size={10} className="mr-1 inline" />
              {distance} · ~{duration}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setVoiceEnabled((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-card"
            aria-label={voiceEnabled ? "Sesi kapat" : "Sesi aç"}
          >
            {voiceEnabled ? (
              <Volume2 size={20} className="text-primary" />
            ) : (
              <VolumeX size={20} className="text-muted-foreground" />
            )}
          </button>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-card"
          >
            <X size={20} className="text-foreground" />
          </button>
        </div>
      </div>

      {/* Navigation banner */}
      {nextInstruction && (
        <div className="mx-5 mb-3 rounded-2xl bg-primary p-4 text-primary-foreground shadow-soft">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-foreground/20">
              <MapPin size={20} className="text-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-snug">{nextInstruction}</p>
              {nextDistance !== null && (
                <p className="mt-1 text-xs font-semibold opacity-90">
                  Sonraki manevra: {formatDistance(nextDistance)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {offRoute && (
        <div className="mx-5 mb-3 rounded-2xl bg-destructive/10 px-4 py-3 text-center text-xs font-bold text-destructive">
          Rota dışına çıktın, yeniden hesaplanıyor...
        </div>
      )}

      {/* Map */}
      <div className="relative flex-1">
        {loadingRoute && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        <MapContainer
          center={center}
          zoom={16}
          className="h-full w-full"
          zoomControl={false}
          attributionControl={false}
          ref={mapRef}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {userPos && route.length >= 2 && <FitBounds points={[userPos, destination]} />}
          <MapController userPos={userPos} followUser={followUser} />
          {userPos && <Marker position={userPos} icon={userIcon} />}
          <Marker position={destination} icon={taskIcon} />
          {route.length > 0 && (
            <Polyline
              positions={route}
              pathOptions={{ color: "hsl(24, 90%, 55%)", weight: 6, opacity: 0.85, lineCap: "round" }}
            />
          )}
        </MapContainer>

        {/* Floating controls */}
        <div className="absolute bottom-5 right-5 flex flex-col gap-2">
          <button
            onClick={() => setFollowUser((f) => !f)}
            className={`flex h-12 w-12 items-center justify-center rounded-full shadow-card ${
              followUser ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
            }`}
            aria-label={followUser ? "Konumu takip etme" : "Konumu takip et"}
          >
            <Navigation size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RouteMap;
