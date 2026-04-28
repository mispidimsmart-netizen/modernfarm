import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// In Lovable preview / iframe contexts, ensure no stale service workers keep
// running (they break HMR and React's hook queue via virtual:pwa-register).
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if ((isInIframe || isPreviewHost) && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  }).catch(() => {});
}

createRoot(document.getElementById("root")!).render(<App />);
