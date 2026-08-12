import nodeMailer from "nodemailer";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const buildTransport = ({ host, service, port, secure, user, pass }) => {
  const transportConfig = {
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 30000,
    tls: {
      // Hostinger / shared SMTP sometimes presents intermediate cert quirks.
      minVersion: "TLSv1.2",
    },
  };

  if (service) {
    transportConfig.service = service;
  } else if (host) {
    transportConfig.host = host;
  } else {
    throw new Error("SMTP configuration missing host/service.");
  }

  return nodeMailer.createTransport(transportConfig);
};

const resolveSmtpSettings = () => {
  const smtpHost = String(process.env.SMTP_HOST || "").trim();
  const smtpService = String(process.env.SMTP_SERVICE || "").trim();
  const smtpPort = Number.parseInt(String(process.env.SMTP_PORT || "587"), 10) || 587;
  const explicitSecure = String(process.env.SMTP_SECURE || "").trim().toLowerCase();
  const smtpSecure =
    explicitSecure === "true" || explicitSecure === "1"
      ? true
      : explicitSecure === "false" || explicitSecure === "0"
        ? false
        : smtpPort === 465;
  const user = String(process.env.SMTP_MAIL || "").trim();
  const pass = String(process.env.SMTP_PASSWORD || "");

  if (!user || !pass) {
    throw new Error("SMTP_MAIL / SMTP_PASSWORD are missing.");
  }

  return { smtpHost, smtpService, smtpPort, smtpSecure, user, pass };
};

const sendMail = async (options) => {
  const { smtpHost, smtpService, smtpPort, smtpSecure, user, pass } =
    resolveSmtpSettings();

  const { email, subject, template, data } = options;
  if (!email) {
    throw new Error("Missing recipient email.");
  }

  // get the path to the email template file
  const templatePath = path.join(__dirname, "../mails", template);
  // Render the email template with EJS
  const html = await ejs.renderFile(templatePath, data);

  const fromAddress = String(process.env.SMTP_FROM || user).trim() || user;
  const mailOptions = {
    from: {
      name: process.env.SMTP_FROM_NAME || process.env.PROJECT_NAME || "CareMatch AI",
      address: fromAddress,
    },
    to: email,
    subject,
    html,
  };

  const attempts = [
    {
      label: `primary:${smtpHost || smtpService}:${smtpPort}`,
      host: smtpHost,
      service: smtpService,
      port: smtpPort,
      secure: smtpSecure,
    },
  ];

  // Fallback: Hostinger 465 SSL → 587 STARTTLS (common when 465 is blocked)
  if (smtpHost && smtpPort === 465) {
    attempts.push({
      label: `fallback:${smtpHost}:587`,
      host: smtpHost,
      service: "",
      port: 587,
      secure: false,
    });
  }

  let lastError = null;
  for (const attempt of attempts) {
    try {
      const transporter = buildTransport({
        host: attempt.host,
        service: attempt.service,
        port: attempt.port,
        secure: attempt.secure,
        user,
        pass,
      });
      const info = await transporter.sendMail(mailOptions);
      console.log(
        `[mail] sent via ${attempt.label} → ${email} id=${info?.messageId || "n/a"} response=${info?.response || "n/a"}`,
      );
      return info;
    } catch (error) {
      lastError = error;
      console.error(
        `[mail] failed via ${attempt.label} → ${email}:`,
        error?.message || error,
        error?.response || "",
      );
    }
  }

  const reason = lastError?.message || "Unknown SMTP error";
  throw new Error(`SMTP send failed: ${reason}`);
};

export default sendMail;
