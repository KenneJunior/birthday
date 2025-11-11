import fs from "fs";
import { minify } from "html-minifier-terser";

async function toSafeTemplateLiteral(inputPath, outputPath) {
  let content = fs.readFileSync(inputPath, "utf8");

  // Escape critical characters for template literals
  content = content
    .replace(/\\/g, "\\\\") // escape backslashes first
    .replace(/`/g, "\\`") // escape backticks
    .replace(/\$\{/g, "\\${"); // escape template interpolations

  // Enhanced minification for HTML with CSS and JS
  const result = await minify(content, {
    removeComments: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    useShortDoctype: true,
    minifyCSS: {
      level: 2, // More aggressive CSS minification
    },
    minifyJS: {
      compress: {
        drop_console: false, // Keep console statements for debugging
        ecma: 2020,
      },
      mangle: {
        toplevel: false, // Don't mangle global names
      },
      output: {
        comments: false,
      },
    },
    collapseWhitespace: true,
    conservativeCollapse: false,
    preserveLineBreaks: false,
    removeEmptyAttributes: true,
    removeOptionalTags: true,
  });

  // Write as a proper template literal string
  const templateLiteral = `\`${result}\``;
  fs.writeFileSync(outputPath, templateLiteral);
  console.log(`✅ Safe template literal created: ${outputPath}`);
  console.log(`📏 Original size: ${content.length} bytes`);
  console.log(`📏 Minified size: ${templateLiteral.length} bytes`);
  console.log(
    `📊 Compression: ${(
      (1 - templateLiteral.length / content.length) *
      100
    ).toFixed(1)}% reduction`
  );
}

// Usage
toSafeTemplateLiteral("./public/offline.html", "./offline.min.html");
