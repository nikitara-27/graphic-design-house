import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/** Refuse to build with a Supabase secret/service_role key: it would be public in the site. */
function assertPublicSupabaseKey(key: string) {
  if (!key) return;
  let role = "";
  try {
    role = JSON.parse(Buffer.from(key.split(".")[1] ?? "", "base64url").toString()).role ?? "";
  } catch {
    /* not a JWT */
  }
  if (key.startsWith("sb_secret_") || role === "service_role") {
    throw new Error(
      "VITE_SUPABASE_KEY is a SECRET key. Use the public anon / publishable key instead, and rotate the secret key in Supabase.",
    );
  }
}

// base: "./" keeps asset paths relative so the build works on GitHub Pages sub-paths,
// Netlify, or Vercel without changes.
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), "VITE_"), ...process.env };
  assertPublicSupabaseKey((env.VITE_SUPABASE_KEY ?? "").trim());
  return {
    base: "./",
    plugins: [react()],
  };
});
