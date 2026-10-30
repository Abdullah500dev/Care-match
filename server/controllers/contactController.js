import catchAsyncError from "../middleware/catchAsyncErrors.js";
import ErrorHandler from "../utils/errorHandler.js";
import sendMail from "../utils/sendMail.js";

const DEFAULT_ADMIN_EMAIL = "usman.anwar@myzing.io";

const resolveAdminEmail = () =>
  String(
    process.env.CONTACT_ADMIN_EMAIL ||
      process.env.EXPLORE_ADMIN_EMAIL ||
      DEFAULT_ADMIN_EMAIL,
  )
    .trim()
    .toLowerCase();

/**
 * Public Contact Us form → email admin.
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

  const adminEmail = resolveAdminEmail();
  if (!adminEmail) {
    return next(new ErrorHandler("Admin email is not configured", 500));
  }

  try {
    await sendMail({
      email: adminEmail,
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
    });
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
