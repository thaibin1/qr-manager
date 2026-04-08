import { v2 as cloudinary } from 'cloudinary';

// Test Key 2: 975928382811497
cloudinary.config({
  cloud_name: 'dvdtidkei',
  api_key: '975928382811497',
  api_secret: 'nZNoN_4YuctTP-p0bDWBfEFNzkQ'
});

async function run() {
  try {
    const result = await cloudinary.uploader.upload("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", {
      folder: 'qr-manager'
    });
    console.log("Key 2 SUCCESS:", result.secure_url);
  } catch (error) {
    console.error("Key 2 FAILED:", error.message);
  }
}

run();
