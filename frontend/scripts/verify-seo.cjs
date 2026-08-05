const fs = require("fs");
const path = require("path");

const robotsPath = path.join(__dirname, "../public/robots.txt");
const sitemapPath = path.join(__dirname, "../public/sitemap.xml");

function runVerification() {
  console.log("🔍 Starting Automated SEO Verification...");

  // 1. Verify robots.txt
  if (!fs.existsSync(robotsPath)) {
    console.error("❌ Error: robots.txt is missing from public directory!");
    process.exit(1);
  }
  
  const robotsText = fs.readFileSync(robotsPath, "utf8");
  if (!robotsText.includes("Disallow: /admin")) {
    console.error("❌ Error: robots.txt is missing Disallow for admin paths!");
    process.exit(1);
  }
  if (!robotsText.includes("Disallow: /checkout")) {
    console.error("❌ Error: robots.txt is missing Disallow for checkout paths!");
    process.exit(1);
  }
  if (!robotsText.includes("Sitemap: https://vancapatina.com/sitemap.xml")) {
    console.error("❌ Error: robots.txt is missing or has incorrect Sitemap URL!");
    process.exit(1);
  }
  console.log("✅ robots.txt validation passed.");

  // 2. Verify sitemap.xml
  if (!fs.existsSync(sitemapPath)) {
    console.error("❌ Error: sitemap.xml is missing from public directory!");
    process.exit(1);
  }

  const sitemapXml = fs.readFileSync(sitemapPath, "utf8");
  if (!sitemapXml.startsWith("<?xml")) {
    console.error("❌ Error: sitemap.xml does not start with XML definition header!");
    process.exit(1);
  }
  if (!sitemapXml.includes("<urlset") || !sitemapXml.includes("</urlset>")) {
    console.error("❌ Error: sitemap.xml structure is invalid (missing urlset element)!");
    process.exit(1);
  }

  const requiredUrls = [
    "https://vancapatina.com/",
    "https://vancapatina.com/shop",
    "https://vancapatina.com/categories",
    "https://vancapatina.com/about",
    "https://vancapatina.com/contact",
    "https://vancapatina.com/privacy-policy",
    "https://vancapatina.com/terms-and-conditions",
    "https://vancapatina.com/refund-policy",
    "https://vancapatina.com/shipping-policy"
  ];

  requiredUrls.forEach(url => {
    if (!sitemapXml.includes(`<loc>${url}</loc>`)) {
      console.error(`❌ Error: sitemap.xml is missing required static URL: ${url}`);
      process.exit(1);
    }
  });
  console.log("✅ sitemap.xml static routes validation passed.");

  // Verify dynamic product pages exist in sitemap
  if (!sitemapXml.includes("/product/")) {
    console.error("❌ Error: sitemap.xml does not contain any dynamic product routes!");
    process.exit(1);
  }
  console.log("✅ sitemap.xml dynamic routes validation passed.");

  console.log("🚀 All Automated SEO checks passed successfully!");
}

runVerification();
