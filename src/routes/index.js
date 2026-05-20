import { Router } from "express";
import { router as productsRoutes } from "./product.route.js";

export const router = Router();

router.use("/products", productsRoutes);
