import { Order } from "../orders/order.model.js";
import { User } from "../register/user.model.js";
import { Address } from "../address/address.model.js";
import { PaymentProof } from "../payment-proof/payment-proof.model.js";

const STATUS_LABELS = {
  pending: "รอชำระเงิน",
  paid: "ชำระเงินแล้ว",
  cancelled: "ยกเลิก",
};

const PAYMENT_PROOF_STATUS_LABELS = {
  submitted: "รอตรวจสอบ",
  approved: "สำเร็จแล้ว",
  rejected: "ตรวจสอบข้อมูลการโอนอีกครั้ง",
};

const getPaymentProofMap = async (orders) => {
  const orderIds = orders.map((order) => order._id);
  const proofs = await PaymentProof.find({
    orderId: { $in: orderIds },
  }).select(
    "orderId transferDate transferTime transferAmount proofImageBase64 status uploadedAt reviewedAt",
  );

  return new Map(proofs.map((proof) => [String(proof.orderId), proof]));
};

const getDisplayStatus = (orderStatus, paymentProof = null) => {
  if (orderStatus === "cancelled") {
    return {
      key: "cancelled",
      label: "ยกเลิก",
    };
  }

  if (orderStatus === "pending") {
    return {
      key: "pending",
      label: "รอชำระเงิน",
    };
  }

  if (orderStatus === "paid") {
    if (!paymentProof) {
      return {
        key: "awaiting-proof",
        label: "รอแนบสลิป",
      };
    }

    if (paymentProof.status === "submitted") {
      return {
        key: "awaiting-review",
        label: "รอตรวจสอบ",
      };
    }

    if (paymentProof.status === "approved") {
      return {
        key: "confirmed",
        label: "สำเร็จแล้ว",
      };
    }

    if (paymentProof.status === "rejected") {
      return {
        key: "awaiting-proof",
        label: "ตรวจสอบข้อมูลการโอนอีกครั้ง",
      };
    }
  }

  return {
    key: orderStatus,
    label: STATUS_LABELS[orderStatus] || orderStatus,
  };
};

const flattenOrderItems = (orders, paymentProofMap = new Map()) =>
  orders.flatMap((order) => {
    const paymentProof = paymentProofMap.get(String(order._id)) || null;
    const displayStatus = getDisplayStatus(order.status, paymentProof);

    return order.items.map((item, index) => ({
      id: `${order._id}-${item.productId}-${index}`,
      orderId: order._id,
      productId: item.productId?._id || item.productId,
      name: item.name,
      artist: item.productId?.artist || "-",
      images: item.productId?.images || [],
      image: item.productId?.images?.[0] || "",
      price: item.price,
      quantity: item.quantity,
      lineTotal: item.price * item.quantity,
      status: order.status,
      statusLabel: STATUS_LABELS[order.status] || order.status.toUpperCase(),
      displayStatus: displayStatus.key,
      displayStatusLabel: displayStatus.label,
      courier: order.courier || "",
      trackingNumber: order.trackingNumber || "",
      paymentProofStatus: paymentProof?.status || "none",
      paymentProofStatusLabel: paymentProof
        ? PAYMENT_PROOF_STATUS_LABELS[paymentProof.status] || paymentProof.status
        : "",
      transferDate: paymentProof?.transferDate || "",
      transferTime: paymentProof?.transferTime || "",
      transferAmount: paymentProof?.transferAmount || 0,
      proofImageBase64: paymentProof?.proofImageBase64 || "",
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
    const orders = await Order.find({ userId, status: "paid" }).select(
      "_id totalPrice status",
    );
    const paymentProofMap = await getPaymentProofMap(orders);
    const confirmedOrders = orders.filter((order) => {
      const paymentProof = paymentProofMap.get(String(order._id)) || null;
      return getDisplayStatus(order.status, paymentProof).key === "confirmed";
    });

    const totalSpend = confirmedOrders.reduce(
      (sum, order) => sum + order.totalPrice,
      0,
    );

    return res.status(200).json({
      success: true,
      data: {
        totalOrders: confirmedOrders.length,
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
    const orders = await Order.find({ userId, status: { $in: ["pending", "paid"] } })
      .sort({ createdAt: -1 })
      .select("items status courier trackingNumber createdAt")
      .populate("items.productId", "images artist");
    const paymentProofMap = await getPaymentProofMap(orders);
    const visibleOrders = flattenOrderItems(orders, paymentProofMap).filter(
      (order) => order.displayStatus !== "confirmed",
    );

    return res.status(200).json({
      success: true,
      data: visibleOrders,
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
    const confirmedOrders = flattenOrderItems(orders, paymentProofMap).filter(
      (order) => order.displayStatus === "confirmed",
    );

    return res.status(200).json({
      success: true,
      data: confirmedOrders,
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

    const paymentProofMap = await getPaymentProofMap(orders);
    const flattenedOrders = flattenOrderItems(orders, paymentProofMap);
    const confirmedOrders = orders.filter((order) => {
      const paymentProof = paymentProofMap.get(String(order._id)) || null;
      return getDisplayStatus(order.status, paymentProof).key === "confirmed";
    });

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalOrders: orders.length,
          totalSpend: confirmedOrders.reduce(
            (sum, order) => sum + order.totalPrice,
            0,
          ),
          completedOrders: confirmedOrders.length,
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
    const { proofImageBase64 } = req.body;

    const order = await Order.findOne({ _id: orderId, userId }).select(
      "_id userId status totalPrice",
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบคำสั่งซื้อที่ต้องการแจ้งการโอนเงิน",
      });
    }

    if (order.status !== "paid") {
      return res.status(400).json({
        success: false,
        message: "คำสั่งซื้อนี้ยังไม่อยู่ในสถานะที่กรอกหลักฐานการโอนเงินได้",
      });
    }

    if (
      typeof proofImageBase64 !== "string" ||
      !proofImageBase64.startsWith("data:image/")
    ) {
      return res.status(400).json({
        success: false,
        message: "กรุณาอัปโหลดรูปสลิปการโอนเงิน",
      });
    }

    if (proofImageBase64.length > 1500000) {
      return res.status(400).json({
        success: false,
        message: "รูปสลิปมีขนาดใหญ่เกินไป",
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
        transferDate: "",
        transferTime: "",
        transferAmount: 0,
        proofImageBase64: String(proofImageBase64).trim(),
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
      message: "ส่งรูปสลิปการโอนเงินเรียบร้อยแล้ว",
      data: {
        orderId: paymentProof.orderId,
        status: paymentProof.status,
        statusLabel: PAYMENT_PROOF_STATUS_LABELS[paymentProof.status],
        proofImageBase64: paymentProof.proofImageBase64,
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
