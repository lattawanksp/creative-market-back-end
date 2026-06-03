import mongoose from "mongoose";

const paymentProofSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    transferDate: { type: String, default: "", trim: true },
    transferTime: { type: String, default: "", trim: true },
    transferAmount: { type: Number, default: 0, min: 0 },
    proofImageBase64: { type: String, default: "" },
    status: {
      type: String,
      enum: ["submitted", "approved", "rejected"],
      default: "submitted",
    },
    uploadedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const PaymentProof = mongoose.model("PaymentProof", paymentProofSchema);
