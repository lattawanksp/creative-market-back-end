import { Cart } from "./cart.model.js";

export const addItemToCart = async (req, res, next) => {
  try {
    const { userId, productId, quantity } = req.body;
    let cart = await Cart.findOne({ userId });

    if (cart) {
      // ถ้าตะกร้ามีแล้ว เช็คว่าสินค้าตัวนี้มีในตะกร้าหรือยัง
      const itemIndex = cart.items.findIndex((p) => p.productId == productId);
      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity;
      } else {
        cart.items.push({ productId, quantity });
      }
      await cart.save();
    } else {
      // ถ้าตะกร้ายังไม่มี ให้สร้างใหม่
      cart = await Cart.create({
        userId,
        items: [{ productId, quantity }],
      });
    }
    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};

// Get cart by user id
export const getCartByUserId = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart) {
      return res.status(200).json({
        success: true,
        data: {
          userId,
          items: [],
        },
      });
    }

    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

// ล้างตะกร้าของ User คนนั้นๆ
export const clearCart = async (req, res, next) => {
  try {
    const { userId } = req.params;
    await Cart.findOneAndDelete({ userId });
    res.status(200).json({ success: true, message: "Cart cleared" });
  } catch (error) {
    next(error);
  }
};
