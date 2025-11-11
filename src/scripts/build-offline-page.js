import fs from "fs";
import { minify } from "html-minifier-terser";

async function buildOfflineTemplate() {
  try {
    console.log("📦 Building offline page template...");
    
    // Read the offline HTML file
    const htmlContent = fs.readFileSync("./public/offline.html", "utf8");
    
    // Minify the HTML
    const minified = await minify(htmlContent, {
      removeComments: true,
      minifyCSS: true,
      minifyJS: true,
      collapseWhitespace: true,
      removeAttributeQuotes: true,
      removeOptionalTags: true,
      removeEmptyAttributes: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      useShortDoctype: true,
    });
    
    console.log("✅ HTML minified");
    
    // Escape for template literal
    const escaped = minified
      .replace(/\\/g, "\\\\")  // Escape backslashes
      .replace(/`/g, "\\`")    // Escape backticks
      .replace(/\$\{/g, "\\${"); // Escape template literals
    
    console.log("✅ Content escaped for template literal");
    
    // Create the template file
    const templateContent = `// Auto-generated offline page template
// Generated: ${new Date().toISOString()}
// Source: public/offline.html

const OFFLINE_HTML = \`${escaped}\`;
`;

    // Write to public directory so it's accessible by service worker
    fs.writeFileSync("./public/offline-template.js", templateContent);
    
    const originalSize = Buffer.from(htmlContent).length;
    const minifiedSize = Buffer.from(templateContent).length;
    
    console.log("🎉 Offline template generated successfully!");
    console.log("📊 Stats:");
    console.log(`   Original: ${originalSize} bytes`);
    console.log(`   Minified: ${minifiedSize} bytes`);
    console.log(`   Reduction: ${((1 - minifiedSize / originalSize) * 100).toFixed(1)}%`);
    console.log(`   Output: public/offline-template.js`);
    
  } catch (error) {
    console.error("❌ Error building offline template:", error);
    process.exit(1);
  }
}

// Run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildOfflineTemplate();
}

export { buildOfflineTemplate };
