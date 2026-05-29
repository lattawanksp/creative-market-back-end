import { fakeUserDashboard } from "../../fakeData/fakeUserDashboard.js";

export const getUserDashboard = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;

    const profile = {
      id: userId,
      displayName:
        req.user.displayName || fakeUserDashboard.profile.displayName,
      username: req.user.username || fakeUserDashboard.profile.username,
      role: req.user.role || fakeUserDashboard.profile.role,
      roleLabel: req.user.role === "admin" ? "Admin" : "User",
      avatarUrl: fakeUserDashboard.profile.avatarUrl,
    };

    res.status(200).json({
      success: true,
      data: {
        ...fakeUserDashboard,
        profile,
      },
    });
  } catch (error) {
    next(error);
  }
};
