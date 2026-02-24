import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      "@emotion/react",
      "@emotion/styled",
      "@mui/material/Box/Box.js",
      "@mui/material/Popper/Popper.js",
      "@mui/material/Tooltip",
    ],
  },
});