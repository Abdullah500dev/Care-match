import dotenv from "dotenv";
import express from "express";
import http from "http";
import bodyParser from "body-parser";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import database from "./config/db.js";
import swaggerSpecs from "./config/swagger.js";
import authRouter from "./routes/authRouter.js";
import chatRouter from "./routes/chatRouter.js";
import facilityRouter from "./routes/facilityRouter.js";
import matchRouter from "./routes/matchRouter.js";
import emailRouter from "./routes/emailRouter.js";
import messageRouter from "./routes/messageRouter.js";
import snfPartnerRouter from "./routes/snfPartnerRouter.js";
import ErrorHandler from "./utils/errorHandler.js";
import seedDefaultAdmin from "./utils/seedDefaultAdmin.js";
import { startApifySyncScheduler } from "./services/apifySyncScheduler.js";
import { ensureSnfReferralIndexes } from "./models/snfPartnerModel.js";
import { initSocketServer } from "./socket/socketServer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env";

dotenv.config({ path: path.resolve(__dirname, envFile) });

const app = express();
const port = Number.parseInt(String(process.env.PORT || "3002"), 10) || 3002;
const httpServer = http.createServer(app);
const corsOrigin = process.env.CLIENT_BASE_URL;
const io = initSocketServer(httpServer, corsOrigin);
app.set("io", io);

database.on("error", console.error.bind(console, "Database connection error:"));
database.once("open", async () => {
  try {
    await ensureSnfReferralIndexes();
  } catch (error) {
    console.error("SNF referral index repair failed:", error.message);
  }
  try {
    await seedDefaultAdmin();
  } catch (error) {
    console.error("Default admin seed failed:", error.message);
  }
});

app.use(
  cors({
    origin: process.env.CLIENT_BASE_URL,
    optionsSuccessStatus: 200,
    credentials: true,
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/uploads", express.static("uploads"));

/** Lightweight health probe for deploy / load balancers (no DB dependency). */
app.get("/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: process.env.PROJECT_NAME || "care-match-ai",
    port,
    env: process.env.NODE_ENV || "development",
  });
});

// Swagger Documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpecs, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Care Match AI API Documentation",
  })
);

app.use("/api/auth", authRouter);
app.use("/api/chat", chatRouter);
app.use("/api/match", matchRouter);
app.use("/api/facilities", facilityRouter);
app.use("/api/email", emailRouter);
app.use("/api/messages", messageRouter);
app.use("/api/snf-partners", snfPartnerRouter);

// Serve client build if it exists, otherwise show API info
const clientDistPath = path.join(__dirname, "../client/dist");
if (fs.existsSync(clientDistPath)) {
  // Serve static files from client dist
  app.use(express.static(clientDistPath));
  
  // Handle SPA routing - serve index.html for all non-API routes
  app.get("/*", (req, res, next) => {
    // Skip API routes and static assets
    if (req.path.startsWith("/api") || req.path.startsWith("/api-docs") || req.path.startsWith("/uploads")) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
} else {
  // If no client build exists, serve a simple message
  app.get("/", (_, res) =>
    res.json({ message: `Welcome to ${process.env.PROJECT_NAME} backend.` })
  );
  
  app.get("/*", (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith("/api") || req.path.startsWith("/api-docs") || req.path.startsWith("/uploads")) {
      return next();
    }
    res.json({
      message:
        "Backend API is running. Please build the frontend client to access the full application.",
      endpoints: {
        api: "/api",
        docs: "/api-docs",
        auth: "/api/auth",
      },
    });
  });
}

app.all("*", (_, res) => res.status(404).json({ success: false, message: "Route not found", status: 404 }));

// Global error handler – always return JSON (for Swagger and API clients)
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(statusCode).json({
    success: false,
    message,
    status: statusCode,
  });
});

httpServer.listen(port, () => console.log(`Server is running on port ${port}!`));
startApifySyncScheduler();
