import mongoose from "mongoose";

export async function connectToDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not set in environment variables");
  }

  mongoose.connection.on("connected", () => {
    console.info("MongoDB connection established.");
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB connection disconnected.");
  });

  mongoose.connection.on("error", (error) => {
    console.error("MongoDB connection error", error);
  });

  await mongoose.connect(mongoUri);
}

export async function disconnectFromDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}