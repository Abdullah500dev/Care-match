import express from "express";
import http from "http";
import bodyParser from "body-parser";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "passport";
import { Server } from "socket.io";
import swaggerUi from "swagger-ui-express";

import config from "./config/env.js";
import database from "./config/db.js";
import socket from "./config/socket.js";
import swaggerSpecs from "./config/swagger.js";

import authRouter from "./routes/authRouter.js";
import userRouter from "./routes/userRouter.js";
import countryStateCityRouter from "./routes/countryStateCityRouter.js";
import aiContentRouter from "./routes/aiContentRouter.js";

const app = express();
const server = http.createServer(app);
const port = config.PORT;
const io = new Server(server, {
  cors: {
    origin: config.CLIENT_BASE_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

database.on("error", console.error.bind(console, "Database connection error:"));
socket(io);

app.use(
  cors({
    origin: config.CLIENT_BASE_URL,
    optionsSuccessStatus: 200,
    credentials: true,
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(cookieParser());
app.use((req, _, next) => {
  req.io = io;
  next();
});
app.use("/uploads", express.static("uploads"));

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpecs, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: `${config.APP_NAME} API Documentation`,
  })
);

app.use("/api/auth/", authRouter);
app.use("/api/user/", userRouter);
app.use("/api/country-state-city/", countryStateCityRouter);
app.use("/api/ai-content/", aiContentRouter);

app.get("/", (_, res) =>
  res.json({
    message: `Welcome to ${config.APP_NAME} backend.`,
    documentation: `${config.SERVER_BASE_URL}/api-docs`,
    version: config.APP_VERSION,
  })
);

server.listen(port, () => {
  console.log(`Server is running on port ${port}!`);
});
