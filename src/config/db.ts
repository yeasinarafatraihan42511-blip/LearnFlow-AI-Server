import mongoose from 'mongoose';
import dns from "node:dns";
import { env } from './env.js';
dns.setServers(["1.1.1.1", "1.0.0.1"]);

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(env.MONGO_URI);
    console.log(`📡 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error:`, error);
    process.exit(1);
  }
};
