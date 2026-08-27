import { useState } from "react";
import { MapPin, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

/**
 * Drop this button into the profile page to let the user (re)grant
 * location permission. Add it wherever fits your profile layout, e.g.:
 *
 *   import LocationPermissionButton from "@/components/LocationPermissionButton";
 *   ...
 *   <LocationPermissionButton />
 */
const LocationPermissionButton = () => {
  const [status, setStatus] = useState<"idle" | "granted" | "denied">("idle");
  const [checking, setChecking] = useState(false);

  const requestLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Cihazınız konum özelliğini desteklemiyor.");
      return;
    }
    setChecking(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        setChecking(false);
        setStatus("granted");
        toast.success("Konum izni verildi 📍");
      },
      () => {
        setChecking(false);
        setStatus("denied");
        toast.error("Konum izni verilmedi. Tarayıcı/telefon ayarlarından açabilirsin.");
      },
    );
  };

  return (
    <button
      onClick={requestLocation}
      disabled={checking}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-card transition-all active:scale-[0.98] disabled:opacity-60"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
        <MapPin size={18} className="text-primary" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-foreground">Konum İzni</p>
        <p className="text-xs text-muted-foreground">
          {checking
            ? "Kontrol ediliyor..."
            : status === "granted"
              ? "İzin verildi"
              : status === "denied"
                ? "İzin verilmedi"
                : "Yakınındaki çağrıları görebilmek için izin ver"}
        </p>
      </div>
      {status === "granted" && <CheckCircle2 size={18} className="text-primary" />}
      {status === "denied" && <XCircle size={18} className="text-destructive" />}
    </button>
  );
};

export default LocationPermissionButton;
