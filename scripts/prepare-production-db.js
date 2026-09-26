"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { Client } = require("pg");

const projectRoot = path.resolve(__dirname, "..");
const schemaPath = path.join(projectRoot, "prisma", "schema.prisma");
const migrationsPath = path.join(projectRoot, "prisma", "migrations");
const seedPath = path.join(projectRoot, "prisma", "seed.ts");
const prismaConfigPath = path.join(projectRoot, "prisma.config.ts");

let activeClient = null;
let activeChild = null;
let shuttingDown = false;

function fail(message) {
  throw new Error(message);
}

function readUtf8(filePath, label) {
  if (!fs.existsSync(filePath)) fail(`${label} was not found at ${path.relative(projectRoot, filePath)}.`);
  return fs.readFileSync(filePath, "utf8");
}

function databaseTarget(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    fail("DATABASE_URL is not a valid PostgreSQL connection URL.");
  }

  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    fail("DATABASE_URL must use the postgres:// or postgresql:// protocol.");
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!parsed.hostname || !database) fail("DATABASE_URL must include a database host and database name.");

  return {
    host: parsed.hostname,
    port: parsed.port || "5432",
    database,
    schema: parsed.searchParams.get("schema") || "public",
  };
}

function prismaModels(schemaSource) {
  const tables = [];
  const modelPattern = /^model\s+([A-Za-z][A-Za-z0-9_]*)\s*\{([\s\S]*?)^\}/gm;
  for (const match of schemaSource.matchAll(modelPattern)) {
    const mappedTable = match[2].match(/@@map\(\s*"([^"]+)"\s*\)/);
    tables.push(mappedTable ? mappedTable[1] : match[1]);
  }
  if (tables.length === 0) fail("No Prisma models were found in prisma/schema.prisma.");
  return tables;
}

function migrationDirectories() {
  if (!fs.existsSync(migrationsPath) || !fs.statSync(migrationsPath).isDirectory()) {
    fail("prisma/migrations is missing. Production preparation will not fall back to prisma db push.");
  }

  const directories = fs.readdirSync(migrationsPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  if (directories.length === 0) fail("No Prisma migrations were found. Create and review migrations before preparing production.");

  const incomplete = directories.filter((directory) => !fs.existsSync(path.join(migrationsPath, directory, "migration.sql")));
  if (incomplete.length > 0) fail(`Migration directories without migration.sql: ${incomplete.join(", ")}.`);
  return directories;
}

function localPrismaCli() {
  const cliPath = path.join(projectRoot, "node_modules", "prisma", "build", "index.js");
  if (!fs.existsSync(cliPath)) {
    fail("The local Prisma CLI is not installed. Install the project's dependencies before running this script.");
  }
  return cliPath;
}

function runPrisma(args, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [localPrismaCli(), ...args], {
      cwd: projectRoot,
      env: process.env,
      stdio: "inherit",
    });
    activeChild = child;

    child.once("error", (error) => {
      activeChild = null;
      reject(new Error(`${label} could not start: ${error.message}`));
    });
    child.once("exit", (code, signal) => {
      activeChild = null;
      if (signal) reject(new Error(`${label} was interrupted by ${signal}.`));
      else if (code !== 0) reject(new Error(`${label} failed with exit code ${code}.`));
      else resolve();
    });
  });
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

async function connect(databaseUrl) {
  const client = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 10_000,
    application_name: "icon-production-db-prepare",
  });
  activeClient = client;
  await client.connect();
  return client;
}

async function disconnect(client) {
  if (!client) return;
  if (activeClient === client) activeClient = null;
  await client.end().catch(() => undefined);
}

