import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { bootstrapSchema } from "../src/server/auth/policy";
import { hashPassword } from "../src/server/auth/crypto";
async function main() {
  const input = bootstrapSchema.parse({ email: process.env.ADMIN_BOOTSTRAP_EMAIL, password: process.env.ADMIN_BOOTSTRAP_PASSWORD });
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const role = await db.role.findUniqueOrThrow({ where: { name: "Administrator" } });
    await db.adminUser.create({ data: { email: input.email, passwordHash: await hashPassword(input.password), name: "Administrator", roleId: role.id } });
    console.log("Administrator created. Remove bootstrap credentials from the environment now.");
  } finally { await db.$disconnect(); }
}
main().catch(() => { console.error("Administrator not created. Check bootstrap values, run the system seed, and confirm the email does not already exist."); process.exitCode = 1; });
