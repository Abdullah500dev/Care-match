import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import config from "../config/env.js";
import EmailTemplate from "../models/emailTemplateModel.js";
import CountryStateCity from "../models/countryStateCityModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

db.on("error", console.error.bind(console, "Database connection error:"));
db.once("open", async () => {
  console.log("Connected to MongoDB successfully!");
  await populateCollections();
});

const readJsonFile = (filename) => {
  try {
    const filePath = path.join(__dirname, "defaultCollections", filename);
    const fileContent = fs.readFileSync(filePath, "utf8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error reading ${filename}:`, error.message);
    return [];
  }
};


const populateEmailTemplates = async () => {
  try {
    console.log("📧 Populating email templates...");
    const templates = readJsonFile("emailtemplates.json");

    if (templates.length === 0) {
      console.log("No email templates found in JSON file");
      return;
    }

    let createdCount = 0;
    let skippedCount = 0;

    for (const template of templates) {
      if (!template.name || template.name.trim() === "") {
        console.log("⚠️  Skipping template with empty name");
        skippedCount++;
        continue;
      }

      const existingTemplate = await EmailTemplate.findOne({
        name: template.name,
      });

      if (!existingTemplate) {
        const newTemplate = new EmailTemplate({
          name: template.name,
          subject: template.subject,
          body: template.body,
        });
        await newTemplate.save();
        console.log(`✅ Created email template: ${template.name}`);
        createdCount++;
      } else {
        console.log(`⏭️  Email template already exists: ${template.name}`);
        skippedCount++;
      }
    }

    console.log(
      `📧 Email Templates Summary: ${createdCount} created, ${skippedCount} skipped`
    );
  } catch (error) {
    console.error("❌ Error populating email templates:", error.message);
  }
};

const populateCountryStateCity = async () => {
  try {
    console.log("🌍 Populating country state city data...");
    const locations = readJsonFile("countrystatecities.json");

    if (locations.length === 0) {
      console.log("No location data found in JSON file");
      return;
    }

    let createdCount = 0;
    let skippedCount = 0;
    let batchSize = 1000; 

    for (let i = 0; i < locations.length; i += batchSize) {
      const batch = locations.slice(i, i + batchSize);

      for (const location of batch) {
        if (
          !location.country ||
          !location.state ||
          !location.city ||
          !location.zip
        ) {
          console.log("⚠️  Skipping location with missing required fields");
          skippedCount++;
          continue;
        }

        const existingLocation = await CountryStateCity.findOne({
          country: location.country,
          state: location.state,
          city: location.city,
          zip: location.zip,
        });

        if (!existingLocation) {
          const newLocation = new CountryStateCity({
            country: location.country,
            countryShortCode: location.countryShortCode,
            state: location.state,
            stateShortCode: location.stateShortCode,
            city: location.city,
            zip: location.zip,
          });
          await newLocation.save();
          createdCount++;
        } else {
          skippedCount++;
        }
      }

      if (locations.length > 10000) {
        console.log(
          `📊 Progress: ${Math.min(i + batchSize, locations.length)}/${
            locations.length
          } processed`
        );
      }
    }

    console.log(
      `🌍 Country State City Summary: ${createdCount} created, ${skippedCount} skipped`
    );
  } catch (error) {
    console.error(
      "❌ Error populating country state city data:",
      error.message
    );
  }
};


const populateCollections = async () => {
  try {
    console.log("🚀 Starting database population...");

    await populateEmailTemplates();

    await populateCountryStateCity();

    console.log("✅ Database population completed successfully!");
    console.log("🔗 You can now run the application with: npm start");
  } catch (error) {
    console.error("❌ Error during database population:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
    process.exit(0);
  }
};

process.on("SIGINT", async () => {
  console.log("\n🛑 Process interrupted. Closing database connection...");
  await mongoose.connection.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Process terminated. Closing database connection...");
  await mongoose.connection.close();
  process.exit(0);
});
