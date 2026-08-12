import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import Home from "./app/page";
import "./app/globals.css";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const baseUrl = import.meta.env.BASE_URL;
const rootStyle = document.documentElement.style;

rootStyle.setProperty("--tactical-map-image", `url("${baseUrl}tactical-map.jpg")`);
rootStyle.setProperty("--sprite-atlas-image", `url("${baseUrl}protocol-sprite-atlas.png")`);
rootStyle.setProperty("--expansion-atlas-image", `url("${baseUrl}protocol-expansion-atlas.png")`);
rootStyle.setProperty("--expansion-atlas-2-image", `url("${baseUrl}protocol-expansion-atlas-2.png")`);
rootStyle.setProperty("--expansion-portraits-2-image", `url("${baseUrl}protocol-expansion-portraits-2-v2.png")`);
rootStyle.setProperty("--revised-skill-icons-image", `url("${baseUrl}protocol-skill-icons-v2.png")`);

function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const clearPrompt = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", clearPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", clearPrompt);
    };
  }, []);

  if (!installPrompt) return null;
  const install = async () => {
    const prompt = installPrompt;
    setInstallPrompt(null);
    await prompt.prompt();
    await prompt.userChoice;
  };
  return <button className="pwa-install-button" onClick={() => void install()}><i aria-hidden="true">+</i><span>앱 설치</span><small>오프라인 실행</small></button>;
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(`${baseUrl}sw.js`, { scope: baseUrl });
  }, { once: true });
}

const root = document.getElementById("root");
if (!root) throw new Error("Protocol: Grid root element was not found.");

createRoot(root).render(<><Home /><PwaInstallButton /></>);
