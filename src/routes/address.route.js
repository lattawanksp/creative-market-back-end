import { Router } from "express";
import {
  getMyAddress,
  upsertMyAddress,
} from "../modules/address/address.controller.js";

export const router = Router();

//รอ add auth middleware when ready
router.get("/me/address", getMyAddress);
router.put("/me/address", upsertMyAddress);
