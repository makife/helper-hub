import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installNativeGeolocation } from "./lib/geo";
import { requestStartupPermissions } from "./lib/permissions";

installNativeGeolocation();

createRoot(document.getElementById("root")!).render(<App />);

// Arayüz oturduktan sonra bildirim ve konum izinlerini sırayla iste.
void requestStartupPermissions();
