import mongoose from "mongoose";
import config from "./env.js";

mongoose.set("strictQuery", false);

const DB_OPTIONS = {
  dbName: config.DB_NAME,
  user: config.DB_USERNAME,
  pass: config.DB_PASSWORD,
  authSource: config.DB_AUTHSOURCE,
};

mongoose
  .connect(
    `mongodb://${config.DB_HOST}:${config.DB_PORT}/${config.DB_NAME}?${config.DB_REPLICASET}`,
    DB_OPTIONS
  )
  .catch((err) => {
    console.log("Connection Error: ", err.message);
  });

const db = mongoose.connection;

export default db;
