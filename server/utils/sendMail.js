import nodeMailer from "nodemailer";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sendMail = async (options) => {
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

  const transportConfig = {
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: process.env.SMTP_MAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  };

  if (smtpService) {
    transportConfig.service = smtpService;
  } else if (smtpHost) {
    transportConfig.host = smtpHost;
  } else {
    throw new Error("SMTP configuration missing host/service.");
  }

  const transporter = nodeMailer.createTransport(transportConfig);

  const { email, subject, template, data } = options;

  // get the path to the email template file
  const templatePath = path.join(__dirname, "../mails", template);
  // Render the email template with EJS
  const html = await ejs.renderFile(templatePath, data);

  const mailOptions = {
    from: {
      name: process.env.SMTP_FROM_NAME || process.env.PROJECT_NAME || "CareMatch AI",
      address: process.env.SMTP_MAIL,
    },
    to: email,
    subject,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    const reason = error?.message || "Unknown SMTP error";
    throw new Error(`SMTP send failed: ${reason}`);
  }
};

export default sendMail;
