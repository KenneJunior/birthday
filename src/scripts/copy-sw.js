import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Recreate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dist = path.resolve(__dirname, "../../dist/assets");
const targetDir = path.resolve(__dirname, "../../dist");

function copyServiceWorker() {
  try {
    // Check if dist directory exists
    if (!fs.existsSync(dist)) {
      console.error("❌ Dist directory not found:", dist);
      process.exit(1);
    }

    // Get all files in dist directory
    const files = fs.readdirSync(dist);
    console.log("🔍 Searching for Service Worker files...");

    // Better regex that handles both dots and hyphens in hashes
    const swRegex = /^sw[.-].*\.js$|^sw\.js$/;
    const hashedSw = files.find((f) => swRegex.test(f));

    if (!hashedSw) {
      console.error("❌ No Service Worker file found with pattern:", swRegex);
      console.log("📁 Available files:", files);
      process.exit(1);
    }

    const sourcePath = path.join(dist, hashedSw);
    const targetPath = path.join(targetDir, "sw.js");

    // Copy the file
    fs.copyFileSync(sourcePath, targetPath);

    console.log("✅ Successfully copied:");
    console.log("   From:", hashedSw);
    console.log("   To:  ", "sw.js");
  } catch (error) {
    console.error("❌ Error copying Service Worker:", error.message);
    process.exit(1);
  }
}

copyServiceWorker();
