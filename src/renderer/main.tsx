import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./i18n";
import { initLanguage } from "./i18n";
import { App } from "./App";

// Load persisted language preference (async, non-blocking)
initLanguage();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
