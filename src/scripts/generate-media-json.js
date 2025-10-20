import { existsSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";

// Configuration
const CONFIG = {
  picsDir: "public/pics",
  thumbsDir: "public/pics/thumbnails",
  vidDir: "public/vid",
  outputFile: "public/gallery-data.json",
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
};

function generateMediaJSON() {
  console.log("📸 Generating media JSON file...");

  const mediaArray = [];

  try {
    // Get all files in the main pics directory (excluding thumbnails directory)
    const picFiles = readdirSync(CONFIG.picsDir, { withFileTypes: true })
      .filter(
        (dirent) => dirent.isFile() && /\.(jpg|jpeg|png)$/i.test(dirent.name)
      )
      .map((dirent) => dirent.name);

    console.log(`📁 Found ${picFiles.length} image files in ${CONFIG.picsDir}`);

    // Process images
    picFiles.forEach((filename) => {
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

        console.log(`✅ Added image: ${filename}`);
      } else {
        console.log(`⚠️  Skipping ${filename} - thumbnail not found`);
      }
    });

    // Process videos by checking thumbnails in thumbnails directory
    const thumbFiles = readdirSync(CONFIG.thumbsDir, { withFileTypes: true })
      .filter(
        (dirent) => dirent.isFile() && /\.(jpg|jpeg|png)$/i.test(dirent.name)
      )
      .map((dirent) => dirent.name);

    console.log(`📁 Found ${thumbFiles.length} thumbnail files`);

    // Find video thumbnails (those that don't have corresponding images in main pics dir)
    const videoThumbs = thumbFiles.filter((thumbFile) => {
      const correspondingImage = picFiles.find(
        (picFile) => picFile === thumbFile
      );
      return !correspondingImage;
    });

    console.log(`🎥 Found ${videoThumbs.length} video thumbnails`);

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

        console.log(`✅ Added video: ${videoName}`);
      } else {
        console.log(
          `⚠️  Skipping ${thumbFile} - video file ${videoName} not found`
        );
      }
    });

    // Create the final JSON structure
    const jsonOutput = {
      media: mediaArray,
    };

    // Write to file
    writeFileSync(CONFIG.outputFile, JSON.stringify(jsonOutput, null, 2));

    console.log(`✅ Successfully generated ${CONFIG.outputFile}`);
    console.log(`📊 Total media items: ${mediaArray.length}`);
    console.log(
      `📷 Images: ${
        mediaArray.filter((item) => item["data-type"] === "image").length
      }`
    );
    console.log(
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

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateMediaJSON();
}

export { generateMediaJSON };
