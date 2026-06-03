import { Order } from "../orders/order.model.js";
import { User } from "../register/user.model.js";
import { PaymentProof } from "../payment-proof/payment-proof.model.js";

const STATUS_LABELS = {
  pending: "รอดำเนินการ",
  paid: "ชำระเงินแล้ว",
  cancelled: "ยกเลิก",
};

const PAYMENT_PROOF_STATUS_LABELS = {
  none: "ยังไม่ส่งข้อมูลโอน",
  submitted: "รอ admin ตรวจ",
  approved: "confirmed",
  rejected: "ตรวจสอบข้อมูลการโอนอีกครั้ง",
};

const CATEGORY_COLORS = {
  "Visual Art": "#6366f1",
  "Craft & Handmade": "#8b5cf6",
  "Music & Sound": "#c4b5fd",
  Unknown: "#94a3b8",
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
      label: "รอดำเนินการ",
    };
  }

  if (orderStatus === "paid") {
    if (!paymentProof) {
      return {
        key: "awaiting-proof",
        label: "รอกรอกหลักฐาน",
      };
    }

    if (paymentProof.status === "submitted") {
      return {
        key: "awaiting-review",
        label: "รอ admin ตรวจ",
      };
    }

    if (paymentProof.status === "approved") {
      return {
        key: "confirmed",
        label: "confirmed ✅",
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

const getCustomerLookup = async (orders) => {
  const userIds = [
    ...new Set(orders.map((order) => order.userId).filter(Boolean)),
  ];
  const users = await User.find({ _id: { $in: userIds } }).select(
    "username email",
  );

  return new Map(
    users.map((user) => [String(user._id), user.username || user.email || "-"]),
  );
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

const flattenOrders = (orders, customerLookup, paymentProofMap = new Map()) =>
  orders.flatMap((order) => {
    const paymentProof = paymentProofMap.get(String(order._id)) || null;
    const displayStatus = getDisplayStatus(order.status, paymentProof);

    return order.items.map((item, index) => ({
      id: `${order._id}-${item.productId}-${index}`,
      orderId: order._id,
      productId: item.productId?._id || item.productId || null,
      name: item.name,
      artist: item.productId?.artist || "-",
      images: item.productId?.images || [],
      image: item.productId?.images?.[0] || "",
      quantity: item.quantity,
      price: item.price,
      amount: item.price * item.quantity,
      customer: customerLookup.get(String(order.userId)) || "-",
      status: order.status,
      statusLabel: STATUS_LABELS[order.status] || order.status,
      displayStatus: displayStatus.key,
      displayStatusLabel: displayStatus.label,
      courier: order.courier || "",
      trackingNumber: order.trackingNumber || "",
      paymentProofStatus: paymentProof?.status || "none",
      paymentProofStatusLabel:
        PAYMENT_PROOF_STATUS_LABELS[paymentProof?.status || "none"],
      transferDate: paymentProof?.transferDate || "",
      transferTime: paymentProof?.transferTime || "",
      transferAmount: paymentProof?.transferAmount || 0,
      proofImageBase64: paymentProof?.proofImageBase64 || "",
      createdAt: order.createdAt,
      date: order.createdAt,
    }));
  });

const getMetricsFromPaidOrders = (paidOrders) => {
  const totalSales = paidOrders.reduce(
    (sum, order) => sum + order.totalPrice,
    0,
  );
  const itemSold = paidOrders.reduce(
    (sum, order) =>
      sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0,
  );
  const orderCount = paidOrders.length;

  return {
    totalSales,
    orderCount,
    itemSold,
    averageOrderValue: orderCount > 0 ? totalSales / orderCount : 0,
  };
};

const getSalesOverview = (paidOrders, paymentProofMap = new Map()) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));

    return {
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
      fullDate: date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      sales: 0,
    };
  });

  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  paidOrders.forEach((order) => {
    const paymentProof = paymentProofMap.get(String(order._id)) || null;
    const effectiveDate =
      order.paidAt || paymentProof?.reviewedAt || order.createdAt;
    const bucketKey = new Date(effectiveDate).toISOString().slice(0, 10);
    const bucket = bucketMap.get(bucketKey);

    if (bucket) {
      bucket.sales += order.totalPrice;
    }
  });

  return buckets.map(({ label, fullDate, sales }) => ({
    label,
    fullDate,
    sales,
  }));
};

