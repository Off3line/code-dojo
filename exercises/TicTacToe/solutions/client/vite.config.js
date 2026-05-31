import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Port can be overridden so you can run two instances at once:
//   npm run dev               -> http://localhost:5173
//   npm run dev -- --port 5174 -> http://localhost:5174
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
