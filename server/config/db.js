import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

mongoose.set("strictQuery", false);

const DB_OPTIONS = {
  dbName: process.env.DB_NAME,
};

// Ensure DB_CONNECTION is defined
if (!process.env.DB_CONNECTION) {
  console.error("DB_CONNECTION is not defined in .env file!");
  process.exit(1);
}

mongoose
  .connect(process.env.DB_CONNECTION, DB_OPTIONS)
  .then(() => {
    console.log("Database connected successfully");
  })
  .catch((err) => {
    console.log("Connection Error: ", err.message);
  });

const db = mongoose.connection;

export default db;
