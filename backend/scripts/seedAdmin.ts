import "dotenv/config";
import bcrypt from "bcrypt";
import { connectToDatabase, disconnectFromDatabase } from "../src/config/database.js";
import { User } from "../src/models/user.model.js";

const ADMIN_EMAIL = "admin@sportsstore.com";
const DEFAULT_ADMIN_PASSWORD = "SportStore_Admin#2026";

function getAdminPassword(): string {
  const password = process.env.ADMIN_SEED_PASSWORD?.trim();

  if (password && password.length >= 8) {
    return password;
  }

  console.warn(
    "ADMIN_SEED_PASSWORD is missing or too short. Falling back to default seed password; rotate immediately.",
  );

  return DEFAULT_ADMIN_PASSWORD;
}

function getSaltRounds(): number {
  const parsed = Number.parseInt(process.env.BCRYPT_SALT_ROUNDS ?? "12", 10);
  return Number.isFinite(parsed) && parsed >= 8 ? parsed : 12;
}

async function seedAdmin(): Promise<void> {
  await connectToDatabase();

  const normalizedEmail = ADMIN_EMAIL.toLowerCase();
  const existingAdmin = await User.findOne({ email: normalizedEmail }).lean().exec();

  if (existingAdmin) {
    console.info(`Admin user already exists for ${normalizedEmail}.`);
    return;
  }

  const password = getAdminPassword();
  const passwordHash = await bcrypt.hash(password, getSaltRounds());

  await User.collection.insertOne({
    email: normalizedEmail,
    password: passwordHash,
    role: "admin",
    pastOrderIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.info(`Admin user created successfully for ${normalizedEmail}.`);
}

seedAdmin()
  .then(async () => {
    await disconnectFromDatabase();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Failed to seed admin user", error);

    try {
      await disconnectFromDatabase();
    } catch (disconnectError) {
      console.error("Failed to disconnect after seed failure", disconnectError);
    }

    process.exit(1);
  });