const getCategoryBreakdown = (paidOrders) => {
  const categoryTotals = new Map();

  paidOrders.forEach((order) => {
    order.items.forEach((item) => {
      const category = item.productId?.category || "Unknown";
      const currentTotal = categoryTotals.get(category) || 0;
      categoryTotals.set(category, currentTotal + item.quantity);
    });
  });

  return Array.from(categoryTotals.entries()).map(([label, value]) => ({
    label,
    value,
    sold: `${value} ชิ้น`,
    color: CATEGORY_COLORS[label] || "#94a3b8",
  }));
};

const loadOrdersWithProducts = () =>
  Order.find({})
    .sort({ createdAt: -1 })
    .populate("items.productId", "images artist category");

export const getAdminOverview = async (req, res, next) => {
  try {
    const orders = await loadOrdersWithProducts();
    const paidOrders = orders.filter((order) => order.status === "paid");
    const customerLookup = await getCustomerLookup(orders);
    const paymentProofMap = await getPaymentProofMap(orders);
    const flattenedOrders = flattenOrders(
      orders,
      customerLookup,
      paymentProofMap,
    );
    const metrics = getMetricsFromPaidOrders(paidOrders);

    return res.status(200).json({
      success: true,
      data: {
        ...metrics,
        salesOverview: getSalesOverview(paidOrders, paymentProofMap),
        categoryBreakdown: getCategoryBreakdown(paidOrders),
        recentOrders: flattenedOrders.slice(0, 6),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminOrders = async (req, res, next) => {
  try {
    const orders = await loadOrdersWithProducts();
    const customerLookup = await getCustomerLookup(orders);
    const paymentProofMap = await getPaymentProofMap(orders);
    const flattenedOrders = flattenOrders(
      orders,
      customerLookup,
      paymentProofMap,
    );

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          allOrders: orders.length,
          pendingCount: orders.filter((order) => order.status === "pending")
            .length,
          paidCount: orders.filter((order) => order.status === "paid").length,
          cancelledCount: orders.filter((order) => order.status === "cancelled")
            .length,
        },
        orders: flattenedOrders,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminSales = async (req, res, next) => {
  try {
    const orders = await loadOrdersWithProducts();
    const paidOrders = orders.filter((order) => order.status === "paid");
    const paymentProofMap = await getPaymentProofMap(orders);
    const metrics = getMetricsFromPaidOrders(paidOrders);

    return res.status(200).json({
      success: true,
      data: {
        ...metrics,
        salesOverview: getSalesOverview(paidOrders, paymentProofMap),
        categoryBreakdown: getCategoryBreakdown(paidOrders),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrderShipping = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { courier, trackingNumber } = req.body;

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        courier: String(courier || "").trim(),
        trackingNumber: String(trackingNumber || "").trim(),
      },
      {
        new: true,
      },
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Shipping details updated successfully",
      data: {
        orderId: order._id,
        courier: order.courier,
        trackingNumber: order.trackingNumber,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const reviewPaymentProof = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { action } = req.body;

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review action",
      });
    }

    const paymentProof = await PaymentProof.findOne({ orderId });

    if (!paymentProof) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบข้อมูลการแจ้งโอนของคำสั่งซื้อนี้",
      });
    }

    if (action === "approve") {
      paymentProof.status = "approved";
      paymentProof.reviewedAt = new Date();
    }

    if (action === "reject") {
      paymentProof.status = "rejected";
      paymentProof.reviewedAt = new Date();
    }

    await paymentProof.save();

    return res.status(200).json({
      success: true,
      message:
        action === "approve"
          ? "อนุมัติข้อมูลการโอนเรียบร้อยแล้ว"
          : "ตีกลับข้อมูลการโอนเรียบร้อยแล้ว",
      data: {
        orderId: paymentProof.orderId,
        status: paymentProof.status,
        statusLabel: PAYMENT_PROOF_STATUS_LABELS[paymentProof.status],
      },
    });
  } catch (error) {
    next(error);
  }
};
