import { resolve } from "path";
import { defineConfig } from "vite";
import { qrcode } from "vite-plugin-qrcode";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  plugins: [qrcode()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        fhavur: resolve(__dirname, "fhavur.html"),
        confession: resolve(__dirname, "fhavur/confession.html"),
        fhav: resolve(__dirname, "fhavur/missus/fhav.html"),
        login: resolve(__dirname, "login.html"),
        logout: resolve(__dirname, "logOut.html"),
      },
      output: {
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
    //uncomment this if you want to minify the option for terser
    //minify: "terser",
    minify: "false",
  },
});
