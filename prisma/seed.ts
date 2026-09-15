import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const permission = await db.permission.upsert({ where: { key: "dashboard:read" }, update: {}, create: { key: "dashboard:read" } });
    for (const name of ["SUPER_ADMIN", "ADMIN"] as const) {
      const role = await db.role.upsert({ where: { name }, update: {}, create: { name } });
      await db.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } }, update: {}, create: { roleId: role.id, permissionId: permission.id } });
    }
    console.log("SUPER_ADMIN and ADMIN roles are ready. No client content or users were seeded.");
  } finally { await db.$disconnect(); }
}
main().catch(() => { console.error("Seed failed. Check the database configuration."); process.exitCode = 1; });
