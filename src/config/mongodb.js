import mongoose from "mongoose";

export const connectDB = async () => {
  // สั่งเชื่อมต่อโดยดึงรหัสจากไฟล์ .env
  const uri = process.env.MONGODB_URI;

  try {
    await mongoose.connect(uri, {
      dbName: "creative_market_db",
    });
    console.log(`"MongoDB connected ❤️`);
  } catch (error) {
    // ถ้าต่อไม่ติด ให้ปริ้นท์ Error สีแดง แล้วสั่งปิดการทำงานของ Server (Exit)
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};
