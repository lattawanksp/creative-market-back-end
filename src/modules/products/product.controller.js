import { Product } from "./product.model.js";

// 1. ดึงข้อมูลสินค้า
export const getProducts = async (req, res, next) => {
  try {
    const { featured } = req.query;

    let query = {};
    if (featured === "true") {
      query = { isFeatured: true };
    }

    const products = await Product.find(query);
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

// 2. สร้างสินค้าใหม่
export const createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// 3. อัปเดตข้อมูลสินค้า
export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedProduct = await Product.findByIdAndUpdate(id, req.body, {
      returnDocument: "after",
    });

    if (!updatedProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    res.status(200).json({ success: true, data: updatedProduct });
  } catch (error) {
    next(error);
  }
};

// 4. ลบสินค้า
export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    next(error);
  }
};
