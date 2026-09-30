import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { validateContent } from "./lib/data";
import "./styles.css";

if (import.meta.env.DEV) {
  const problems = validateContent();
  if (problems.length) console.warn("Content problems in src/data:\n- " + problems.join("\n- "));
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
