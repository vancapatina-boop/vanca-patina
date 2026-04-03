const { v2: cloudinary } = require("cloudinary");

// Trim any accidental whitespace from env values
const cloudName  = (process.env.CLOUDINARY_CLOUD_NAME  || "").trim();
const apiKey     = (process.env.CLOUDINARY_API_KEY     || "").trim();
const apiSecret  = (process.env.CLOUDINARY_API_SECRET  || "").trim();

const hasCloudinary = !!(cloudName && apiKey && apiSecret);

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key:    apiKey,
    api_secret: apiSecret,
    secure:     true, // always use https URLs
  });
  console.log("✅ Cloudinary configured — cloud:", cloudName);
} else {
  console.warn("⚠️  Cloudinary NOT configured — falling back to local uploads");
}

/**
 * Upload a file buffer or local path to Cloudinary.
 * @param {Buffer|string} source  - file buffer or absolute local file path
 * @param {object}        options - extra cloudinary upload options
 * @returns {Promise<object>}     - Cloudinary upload result
 */
function uploadToCloudinary(source, options = {}) {
  const defaults = {
    folder:        "vanca-patina/products",
    resource_type: "image",
    // Auto quality + format for best size/quality ratio
    quality:       "auto",
    fetch_format:  "auto",
  };

  if (Buffer.isBuffer(source)) {
    // Stream-based upload (used with multer memoryStorage)
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { ...defaults, ...options },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      uploadStream.end(source);
    });
  }

  // File-path based upload
  return cloudinary.uploader.upload(source, { ...defaults, ...options });
}

/**
 * Delete an image from Cloudinary by its public_id.
 * Safely ignores missing images (not-found) so product deletes don't fail.
 * @param {string} publicId
 */
async function deleteFromCloudinary(publicId, options = {}) {
  if (!hasCloudinary || !publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, options);
  } catch (err) {
    console.error("Cloudinary delete error:", err.message);
  }
}

/**
 * Extract the Cloudinary public_id from a secure_url.
 * e.g. "https://res.cloudinary.com/da0ujiaue/image/upload/v123/vanca-patina/products/xyz.jpg"
 *   -> "vanca-patina/products/xyz"
 */
function getPublicId(url) {
  if (!url || !url.includes("cloudinary.com")) return null;
  try {
    const parts = url.split("/upload/");
    if (parts.length < 2) return null;
    // Strip version segment (v12345/) and file extension
    const afterUpload = parts[1].replace(/^v\d+\//, "");
    return afterUpload.replace(/\.[^/.]+$/, "");
  } catch {
    return null;
  }
}

module.exports = { cloudinary, hasCloudinary, uploadToCloudinary, deleteFromCloudinary, getPublicId };
