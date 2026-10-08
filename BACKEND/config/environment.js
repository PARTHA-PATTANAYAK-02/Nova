import dotenv from "dotenv";

dotenv.config();

const trimmedEnv = (name) => process.env[name]?.trim();

const allowedClientOrigins = (process.env.CLIENT_URLS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const environment = Object.freeze({
  server: {
    port: Number(process.env.PORT) || 8000,
    host: process.env.HOST || "0.0.0.0",
  },
  runtime: {
    isProduction: process.env.NODE_ENV === "production",
  },
  client: {
    allowedOrigins: allowedClientOrigins,
  },
  database: {
    mongoUri: process.env.MONGODB_URI,
  },
  authentication: {
    jwtSecret: trimmedEnv("JWT_SECRET"),
  },
  email: {
    serviceId: trimmedEnv("SERVICE_ID"),
    publicKey: trimmedEnv("PUBLIC_KEY"),
    privateKey: trimmedEnv("EMAILJS_PRIVATE_KEY") || trimmedEnv("PRIVATE_KEY"),
    resetTemplateId: trimmedEnv("EMAILJS_RESET_TEMPLATE_ID"),
    verificationTemplateId: trimmedEnv("EMAILJS_VERIFY_TEMPLATE_ID"),
  },
  emailValidation: {
    apiUrl:
      process.env.ABSTRACT_EMAIL_API_URL ||
      "https://emailreputation.abstractapi.com/v1/",
    apiKey: process.env.ABSTRACT_EMAIL_API_KEY,
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
});
