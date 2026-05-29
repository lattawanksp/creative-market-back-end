export const fakeUserDashboard = {
  profile: {
    id: "user_001",
    displayName: "Luna Atelier",
    username: "lunaatelier",
    role: "buyer",
    roleLabel: "Customer",
    avatarUrl: "https://example.com/avatar.jpg",
  },
  stats: {
    totalOrders: 18,
    totalSpend: 18620,
  },
  orderStatusPreview: [
    {
      id: "order_001",
      orderNo: "CM-20191",
      product: "Golden Bloom Poster",
      image: "https://example.com/product.jpg",
      status: "COMPLETED",
      price: 1250,
    },
    {
      id: "order_002",
      orderNo: "CM-20192",
      product: "Clay Moon Vase",
      image: "https://example.com/product-2.jpg",
      status: "RECEIVABLE",
      price: 2450,
    },
    {
      id: "order_003",
      orderNo: "CM-20193",
      product: "Soft Morning Playlist",
      image: "https://example.com/product-3.jpg",
      status: "PAYABLE",
      price: 890,
    },
  ],
  orderHistoryPreview: [
    {
      id: "order_004",
      orderNo: "CM-20194",
      product: "Quiet Fields Print Set",
      image: "https://example.com/product-4.jpg",
      price: 1880,
    },
    {
      id: "order_005",
      orderNo: "CM-20195",
      product: "Handwoven Coaster Set",
      image: "https://example.com/product-5.jpg",
      price: 980,
    },
    {
      id: "order_006",
      orderNo: "CM-20196",
      product: "Ambient Rain Pack",
      image: "https://example.com/product-6.jpg",
      price: 720,
    },
  ],
};
