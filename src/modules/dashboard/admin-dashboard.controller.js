import { fakeAdminDashboard } from "../../fakeData/fakeAdminDashboard.js";

export const getAdminDashboard = async (req, res, next) => {
  try {
    const admin = {
      id: req.user.id,
      displayName: req.user.displayName,
      username: req.user.username,
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
