import { Router } from "express";
import { getUserDashboard } from "../modules/dashboard/user-dashboard.controller.js";
import { getAdminDashboard } from "../modules/dashboard/admin-dashboard.controller.js";
import { fakeAuth } from "../middlewares/fakeAuth.js";

export const router = Router();

router.get("/user", fakeAuth, getUserDashboard);
router.get("/admin", fakeAuth, getAdminDashboard);
