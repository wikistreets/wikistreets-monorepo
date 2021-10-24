require("dotenv").config() // to get environmental variables
//const path = require('path');

const config = {
  mode: process.env.NODE_ENV,
  server: {
    port: process.env.PORT,
  },
  mongo: {
    connectionString:
      process.env.NODE_ENV == "production"
        ? process.env.MONGODB_CXN_STRING_PROD
        : process.env.MONGODB_CXN_STRING_DEV,
    user:
      process.env.NODE_ENV == "production"
        ? process.env.MONGODB_USER_PROD
        : process.env.MONGODB_USER_DEV,
    password:
      process.env.NODE_ENV == "production"
        ? process.env.MONGODB_PASS_PROD
        : process.env.MONGODB_PASS_DEV,
  },
  markers: {
    uploadDirectory: "public/uploads",
    maxFiles: 10,
    maxImageWidth: 7000,
    maxImageHeight: 7000,
    maxImageFileSize: 100 * 1024 * 1024, // 100MB
  },
  map: {
    boundingBoxBuffer: 1, // 1 km
    uploadDirectory: "public/uploads",
    maxFiles: 10, // underlying images
    maxImageWidth: 4000,
    maxImageHeight: 4000,
    maxImageFileSize: 100 * 1024 * 1024, // 100MB
  },
  imports: {
    maxFiles: 10, // imported geojson files
    maxImageFileSize: 500 * 1024 * 1024, // 100MB
  },
  jwt: {
    jwtIssuer: process.env.JWT_ISSUER,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpirationAge: process.env.JWT_EXPIRATION_AGE,
  },
}

module.exports = config
