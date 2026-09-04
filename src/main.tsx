import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installNativeGeolocation, ensureLocationPermission } from "./lib/geo";

installNativeGeolocation();
// Uygulama açılır açılmaz, hiçbir butona basmadan konum izni penceresi çıksın.
void ensureLocationPermission();


createRoot(document.getElementById("root")!).render(<App />);
