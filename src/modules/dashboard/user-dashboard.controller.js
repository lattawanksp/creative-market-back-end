import { Order } from "../orders/order.model.js";
import { User } from "../register/user.model.js";
import { Address } from "../address/address.model.js";
import { PaymentProof } from "../payment-proof/payment-proof.model.js";

const STATUS_LABELS = {
  pending: "รอดำเนินการ",
  paid: "สำเร็จแล้ว",
  cancelled: "ยกเลิก",
};

const PAYMENT_PROOF_STATUS_LABELS = {
  submitted: "รอตรวจสอบ",
  approved: "อนุมัติแล้ว",
  rejected: "ข้อมูลการโอนไม่ผ่าน",
};

const getPaymentProofMap = async (orders) => {
  const orderIds = orders.map((order) => order._id);
  const proofs = await PaymentProof.find({
    orderId: { $in: orderIds },
  }).select(
    "orderId transferDate transferTime transferAmount status uploadedAt reviewedAt",
  );

  return new Map(proofs.map((proof) => [String(proof.orderId), proof]));
};

const flattenOrderItems = (orders, paymentProofMap = new Map()) =>
  orders.flatMap((order) => {
    const paymentProof = paymentProofMap.get(String(order._id)) || null;

    return order.items.map((item, index) => ({
      id: `${order._id}-${item.productId}-${index}`,
      orderId: order._id,
      productId: item.productId?._id || item.productId,
      name: item.name,
      artist: item.productId?.artist || "-",
      image: item.productId?.images?.[0] || "",
      price: item.price,
      quantity: item.quantity,
      lineTotal: item.price * item.quantity,
      status: order.status,
      statusLabel: STATUS_LABELS[order.status] || order.status.toUpperCase(),
      courier: order.courier || "",
      trackingNumber: order.trackingNumber || "",
      paymentProofStatus: paymentProof?.status || "none",
      paymentProofStatusLabel: paymentProof
        ? PAYMENT_PROOF_STATUS_LABELS[paymentProof.status] || paymentProof.status
        : "",
      transferDate: paymentProof?.transferDate || "",
      transferTime: paymentProof?.transferTime || "",
      transferAmount: paymentProof?.transferAmount || 0,
      createdAt: order.createdAt,
    }));
  });

export const getDashboardMe = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId).select("username email role");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        username: user.username || user.email?.split("@")[0] || "Customer",
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMySummary = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const paidOrders = await Order.find({ userId, status: "paid" }).select(
      "totalPrice",
    );

    const totalSpend = paidOrders.reduce(
      (sum, order) => sum + order.totalPrice,
      0,
    );

    return res.status(200).json({
      success: true,
      data: {
        totalOrders: paidOrders.length,
        totalSpend,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyStatus = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const orders = await Order.find({ userId, status: "pending" })
      .sort({ createdAt: -1 })
      .select("items status courier trackingNumber createdAt")
      .populate("items.productId", "images artist");
    const paymentProofMap = await getPaymentProofMap(orders);

    return res.status(200).json({
      success: true,
      data: flattenOrderItems(orders, paymentProofMap),
    });
  } catch (error) {
    next(error);
  }
};

export const getMyHistory = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const orders = await Order.find({ userId, status: "paid" })
      .sort({ createdAt: -1 })
      .select("items status courier trackingNumber createdAt")
      .populate("items.productId", "images artist");
    const paymentProofMap = await getPaymentProofMap(orders);

    return res.status(200).json({
      success: true,
      data: flattenOrderItems(orders, paymentProofMap),
    });
  } catch (error) {
    next(error);
  }
};

export const getMyOrders = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const orders = await Order.find({ userId })
      .sort({ createdAt: -1 })
      .select("items totalPrice status courier trackingNumber createdAt")
      .populate("items.productId", "images artist");

    const paidOrders = orders.filter((order) => order.status === "paid");
    const paymentProofMap = await getPaymentProofMap(orders);
    const flattenedOrders = flattenOrderItems(orders, paymentProofMap);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalOrders: orders.length,
          totalSpend: paidOrders.reduce(
            (sum, order) => sum + order.totalPrice,
            0,
          ),
          completedOrders: paidOrders.length,
        },
        orders: flattenedOrders,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const submitMyPaymentProof = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const { orderId } = req.params;
    const { transferDate, transferTime, transferAmount } = req.body;

    const order = await Order.findOne({ _id: orderId, userId }).select(
      "_id userId status totalPrice",
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบคำสั่งซื้อที่ต้องการแจ้งการโอนเงิน",
      });
    }

    if (order.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "คำสั่งซื้อนี้ไม่สามารถแจ้งการโอนเงินได้แล้ว",
      });
    }

    const requiredFields = {
      transferDate,
      transferTime,
      transferAmount,
    };

    const missingField = Object.entries(requiredFields).find(
      ([, value]) => String(value || "").trim() === "",
    );

    if (missingField) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกข้อมูลวันโอน เวลาโอน และยอดเงินให้ครบถ้วน",
      });
    }

    const parsedAmount = Number(transferAmount);

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "ยอดเงินที่โอนต้องเป็นตัวเลขมากกว่า 0",
      });
    }

    const existingProof = await PaymentProof.findOne({ orderId: order._id });

    if (existingProof && existingProof.status === "submitted") {
      return res.status(400).json({
        success: false,
        message: "คำสั่งซื้อนี้มีข้อมูลแจ้งโอนรอตรวจสอบอยู่แล้ว",
      });
    }

    const paymentProof = await PaymentProof.findOneAndUpdate(
      { orderId: order._id },
      {
        orderId: order._id,
        userId,
        transferDate: String(transferDate).trim(),
        transferTime: String(transferTime).trim(),
        transferAmount: parsedAmount,
        status: "submitted",
        uploadedAt: new Date(),
        reviewedAt: null,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    return res.status(200).json({
      success: true,
      message: "ส่งข้อมูลการโอนเงินเรียบร้อยแล้ว",
      data: {
        orderId: paymentProof.orderId,
        status: paymentProof.status,
        statusLabel: PAYMENT_PROOF_STATUS_LABELS[paymentProof.status],
        transferDate: paymentProof.transferDate,
        transferTime: paymentProof.transferTime,
        transferAmount: paymentProof.transferAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyAddress = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const addressDocument = await Address.findOne({ userId }).select("address");

    return res.status(200).json({
      success: true,
      data: addressDocument ? addressDocument.address : null,
    });
  } catch (error) {
    next(error);
  }
};

export const upsertMyAddress = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const { recipientName, phone, street, district, province, postcode } =
      req.body;

    const requiredFields = {
      recipientName,
      phone,
      street,
      province,
      postcode,
    };

    const missingField = Object.entries(requiredFields).find(
      ([, value]) => !String(value || "").trim(),
    );

    if (missingField) {
      return res.status(400).json({
        success: false,
        message: `${missingField[0]} is required`,
      });
    }

    const address = {
      recipientName: recipientName.trim(),
      phone: phone.trim(),
      street: street.trim(),
      district: String(district || "").trim(),
      province: province.trim(),
      postcode: postcode.trim(),
    };

    const addressDocument = await Address.findOneAndUpdate(
      { userId },
      { userId, address },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    ).select("address");

    return res.status(200).json({
      success: true,
      message: "Address saved successfully",
      data: addressDocument.address,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMyAddress = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    await Address.findOneAndDelete({ userId });

    return res.status(200).json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};