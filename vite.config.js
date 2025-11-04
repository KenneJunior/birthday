import { resolve } from "path";
import { defineConfig } from "vite";
import { createHtmlPlugin } from "vite-plugin-html";
import htmlMinifier from "vite-plugin-html-minifier-terser";
import { qrcode } from "vite-plugin-qrcode";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  plugins: [
    qrcode(),
    createHtmlPlugin(),
    htmlMinifier({
      minify: {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeEmptyAttributes: true,
        useShortDoctype: true,
        minifyCSS: true,
        minifyJS: true,
      },
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        fhavur: resolve(__dirname, "fhavur.html"),
        confession: resolve(__dirname, "fhavur/confession.html"),
        fhav: resolve(__dirname, "fhavur/missus/fhav.html"),
        login: resolve(__dirname, "login.html"),
        logout: resolve(__dirname, "logOut.html"),
        sw: resolve(__dirname, "public/sw.js"),
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
