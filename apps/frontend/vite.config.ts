import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: path.resolve(__dirname, "src/app"),
  resolve: {
    alias: {
      "@acme/frontend": path.resolve(__dirname, "./src"),
    },
  },
});
