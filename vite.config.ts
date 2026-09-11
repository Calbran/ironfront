import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  root: "apps/web",
  plugins: [react()],
  server: {
    allowedHosts: ["brutus.tail250251.ts.net"],
    proxy: { "/api": "http://127.0.0.1:3000" },
  },
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: "apps/web/index.html",
        country: "apps/web/country-poi.html",
        slice: "apps/web/country-slice.html",
        pacing: "apps/web/pacing-preview.html",
        legacy: "apps/web/legacy.html",
        jeep: "apps/web/jeep-preview.html",
        military: "apps/web/military-preview.html",
        animations: "apps/web/animation-review.html",
        three: "apps/web/three-preview.html",
        seeds: "apps/web/city-seeds.html",
        city: "apps/web/city-diorama.html",
        reference: "apps/web/reference-preview.html",
      },
    },
  },
});
