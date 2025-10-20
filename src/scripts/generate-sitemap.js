import { writeFileSync } from "fs";
import { SitemapStream, streamToPromise } from "sitemap";
import { Readable } from "stream";

// Define public-facing routes based on project structure
let links = [
  { url: "/", changefreq: "daily", priority: 1.0 }, // index.html
  { url: "/fhavur.html", changefreq: "weekly", priority: 0.8 },
  { url: "/fhavur/confession.html", changefreq: "weekly", priority: 0.7 },
  { url: "/fhavur/missus/fhav.html", changefreq: "weekly", priority: 0.7 },
];

// Optional: Dynamically generate links by scanning HTML files
import { readdirSync } from "fs";
import { join } from "path";

function getHtmlFiles(
  dir,
  depth = 0,
  maxDepth = 4,
  excludeDirs = [
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
  ]
) {
  let results = [];
  if (depth > maxDepth) return results;

  try {
    const files = readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = join(dir, file.name);
      const relativePath = fullPath.replace(/^public\//, "").replace(/^/, "/");

      // Skip excluded directories
      if (
        file.isDirectory() &&
        excludeDirs.some((exclude) => fullPath.includes(exclude))
      ) {
        continue;
      }

      if (file.isDirectory()) {
        results = results.concat(
          getHtmlFiles(fullPath, depth + 1, maxDepth, excludeDirs)
        );
      } else if (
        file.name.endsWith(".html") &&
        !["login.html", "logOut.html"].includes(file.name)
      ) {
        results.push({
          url: relativePath,
          changefreq: "weekly",
          priority: relativePath === "/" ? 1.0 : 0.7,
        });
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err);
  }
  return results;
}

// Uncomment to use dynamic generation instead of static links
//links = getHtmlFiles(".", 0, 4);

const sitemap = new SitemapStream({ hostname: "https://fhavur.vercel.app" });

streamToPromise(Readable.from(links).pipe(sitemap))
  .then((data) => {
    writeFileSync("public/sitemap.xml", data.toString());
    console.log("Sitemap generated successfully at public/sitemap.xml \n");
    console.log(data.toString());
    console.log("\n Links included in sitemap:", links);
  })
  .catch((err) => {
    console.error("Error generating sitemap:", err);
  });
