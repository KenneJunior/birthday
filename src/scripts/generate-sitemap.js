import { readdirSync, statSync, writeFileSync } from "fs";
import { join, relative } from "path";
import { SitemapStream, streamToPromise } from "sitemap";
import { Readable } from "stream";

// Configuration
const CONFIG = {
  hostname: "https://fhavur.vercel.app",
  maxDepth: 4,
  excludeDirs: [
    "node_modules",
    ".github",
    ".vscode",
    "dist",
    ".idea",
    "public/icon",
    "public/pics/thumbnails",
    "src/PWA",
    "src/utils",
    "src/scripts",
  ],
  excludedHtmlFiles: [
    "login.html",
    "googlea4ebe33199796548.html",
    "logOut.html",
    "pwa-prompt.html",
  ],
};

// Generic function to scan files
function scanFiles(dir, fileExtensions, options = {}) {
  const { depth = 0, maxDepth = CONFIG.maxDepth, processFile } = options;
  let results = [];

  if (depth > maxDepth) return results;

  try {
    const files = readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
      const fullPath = join(dir, file.name);

      // Skip excluded directories
      if (
        file.isDirectory() &&
        CONFIG.excludeDirs.some((excludeDir) => fullPath.includes(excludeDir))
      ) {
        continue;
      }

      if (file.isDirectory()) {
        results = results.concat(
          scanFiles(fullPath, fileExtensions, { ...options, depth: depth + 1 })
        );
      } else if (fileExtensions.test(file.name)) {
        const stats = statSync(fullPath);
        const processed = processFile(fullPath, stats, file.name);
        if (processed) results.push(processed);
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err);
  }

  return results;
}

// Get HTML files
function getHtmlFiles(dir) {
  return scanFiles(dir, /\.html$/, {
    processFile: (fullPath, stats, fileName) => {
      if (CONFIG.excludedHtmlFiles.includes(fileName)) return null;

      const relPath = relative(".", fullPath).replace(/\\/g, "/");
      const url = relPath === "index.html" ? "/" : `/${relPath}`;

      return {
        url,
        lastmod: stats.mtime.toISOString().split("T")[0],
        changefreq: url === "/" ? "daily" : "weekly",
        priority: url === "/" ? 1.0 : 0.7,
      };
    },
  });
}

// Get image files
function getImageFiles(dir) {
  return scanFiles(dir, /\.(jpg|jpeg|png)$/i, {
    processFile: (fullPath, stats, fileName) => {
      if (fileName.includes("thumbnail") || fullPath.includes("thumbnails"))
        return null;

      const relPath = relative("public", fullPath).replace(/\\/g, "/");

      return {
        url: `${CONFIG.hostname}/${relPath}`,
        caption: `Media: ${fileName}`,
        title: `Media: ${fileName}`,
      };
    },
  });
}

// Get video files
function getVideoFiles(dir) {
  return scanFiles(dir, /\.(mp4)$/i, {
    processFile: (fullPath, stats, fileName) => {
      const videoRelPath = relative("public", fullPath).replace(/\\/g, "/");
      const videoName = fileName.replace(/\.[^/.]+$/, "");
      const thumbnailRelPath = `pics/thumbnails/${videoName}.jpg`;

      return {
        url: `/${videoRelPath}`,
        lastmod: stats.mtime.toISOString().split("T")[0],
        video: [
          {
            thumbnail_loc: `${CONFIG.hostname}/${thumbnailRelPath}`,
            title: `Video: ${videoName}`,
            description: `Video content: ${fileName}`,
            content_loc: `${CONFIG.hostname}/${videoRelPath}`,
          },
        ],
      };
    },
  });
}

// Generate sitemap
export async function generateSitemap() {
  try {
    const [htmlLinks, imageObjects, videoLinks] = await Promise.all([
      getHtmlFiles("."),
      getImageFiles("."),
      getVideoFiles("."),
    ]);

    // Add images to root page
    const root = htmlLinks.find((link) => link.url === "/");
    if (root && imageObjects.length > 0) {
      root.img = imageObjects;
    }

    // Combine links and remove duplicates
    const allLinks = [...htmlLinks, ...videoLinks];
    const uniqueLinks = allLinks.filter(
      (link, index, self) => index === self.findIndex((l) => l.url === link.url)
    );

    // Generate sitemap
    const sitemap = new SitemapStream({
      hostname: CONFIG.hostname,
      xmlns: { xhtml: true, image: true, video: true },
    });

    const data = await streamToPromise(
      Readable.from(uniqueLinks).pipe(sitemap)
    );
    writeFileSync("public/sitemap.xml", data.toString());

    console.log("✅ Sitemap generated successfully at public/sitemap.xml");
    console.log(
      `📊 Stats: ${uniqueLinks.length} URLs, ${htmlLinks.length} pages, ${videoLinks.length} videos, ${imageObjects.length} images`
    );
    return true;
  } catch (err) {
    console.error("❌ Error generating sitemap:", err);
    return false;
  }
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateSitemap();
}
