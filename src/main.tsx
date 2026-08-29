import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installNativeGeolocation } from "./lib/geo";

installNativeGeolocation();

createRoot(document.getElementById("root")!).render(<App />);
