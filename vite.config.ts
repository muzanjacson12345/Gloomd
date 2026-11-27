import { defineConfig } from "vite";

export default defineConfig({
  base: "/Gloomd/",
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true
  }
});
