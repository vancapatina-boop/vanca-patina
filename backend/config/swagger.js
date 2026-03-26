const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Vanca Patina API",
      version: "1.0.0",
      description: "MERN backend APIs (auth, products, cart, orders, admin)",
    },
    servers: [
      {
        url: process.env.CLIENT_URL || "http://localhost:5173",
      },
    ],
  },
  apis: ["./routes/*.js"],
};

module.exports = swaggerJsdoc(options);

