import express from "express";
import { Router } from "express";
import { addItemToCart } from "../modules/cart/cart.controller.js";
import { clearCart } from "../modules/cart/cart.controller.js";
import { getCartByUserId } from "../modules/cart/cart.controller.js";

export const router = Router();

router.post("/add", addItemToCart);
router.delete("/clear/:userId", clearCart);
router.get("/:userId", getCartByUserId);
