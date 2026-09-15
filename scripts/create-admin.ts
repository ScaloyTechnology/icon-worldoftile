import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { bootstrapSchema } from "../src/server/auth/policy";
import { hashPassword } from "../src/server/auth/crypto";
async function main() {
  const input = bootstrapSchema.parse({
    name: process.env.ADMIN_BOOTSTRAP_NAME,
    email: process.env.ADMIN_BOOTSTRAP_EMAIL,
    password: process.env.ADMIN_BOOTSTRAP_PASSWORD,
    role: process.env.ADMIN_BOOTSTRAP_ROLE || "SUPER_ADMIN",
  });
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const existing = await db.adminUser.findUnique({ where: { email: input.email }, select: { id: true } });
    if (existing) throw new Error("An administrator with this email already exists");
    const role = await db.role.upsert({ where: { name: input.role }, update: {}, create: { name: input.role } });
    await db.adminUser.create({ data: { email: input.email, passwordHash: await hashPassword(input.password), name: input.name, roleId: role.id } });
    console.log("Administrator created. Remove bootstrap credentials from the environment now.");
  } finally { await db.$disconnect(); }
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Administrator not created."); process.exitCode = 1; });
