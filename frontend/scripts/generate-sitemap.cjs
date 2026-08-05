const fs = require("fs");
const path = require("path");
const axios = require("axios");

const BASE_URL = "https://vancapatina.com";
const API_URL = process.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const STATIC_ROUTES = [
  { url: "/", priority: "1.0", changefreq: "daily" },
  { url: "/shop", priority: "0.9", changefreq: "daily" },
  { url: "/categories", priority: "0.8", changefreq: "weekly" },
  { url: "/about", priority: "0.7", changefreq: "monthly" },
  { url: "/contact", priority: "0.7", changefreq: "monthly" },
  { url: "/privacy-policy", priority: "0.3", changefreq: "yearly" },
  { url: "/terms-and-conditions", priority: "0.3", changefreq: "yearly" },
  { url: "/refund-policy", priority: "0.3", changefreq: "yearly" },
  { url: "/shipping-policy", priority: "0.3", changefreq: "yearly" },
];

const SEED_PRODUCTS = [
  { _id: "65b53e8fb5c6d32fa1d59663", name: "Verde Antiqua Patina Solution", category: "Patina Chemicals", updatedAt: new Date().toISOString() },
  { _id: "65b53e8fb5c6d32fa1d59664", name: "Copper Glow Aging Solution", category: "Patina Chemicals", updatedAt: new Date().toISOString() },
  { _id: "65b53e8fb5c6d32fa1d59665", name: "Professional Finishing Kit", category: "Metal Finishing Kits", updatedAt: new Date().toISOString() },
  { _id: "65b53e8fb5c6d32fa1d59666", name: "Crystal Shield Protective Coating", category: "Protective Coatings", updatedAt: new Date().toISOString() }
];

async function getProductsAndCategories() {
  try {
    console.log(`📡 Fetching products from backend API: ${API_URL}/products`);
    const res = await axios.get(`${API_URL}/products`, { params: { pageSize: 500 } });
    let list = [];
    if (Array.isArray(res.data)) {
      list = res.data;
    } else if (res.data && Array.isArray(res.data.products)) {
      list = res.data.products;
    }
    
    if (list.length > 0) {
      console.log(`✅ Loaded ${list.length} products from API.`);
      return list;
    }
  } catch (err) {
    console.warn(`⚠️ Failed to connect to API (${err.message}). Using seeded products fallback.`);
  }
  return SEED_PRODUCTS;
}

function formatDate(dateStr) {
  try {
    return new Date(dateStr).toISOString().split("T")[0];
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

async function generate() {
  const products = await getProductsAndCategories();
  
  // Extract unique categories
  const categories = Array.from(new Set(products.map(p => p.category))).filter(Boolean);
  
  const urls = [];
  
  // 1. Add static routes
  const todayStr = new Date().toISOString().split("T")[0];
  STATIC_ROUTES.forEach(route => {
    urls.push({
      loc: `${BASE_URL}${route.url}`,
      lastmod: todayStr,
      changefreq: route.changefreq,
      priority: route.priority
    });
  });
  
  // 2. Add category routes
  categories.forEach(cat => {
    urls.push({
      loc: `${BASE_URL}/shop?category=${encodeURIComponent(cat)}`,
      lastmod: todayStr,
      changefreq: "weekly",
      priority: "0.8"
    });
  });
  
  // 3. Add product routes
  products.forEach(p => {
    const id = p._id || p.id;
    if (id) {
      urls.push({
        loc: `${BASE_URL}/product/${id}`,
        lastmod: formatDate(p.updatedAt || p.createdAt || new Date()),
        changefreq: "weekly",
        priority: "0.8"
      });
    }
  });

  // Sitemap XML Building Helper (supports partitioning if URL count > 45,000)
  const MAX_URLS_PER_SITEMAP = 45000;
  
  if (urls.length <= MAX_URLS_PER_SITEMAP) {
    // Generate single sitemap.xml
    const xml = buildSitemapXml(urls);
    const publicPath = path.join(__dirname, "../public/sitemap.xml");
    
    // Ensure public folder exists
    const publicDir = path.dirname(publicPath);
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    fs.writeFileSync(publicPath, xml, "utf8");
    console.log(`🎉 Static sitemap successfully generated at ${publicPath} with ${urls.length} URLs.`);
  } else {
    // Chunk into multiple sitemaps & create index (Technical SEO compliance check)
    const sitemaps = [];
    for (let i = 0; i < urls.length; i += MAX_URLS_PER_SITEMAP) {
      const chunk = urls.slice(i, i + MAX_URLS_PER_SITEMAP);
      const sitemapNum = Math.floor(i / MAX_URLS_PER_SITEMAP) + 1;
      const xml = buildSitemapXml(chunk);
      const sitemapFilename = `sitemap-${sitemapNum}.xml`;
      
      fs.writeFileSync(path.join(__dirname, `../public/${sitemapFilename}`), xml, "utf8");
      sitemaps.push(sitemapFilename);
    }
    
    // Generate sitemap-index.xml
    const indexXml = buildSitemapIndexXml(sitemaps);
    fs.writeFileSync(path.join(__dirname, "../public/sitemap.xml"), indexXml, "utf8");
    console.log(`🎉 Multi-sitemap generated! Index sitemap created at public/sitemap.xml pointing to ${sitemaps.length} sub-sitemaps.`);
  }
}

function buildSitemapXml(urls) {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  
  urls.forEach(u => {
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(u.loc)}</loc>\n`;
    xml += `    <lastmod>${u.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${u.changefreq}</changefreq>\n`;
    xml += `    <priority>${u.priority}</priority>\n`;
    xml += `  </url>\n`;
  });
  
  xml += `</urlset>`;
  return xml;
}

function buildSitemapIndexXml(sitemapFiles) {
  const todayStr = new Date().toISOString().split("T")[0];
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  
  sitemapFiles.forEach(file => {
    xml += `  <sitemap>\n`;
    xml += `    <loc>${BASE_URL}/${file}</loc>\n`;
    xml += `    <lastmod>${todayStr}</lastmod>\n`;
    xml += `  </sitemap>\n`;
  });
  
  xml += `</sitemapindex>`;
  return xml;
}

function escapeXml(string) {
  return string.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case "\"": return "&quot;";
    }
  });
}

generate().catch(err => {
  console.error("❌ Error generating sitemap:", err);
  process.exit(1);
});
