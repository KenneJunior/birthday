// generate-icons.js
import fs from "fs/promises";
import sharp from "sharp";
import { _log } from "../js/utility/logger.js";

async function generateIcons() {
  const fetchIcon = async () => {
    return await fs.readFile("public/icon/apple/svg/icon_512X512.svg", "utf8");
  };
  const baseSvg = await fetchIcon();
  const sizes = [
    { name: "apple-touch-icon-512x512", size: 512 },
    /*{ name: 'apple-touch-icon-167x167', size: 167 },
    { name: 'apple-touch-icon-152x152', size: 152 },
    { name: 'apple-touch-icon-120x120', size: 120 },
    { name: 'icon-192x192', size: 192 },
    { name: 'icon-512x512', size: 512 }*/
  ];

  for (const { name, size } of sizes) {
    await sharp(Buffer.from(baseSvg))
      /**.resize(size, size)*/
      .png()
      .toFile(`public/icon/${name}.png`);

    _log(`Generated ${name}.png (${size}x${size})`);
  }
}
generateIcons();
