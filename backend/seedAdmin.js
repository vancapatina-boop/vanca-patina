const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config();
const User = require("./models/User");

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB Connected for seeding admin...");

    const adminExists = await User.findOne({ email: "admin@vancapatina.com" });
    if (!adminExists) {
      await User.create({
        name: "Admin User",
        email: "admin@vancapatina.com",
        password: "password123",
        role: "admin",
      });
      console.log("Admin account strictly seeded! ✅");
    } else {
      console.log("Admin account already exists!");
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
