import { createRoot } from "react-dom/client";
import Home from "./app/page";
import "./app/globals.css";

const baseUrl = import.meta.env.BASE_URL;
const rootStyle = document.documentElement.style;

rootStyle.setProperty("--tactical-map-image", `url("${baseUrl}tactical-map.jpg")`);
rootStyle.setProperty("--sprite-atlas-image", `url("${baseUrl}protocol-sprite-atlas.png")`);

const root = document.getElementById("root");
if (!root) throw new Error("Protocol: Grid root element was not found.");

createRoot(root).render(<Home />);
