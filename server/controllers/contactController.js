import catchAsyncError from "../middleware/catchAsyncErrors.js";
import ErrorHandler from "../utils/errorHandler.js";
import sendMail from "../utils/sendMail.js";

const DEFAULT_ADMIN_EMAIL = "usman.anwar@myzing.io";
const CONTACT_FORM_EXTRA_EMAILS = ["zelyons22@gmail.com"];

const resolveContactRecipients = () => {
  const primary = String(
    process.env.CONTACT_ADMIN_EMAIL ||
      process.env.EXPLORE_ADMIN_EMAIL ||
      DEFAULT_ADMIN_EMAIL,
  )
    .trim()
    .toLowerCase();

  const extraFromEnv = String(process.env.CONTACT_ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const recipients = [];
  const seen = new Set();
  for (const address of [primary, ...CONTACT_FORM_EXTRA_EMAILS, ...extraFromEnv]) {
    if (!address || seen.has(address)) continue;
    seen.add(address);
    recipients.push(address);
  }
  return recipients;
};

/**
 * Public Contact Us form → email admin recipients.
 * POST /api/contact
 */
export const submitContactForm = catchAsyncError(async (req, res, next) => {
  const fullName = String(req.body?.fullName || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const phone = String(req.body?.phone || "").trim();
  const subject = String(req.body?.subject || "").trim();
  const message = String(req.body?.message || "").trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[+]?[\d\s().-]{7,20}$/;

  if (!fullName) return next(new ErrorHandler("Full name is required", 400));
  if (!email || !emailRegex.test(email)) {
    return next(new ErrorHandler("A valid email address is required", 400));
  }
  if (phone && !phoneRegex.test(phone)) {
    return next(new ErrorHandler("Enter a valid phone number", 400));
  }
  if (!subject) return next(new ErrorHandler("Subject is required", 400));
  if (!message) return next(new ErrorHandler("Message is required", 400));

  const recipients = resolveContactRecipients();
  if (!recipients.length) {
    return next(new ErrorHandler("Admin email is not configured", 500));
  }

  try {
    const mailPayload = {
      subject: `Contact form: ${subject}`,
      template: "contact-form.ejs",
      replyTo: email,
      data: {
        fullName,
        email,
        phone,
        subject,
        message,
      },
    };
    await Promise.all(
      recipients.map((recipient) =>
        sendMail({
          ...mailPayload,
          email: recipient,
        }),
      ),
    );
  } catch (error) {
    console.error("[contact] mail failed:", error?.message || error);
    return next(
      new ErrorHandler(
        "Could not send your message right now. Please try again shortly.",
        502,
      ),
    );
  }

  res.status(200).json({
    success: true,
    message: "Message sent successfully",
  });
});
