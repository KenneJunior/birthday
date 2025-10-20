import { generateMediaJSON } from "./generate-media-json.js";
import { generateSitemap } from "./generate-sitemap.js";

async function runPreBuild() {
  console.log("🚀 Starting pre-build process...");

  console.log("📸 Step 1: Generating media JSON...");
  const mediaResult = await generateMediaJSON();

  if (!mediaResult.success) {
    console.error("❌ Pre-build failed: Media JSON generation error");
    process.exit(1);
  }

  console.log("✅ Step 1: Media JSON generated successfully");
  console.log(
    `📊 Media Stats: ${mediaResult.stats.total} total items (${mediaResult.stats.images} images, ${mediaResult.stats.videos} videos)`
  );

  // Generate sitemap
  console.log("📝 Step 2: Generating sitemap...");
  const sitemapResult = await generateSitemap();

  if (!sitemapResult.success) {
    console.error("❌ Pre-build failed: Sitemap generation error");
    process.exit(1);
  }

  console.log("✅ Step 2: Sitemap generated successfully");
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
