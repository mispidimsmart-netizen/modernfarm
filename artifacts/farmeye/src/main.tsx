import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initPagePerfTracking } from "./lib/perf";
import { initSentry } from "./lib/sentry";

initSentry();
initPagePerfTracking();

createRoot(document.getElementById("root")!).render(<App />);
