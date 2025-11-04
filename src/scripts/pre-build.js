import { _log } from "../js/utility/logger.js";
import { generateMediaJSON } from "./generate-media-json.js";
import { generateRobotsTxt } from "./generate-robots.js";
import { generateSitemap } from "./generate-sitemap.js";

async function runPreBuild() {
  _log("🚀 Starting pre-build process...");

  _log("🤖 Step 1: Generating robots.txt...");
  const robotsResult = generateRobotsTxt("production");

  if (!robotsResult.success) {
    console.error("❌ Pre-build failed: robots.txt generation error");
    process.exit(1);
  }

  _log("✅ Step 1: robots.txt generated successfully");
  _log(`   - Environment: ${robotsResult.environment}`);
  _log(
    `   - Rules: ${robotsResult.rules.allow} allow, ${robotsResult.rules.disallow} disallow`
  );

  // Generate media JSON
  _log("📸 step 2: Generating media JSON...");
  const mediaResult = await generateMediaJSON({ showstats: false });

  if (!mediaResult.success) {
    console.error("❌ Pre-build failed: Media JSON generation error");
    process.exit(1);
  }

  _log("✅ step 2: Media JSON generated successfully");
  _log(
    `📊 Media Stats: ${mediaResult.stats.total} total items (${mediaResult.stats.images} images, ${mediaResult.stats.videos} videos)`
  );

  // Generate sitemap
  _log("📝 step 3: Generating sitemap...");
  const sitemapResult = await generateSitemap({ showstats: false });

  if (!sitemapResult.success) {
    console.error("❌ Pre-build failed: Sitemap generation error");
    process.exit(1);
  }

  _log("✅ step 3: Sitemap generated successfully");
  _log("📊 Sitemap Stats:");
  _log(`   - ${sitemapResult.stats.urls} total URLs`);
  _log(`   - ${sitemapResult.stats.pages} HTML pages`);
  _log(`   - ${sitemapResult.stats.videos} videos`);
  _log(`   - ${sitemapResult.stats.images} images`);

  _log("🎉 All pre-build tasks completed successfully!");
  _log("🏗️  You can now run your build command...");
}

runPreBuild().catch((error) => {
  console.error("💥 Pre-build process failed:", error);
  process.exit(1);
});
