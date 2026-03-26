const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config();
const Product = require("./models/product");

const products = [
  {
    name: "Verde Antiqua Patina Solution",
    price: 2499,
    description: "Professional-grade copper patina solution.",
    category: "Patina Chemicals",
    image: "/src/assets/product-1.jpg"
  },
  {
    name: "Copper Glow Aging Solution",
    price: 1899,
    description: "Advanced aging solution.",
    category: "Patina Chemicals",
    image: "/src/assets/product-2.jpg"
  },
  {
    name: "Professional Finishing Kit",
    price: 5499,
    description: "Complete metal finishing kit.",
    category: "Metal Finishing Kits",
    image: "/src/assets/product-3.jpg"
  },
  {
    name: "Crystal Shield Protective Coating",
    price: 1299,
    description: "Ultra-clear protective coating.",
    category: "Protective Coatings",
    image: "/src/assets/product-4.jpg"
  }
];

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB Connected for seeding...");
    await Product.deleteMany({});
    await Product.insertMany(products);
    console.log("Products Seeded!");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
