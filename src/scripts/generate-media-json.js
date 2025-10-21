import { existsSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";

// Configuration
const DEFAULT_CONFIG = {
  picsDir: "public/pics",
  thumbsDir: "public/pics/thumbnails",
  vidDir: "public/vid",
  outputFile: "public/gallery-data.json",
  lastFile: "screenshot1.jpg",
  imageAltTexts: {
    "img1.jpg": "Proud Bamenda pikin 😅😅",
    "img2.jpg": "Miss Bamenda 😹😹",
    "img3.jpg": "andriod Generation and phone 😃😆",
    "img4.jpg": "when you where learning how to ngess 🤣🤣",
    "img5.jpg": "smile smile smile 😁😊",
    "tata.jpg": "Happy memory 5",
    "profile_pic.jpg": "awwww wu is my princess 🤣🤣",
    "screenshot1.jpg": "screenshot of the app",
  },
  videoAltTexts: {
    "video1.jpg": "Under sun adey, Under rain .... 🤣🤣",
    "video2.jpg": "fine child 😘😘",
    "video3.jpg": "Ok whats happening here 🤣🤣🤣",
  },
  showstats: true,
};
let CONFIG = {};
function generateMediaJSON(config = {}) {
  CONFIG = { ...DEFAULT_CONFIG, ...config };
  _log("📸 Generating media JSON file...");

  const mediaArray = [];
  let lastFileItem = null;

  try {
    // Get all files in the main pics directory (excluding thumbnails directory)
    const picFiles = readdirSync(CONFIG.picsDir, { withFileTypes: true })
      .filter(
        (dirent) => dirent.isFile() && /\.(jpg|jpeg|png)$/i.test(dirent.name)
      )
      .map((dirent) => dirent.name);

    _log(`📁 Found ${picFiles.length} image files in ${CONFIG.picsDir}`);

    // Process images
    picFiles.forEach((filename) => {
      if (filename === CONFIG.lastFile) {
        // Skip the last file for now
        return;
      }
      const srcPath = `/pics/${filename}`;
      const thumbPath = `/pics/thumbnails/${filename}`;

      // Check if thumbnail exists
      const thumbExists = existsSync(join(CONFIG.thumbsDir, filename));

      if (thumbExists) {
        const altText = CONFIG.imageAltTexts[filename] || `Image: ${filename}`;

        mediaArray.push({
          src: srcPath,
          thumb: thumbPath,
          alt: altText,
          "data-type": "image",
        });

        _log(`✅ Added image: ${filename}`);
      } else {
        _log(`⚠️  Skipping ${filename} - thumbnail not found`);
      }
    });

    // Process videos by checking thumbnails in thumbnails directory
    const thumbFiles = readdirSync(CONFIG.thumbsDir, { withFileTypes: true })
      .filter(
        (dirent) => dirent.isFile() && /\.(jpg|jpeg|png)$/i.test(dirent.name)
      )
      .map((dirent) => dirent.name);

    _log(`📁 Found ${thumbFiles.length} thumbnail files`);

    // Find video thumbnails (those that don't have corresponding images in main pics dir)
    const videoThumbs = thumbFiles.filter((thumbFile) => {
      const correspondingImage = picFiles.find(
        (picFile) => picFile === thumbFile
      );
      return !correspondingImage && thumbFile !== CONFIG.lastFile;
    });

    _log(`🎥 Found ${videoThumbs.length} video thumbnails`);

    // Process videos
    videoThumbs.forEach((thumbFile) => {
      const videoName = thumbFile.replace(".jpg", ".mp4");
      const videoPath = `/vid/${videoName}`;
      const thumbPath = `/pics/thumbnails/${thumbFile}`;

      // Check if video file exists
      const videoExists = existsSync(join(CONFIG.vidDir, videoName));

      if (videoExists) {
        const altText =
          CONFIG.videoAltTexts[thumbFile] || `Video: ${videoName}`;

        mediaArray.push({
          thumb: thumbPath,
          alt: altText,
          "data-type": "video",
          "video-src": videoPath,
        });

        _log(`✅ Added video: ${videoName}`);
      } else {
        _log(`⚠️  Skipping ${thumbFile} - video file ${videoName} not found`);
      }
    });

    // Add the last specified file at the end if it exists
    if (picFiles.includes(CONFIG.lastFile)) {
      const srcPath = `/pics/${CONFIG.lastFile}`;
      const thumbPath = `/pics/thumbnails/${CONFIG.lastFile}`;
      const thumbExists = existsSync(join(CONFIG.thumbsDir, CONFIG.lastFile));

      if (thumbExists) {
        const altText =
          CONFIG.imageAltTexts[CONFIG.lastFile] || `Image: ${CONFIG.lastFile}`;

        lastFileItem = {
          src: srcPath,
          thumb: thumbPath,
          alt: altText,
          "data-type": "image",
        };

        console.log(`✅ Added last image: ${CONFIG.lastFile}`);
      }
    }

    if (lastFileItem) {
      mediaArray.push(lastFileItem);
    }

    // Create the final JSON structure
    const jsonOutput = {
      media: mediaArray,
    };

    // Write to file
    writeFileSync(CONFIG.outputFile, `${JSON.stringify(jsonOutput, null, 2)}`);

    _log(`✅ Successfully generated ${CONFIG.outputFile}`);
    _log(`📊 Total media items: ${mediaArray.length}`);
    _log(
      `📷 Images: ${
        mediaArray.filter((item) => item["data-type"] === "image").length
      }`
    );
    _log(
      `🎥 Videos: ${
        mediaArray.filter((item) => item["data-type"] === "video").length
      }`
    );

    return {
      success: true,
      stats: {
        total: mediaArray.length,
        images: mediaArray.filter((item) => item["data-type"] === "image")
          .length,
        videos: mediaArray.filter((item) => item["data-type"] === "video")
          .length,
      },
    };
  } catch (error) {
    console.error("❌ Error generating media JSON:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

function _log(message) {
  if (CONFIG.showstats) console.log(message);
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateMediaJSON();
}

export { generateMediaJSON };
