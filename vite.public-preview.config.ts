import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// A dedicated public bundle: no campaign page, API proxy, or unrelated previews.
export default defineConfig({
  root: "apps/web",
  publicDir: false,
  plugins: [react()],
  build: {
    outDir: "../../.impeccable/review/city-public",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        city: "apps/web/city-diorama.html",
        seeds: "apps/web/city-seeds.html",
      },
    },
  },
});