function sanitizeError(error, databaseUrl) {
  let message = error instanceof Error ? error.message : String(error);
  if (databaseUrl) message = message.split(databaseUrl).join("[redacted DATABASE_URL]");
  return message.replace(/postgres(?:ql)?:\/\/[^\s'"`]+/gi, "[redacted DATABASE_URL]");
}

async function verifyDatabase(databaseUrl, target, migrationNames, requiredTables) {
  const client = await connect(databaseUrl);
  const qualifiedSchema = quoteIdentifier(target.schema);
  try {
    const tableResult = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE'",
      [target.schema],
    );
    const existingTables = new Set(tableResult.rows.map((row) => row.table_name));
    const expectedTables = [...requiredTables, "_prisma_migrations"];
    const missingTables = expectedTables.filter((table) => !existingTables.has(table));
    if (missingTables.length > 0) fail(`Required database tables are missing: ${missingTables.join(", ")}.`);

    const migrationResult = await client.query(
      `SELECT migration_name FROM ${qualifiedSchema}."_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
    );
    const appliedMigrations = new Set(migrationResult.rows.map((row) => row.migration_name));
    const missingMigrations = migrationNames.filter((name) => !appliedMigrations.has(name));
    if (missingMigrations.length > 0) fail(`Committed migrations are not fully applied: ${missingMigrations.join(", ")}.`);

    const referenceResult = await client.query(`
      SELECT
        (SELECT COUNT(*)::int FROM ${qualifiedSchema}."Role" WHERE name IN ('SUPER_ADMIN', 'ADMIN')) AS role_count,
        (SELECT COUNT(*)::int FROM ${qualifiedSchema}."Permission" WHERE key = 'dashboard:read') AS permission_count,
        (
          SELECT COUNT(DISTINCT rp."roleId")::int
          FROM ${qualifiedSchema}."RolePermission" rp
          JOIN ${qualifiedSchema}."Role" r ON r.id = rp."roleId"
          JOIN ${qualifiedSchema}."Permission" p ON p.id = rp."permissionId"
          WHERE r.name IN ('SUPER_ADMIN', 'ADMIN') AND p.key = 'dashboard:read'
        ) AS assignment_count
    `);
    const reference = referenceResult.rows[0];
    if (reference.role_count !== 2 || reference.permission_count !== 1 || reference.assignment_count !== 2) {
      fail("Required authorization reference data is incomplete after seeding.");
    }

    const businessTables = ["Product", "Collection", "MediaAsset", "Project", "Catalogue", "Enquiry", "AdminUser"];
    const businessCounts = {};
    for (const table of businessTables) {
      const result = await client.query(`SELECT COUNT(*)::int AS count FROM ${qualifiedSchema}.${quoteIdentifier(table)}`);
      businessCounts[table] = result.rows[0].count;
    }

    return { appliedMigrationCount: appliedMigrations.size, businessCounts };
  } finally {
    await disconnect(client);
  }
}

async function handleSignal(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.error(`\nDatabase preparation interrupted by ${signal}.`);
  if (activeChild) activeChild.kill(signal);
  await disconnect(activeClient);
  process.exit(130);
}

process.once("SIGINT", () => { void handleSignal("SIGINT"); });
process.once("SIGTERM", () => { void handleSignal("SIGTERM"); });

async function main() {
  console.log("[1/6] Checking environment...");
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) fail("DATABASE_URL is required in the server environment.");
  if (process.env.ALLOW_PRODUCTION_DB_RESET === "true" || process.env.CONFIRM_DB_RESET === "YES") {
    fail("Destructive reset mode is intentionally unsupported. This script only deploys additive, committed migrations.");
  }
  const target = databaseTarget(databaseUrl);
  console.log("Safety mode: non-destructive migration deployment only.");
  console.log(`Database host: ${target.host}`);
  console.log(`Database port: ${target.port}`);
  console.log(`Database name: ${target.database}`);
  console.log(`Database schema: ${target.schema}`);

  console.log("[2/6] Checking database connection...");
  const connection = await connect(databaseUrl);
  try {
    const result = await connection.query("SELECT current_database() AS database_name");
    if (result.rows[0]?.database_name !== target.database) fail("Connected database does not match the database named in DATABASE_URL.");
    console.log("Database connection: OK");
  } finally {
    await disconnect(connection);
  }

  console.log("[3/6] Checking Prisma migrations...");
  const schemaSource = readUtf8(schemaPath, "Prisma schema");
  const requiredTables = prismaModels(schemaSource);
  const migrations = migrationDirectories();
  const prismaConfig = readUtf8(prismaConfigPath, "Prisma configuration");
  if (!fs.existsSync(seedPath) || !prismaConfig.includes("prisma/seed.ts")) {
    fail("The configured idempotent Prisma seed could not be found. Production preparation stopped safely.");
  }
  localPrismaCli();
  console.log(`Prisma schema: OK (${requiredTables.length} models)`);
  console.log(`Prisma migrations: OK (${migrations.length} committed migrations; latest: ${migrations.at(-1)})`);
  console.log("Seed strategy: existing prisma/seed.ts (authorization reference data only).");

  console.log("[4/6] Preparing database schema...");
  console.log("Running Prisma migrate deploy. Existing tables and business records will not be reset or truncated.");
  await runPrisma(["migrate", "deploy"], "Prisma migrate deploy");

  console.log("[5/6] Running required seed/reference data...");
  console.log("Running the existing idempotent Prisma seed. No products, collections, projects, media, enquiries, or users are seeded.");
  await runPrisma(["db", "seed"], "Prisma database seed");

  console.log("[6/6] Verifying prepared database...");
  const verification = await verifyDatabase(databaseUrl, target, migrations, requiredTables);
  console.log(`Migrations: Applied (${verification.appliedMigrationCount} successful migration records)`);
  console.log("Required tables: OK");
  console.log("Reference data: OK");
  console.log(`Existing business data (unchanged): ${Object.entries(verification.businessCounts).map(([name, count]) => `${name}=${count}`).join(", ")}`);
  console.log("Production database preparation: COMPLETE");
}

main().catch(async (error) => {
  await disconnect(activeClient);
  console.error(`Production database preparation failed: ${sanitizeError(error, process.env.DATABASE_URL)}`);
  process.exitCode = 1;
});
