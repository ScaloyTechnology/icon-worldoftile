import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import path from "node:path";
const root = process.cwd();
const local = path.join(root, ".local");
const data = path.join(local, "postgres");
const bin = process.env.POSTGRES_BIN ?? "C:/Program Files/PostgreSQL/18/bin";
await mkdir(local, { recursive: true });
const exists = async p => access(p).then(() => true, () => false);
const run = (name, args, env = process.env) => {
  const result = spawnSync(path.join(bin, `${name}.exe`), args, { windowsHide: true, encoding: "utf8", env, timeout: 60000, ...(name === "pg_ctl" ? { stdio: "ignore" } : {}) });
  if (result.status !== 0) throw new Error(`${name} failed: ${result.stderr ?? result.error?.message}`);
  return result.stdout;
};
let secret;
const secretFile = path.join(local, "postgres-password");
if (await exists(secretFile)) secret = (await readFile(secretFile, "utf8")).trim();
else { secret = randomBytes(32).toString("hex"); await writeFile(secretFile, secret, { flag: "wx" }); }
if (!await exists(path.join(data, "PG_VERSION"))) run("initdb", ["-D", data, "-U", "icon_local", "--pwfile", secretFile, "--auth=scram-sha-256", "--encoding=UTF8"]);
const status = spawnSync(path.join(bin, "pg_ctl.exe"), ["-D", data, "status"], { windowsHide: true, encoding: "utf8" });
if (status.status !== 0) run("pg_ctl", ["-D", data, "-l", path.join(local, "postgres.log"), "-o", "-p 55439 -h 127.0.0.1", "-w", "start"]);
const env = { ...process.env, PGPASSWORD: secret };
const databases = run("psql", ["-h", "127.0.0.1", "-p", "55439", "-U", "icon_local", "-d", "postgres", "-tAc", "SELECT datname FROM pg_database WHERE datname = 'icon_development'"], env);
if (!databases.includes("icon_development")) run("createdb", ["-h", "127.0.0.1", "-p", "55439", "-U", "icon_local", "icon_development"], env);
if (!await exists(path.join(root, ".env"))) await writeFile(path.join(root, ".env"), `DATABASE_URL=postgresql://icon_local:${secret}@127.0.0.1:55439/icon_development?schema=public\nSITE_URL=http://127.0.0.1:3000\nSITE_INDEXABLE=false\nMEDIA_BASE_URL=\nEMAIL_PROVIDER=disabled\nEMAIL_FROM=\nEMAIL_API_KEY=\nADMIN_BOOTSTRAP_EMAIL=\nADMIN_BOOTSTRAP_PASSWORD=\n`, { flag: "wx" });
console.log("Isolated local PostgreSQL ready on 127.0.0.1:55439. Credentials remain in ignored local files.");
