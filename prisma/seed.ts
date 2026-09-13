import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const role = await db.role.upsert({ where: { name: "Administrator" }, update: {}, create: { name: "Administrator" } });
    const permission = await db.permission.upsert({ where: { key: "dashboard:read" }, update: {}, create: { key: "dashboard:read" } });
    await db.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } }, update: {}, create: { roleId: role.id, permissionId: permission.id } });
    console.log("System role and dashboard permission ready. No client data or users seeded.");
  } finally { await db.$disconnect(); }
}
main().catch(() => { console.error("Seed failed. Check the database configuration."); process.exitCode = 1; });
