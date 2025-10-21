import { generateMediaJSON } from "./generate-media-json.js";
import { generateRobotsTxt } from "./generate-robots.js";
import { generateSitemap } from "./generate-sitemap.js";

async function runPreBuild() {
  console.log("🚀 Starting pre-build process...");

  console.log("🤖 Step 1: Generating robots.txt...");
  const robotsResult = generateRobotsTxt("production");

  if (!robotsResult.success) {
    console.error("❌ Pre-build failed: robots.txt generation error");
    process.exit(1);
  }

  console.log("✅ Step 1: robots.txt generated successfully");
  console.log(`   - Environment: ${robotsResult.environment}`);
  console.log(
    `   - Rules: ${robotsResult.rules.allow} allow, ${robotsResult.rules.disallow} disallow`
  );

  // Generate media JSON
  console.log("📸 step 2: Generating media JSON...");
  const mediaResult = await generateMediaJSON({ showstats: false });

  if (!mediaResult.success) {
    console.error("❌ Pre-build failed: Media JSON generation error");
    process.exit(1);
  }

  console.log("✅ step 2: Media JSON generated successfully");
  console.log(
    `📊 Media Stats: ${mediaResult.stats.total} total items (${mediaResult.stats.images} images, ${mediaResult.stats.videos} videos)`
  );

  // Generate sitemap
  console.log("📝 step 3: Generating sitemap...");
  const sitemapResult = await generateSitemap({ showstats: false });

  if (!sitemapResult.success) {
    console.error("❌ Pre-build failed: Sitemap generation error");
    process.exit(1);
  }

  console.log("✅ step 3: Sitemap generated successfully");
  console.log("📊 Sitemap Stats:");
  console.log(`   - ${sitemapResult.stats.urls} total URLs`);
  console.log(`   - ${sitemapResult.stats.pages} HTML pages`);
  console.log(`   - ${sitemapResult.stats.videos} videos`);
  console.log(`   - ${sitemapResult.stats.images} images`);

  console.log("🎉 All pre-build tasks completed successfully!");
  console.log("🏗️  You can now run your build command...");
}

runPreBuild().catch((error) => {
  console.error("💥 Pre-build process failed:", error);
  process.exit(1);
});
