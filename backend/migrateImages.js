const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const Product = require('./models/product');

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode === 200) {
        res.pipe(fs.createWriteStream(filepath))
           .on('error', reject)
           .once('close', () => resolve(filepath));
      } else {
        res.resume();
        reject(new Error(`Request Failed With a Status Code: ${res.statusCode}`));
      }
    }).on('error', reject);
  });
}

async function migrateImages() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected for migration...");

    const products = await Product.find({});
    let updatedCount = 0;

    for (let product of products) {
      let needsUpdate = false;

      // Handle single image
      if (product.image && product.image.startsWith('http')) {
        console.log(`Downloading (single): ${product.image}`);
        try {
          const ext = path.extname(new URL(product.image).pathname) || '.jpg';
          const filename = `product-${product._id}-${Date.now()}${ext}`;
          const filepath = path.join(uploadDir, filename);
          await downloadImage(product.image, filepath);
          product.image = `/uploads/${filename}`;
          needsUpdate = true;
        } catch (err) {
          console.error(`Failed to download ${product.image}: ${err.message}`);
        }
      }

      // Handle array of images
      if (product.images && product.images.length > 0) {
        for (let i = 0; i < product.images.length; i++) {
          let url = product.images[i];
          if (url && url.startsWith('http')) {
            console.log(`Downloading (array item): ${url}`);
            try {
              const ext = path.extname(new URL(url).pathname) || '.jpg';
              const filename = `product-${product._id}-${Date.now()}-${i}${ext}`;
              const filepath = path.join(uploadDir, filename);
              await downloadImage(url, filepath);
              product.images[i] = `/uploads/${filename}`;
              needsUpdate = true;
            } catch (err) {
              console.error(`Failed to download ${url}: ${err.message}`);
            }
          }
        }
      }

      if (needsUpdate) {
        await product.save();
        updatedCount++;
        console.log(`Updated product: ${product.name}`);
      }
    }

    console.log(`Migration completed! Updated ${updatedCount} products.`);
    process.exit(0);
  } catch (error) {
    console.error("Migration fatal error:", error);
    process.exit(1);
  }
}

migrateImages();
