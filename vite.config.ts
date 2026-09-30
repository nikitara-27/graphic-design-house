import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" keeps asset paths relative so the build works on GitHub Pages sub-paths,
// Netlify, or Vercel without changes.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
