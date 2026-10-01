import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Configuración de Vite para la app React del dashboard.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true, // abre el navegador automáticamente al hacer `pnpm dev`
  },
});
