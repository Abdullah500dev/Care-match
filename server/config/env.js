import dotenv from "dotenv";

dotenv.config();

const config = {
  APP_NAME: process.env.APP_NAME,
  APP_VERSION: process.env.APP_VERSION,
  CLIENT_BASE_URL: process.env.CLIENT_BASE_URL,
  SERVER_BASE_URL: process.env.SERVER_BASE_URL,

  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,

  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_NAME: process.env.DB_NAME,
  DB_USERNAME: process.env.DB_USERNAME,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_AUTHSOURCE: process.env.DB_AUTHSOURCE,
  DB_REPLICASET: process.env.DB_REPLICASET,

  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  COOKIE_EXPIRES_IN: process.env.COOKIE_EXPIRES_IN,

  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,

  ADMIN_EMAIL: process.env.ADMIN_EMAIL,

  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,

  O_AUTH_2_CLIENT_CLIENT_ID: process.env.O_AUTH_2_CLIENT_CLIENT_ID,
  O_AUTH_2_CLIENT_CLIENT_SECRET: process.env.O_AUTH_2_CLIENT_CLIENT_SECRET,
  O_AUTH_2_CLIENT_REFRESH_TOKEN: process.env.O_AUTH_2_CLIENT_REFRESH_TOKEN,

  validate() {
    const required = [
      "APP_NAME",
      "APP_VERSION",
      "CLIENT_BASE_URL",
      "SERVER_BASE_URL",
      "NODE_ENV",
      "PORT",
      "DB_HOST",
      "DB_PORT",
      "DB_NAME",
      "JWT_SECRET",
      "JWT_EXPIRES_IN",
      "COOKIE_EXPIRES_IN",
    ];

    const missing = required.filter((key) => !this[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(", ")}`
      );
    }
  },

  isDevelopment() {
    return this.NODE_ENV === "development";
  },

  isProduction() {
    return this.NODE_ENV === "production";
  },
};

config.validate();

export default config;
