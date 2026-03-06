import User from "../models/userModel";

// get user by id
export const getUserById = async (id, res) => {
  const user = await User.findById(id);

  if (user) {
    res.status(201).json({
      success: true,
      user,
    });
  }
};
