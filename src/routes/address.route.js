import { Router } from "express";
import {
  getMyAddress,
  upsertMyAddress,
} from "../modules/address/address.controller.js";
import { fakeAuth } from "../middlewares/fakeAuth.js";

export const router = Router();

router.get("/me/address", fakeAuth, getMyAddress);
router.put("/me/address", fakeAuth, upsertMyAddress);
