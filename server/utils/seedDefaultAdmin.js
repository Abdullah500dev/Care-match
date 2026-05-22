import User from "../models/userModel.js";

const seedDefaultAdmin = async () => {
  const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL;
  const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
  const defaultAdminName = process.env.DEFAULT_ADMIN_NAME || "Admin";

  if (!defaultAdminEmail || !defaultAdminPassword) {
    return;
  }

  const existingByEmail = await User.findOne({ email: defaultAdminEmail });
  if (existingByEmail) {
    if (existingByEmail.user_type !== "admin" || existingByEmail.role !== "admin") {
      existingByEmail.user_type = "admin";
      existingByEmail.role = "admin";
      existingByEmail.is_verified = true;
      await existingByEmail.save({ validateBeforeSave: false });
      console.log("Updated configured default admin user role to admin.");
    }
    return;
  }

  const anyAdminExists = await User.exists({ user_type: "admin" });
  if (anyAdminExists) {
    return;
  }

  await User.create({
    name: defaultAdminName,
    email: defaultAdminEmail,
    password: defaultAdminPassword,
    user_type: "admin",
    role: "admin",
    is_verified: true,
  });

  console.log(`Default admin created: ${defaultAdminEmail}`);
};

export default seedDefaultAdmin;
