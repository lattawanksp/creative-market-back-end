import { fakeAdminDashboard } from "../../fakeData/fakeAdminDashboard.js";

export const getAdminDashboard = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;

    const admin = {
      id: userId,
      displayName: req.user.displayName || "Admin User",
      username: req.user.username || "admin",
      role: req.user.role,
      roleLabel: req.user.role === "admin" ? "Admin" : "User",
    };

    res.status(200).json({
      success: true,
      data: {
        admin,
        ...fakeAdminDashboard,
      },
    });
  } catch (error) {
    next(error);
  }
};
