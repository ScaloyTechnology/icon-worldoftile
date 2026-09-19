# ICON admin backend setup

The ICON admin uses this path:

`Admin UI → Next.js server/API → Prisma ORM → PostgreSQL`

pgAdmin is used to create, inspect and manage PostgreSQL. The website does not connect to pgAdmin.

## 1. Requirements

- Node.js 22.12 or newer
- PostgreSQL running as a normal local Windows service
- pgAdmin connected to that PostgreSQL server
- Project directory: `D:\scaloy\icon-worldoftile`

The expected local database name is `icon_world_of_tile`.

## 2. Create the database in pgAdmin

If you are connecting this code to an existing database, take a backup first and
inspect its `_prisma_migrations` table before deploying migrations. Do not reset
an existing production database to resolve a migration mismatch.

1. Open pgAdmin.
2. Expand **Servers** and connect to the local PostgreSQL server.
3. Right-click **Databases**.
4. Select **Create → Database**.
5. Enter `icon_world_of_tile` as the database name.
6. Select the PostgreSQL login role used by the website as the owner. For a default local installation this is commonly `postgres`.
7. Click **Save**.

Alternatively, open **Query Tool** while connected to the `postgres` maintenance database and run:

```sql
CREATE DATABASE icon_world_of_tile
WITH OWNER = postgres
ENCODING = 'UTF8'
TEMPLATE = template0;
```

Do not run that statement if the database already exists. Do not use `prisma migrate reset` and do not drop an existing database.

## 3. Configure the website environment

From PowerShell in the project directory, create the local environment file if it does not already exist:

```powershell
if (-not (Test-Path -LiteralPath '.env')) { Copy-Item -LiteralPath '.env.example' -Destination '.env' }
```

Edit `.env` and set these values:

```dotenv
DATABASE_URL="postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/icon_world_of_tile?schema=public"
SITE_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
ADMIN_SESSION_SECRET="YOUR_LONG_RANDOM_SECRET"
ADMIN_BOOTSTRAP_NAME="Your Name"
ADMIN_BOOTSTRAP_EMAIL="your-admin-email@example.com"
ADMIN_BOOTSTRAP_PASSWORD="use-a-unique-password-of-at-least-14-characters"
ADMIN_BOOTSTRAP_ROLE="SUPER_ADMIN"
```

If the PostgreSQL password contains characters such as `@`, `:`, `/`, `#` or `%`, URL-encode the password before placing it in `DATABASE_URL`.

Generate a strong local session secret with this command and paste its output into `ADMIN_SESSION_SECRET`:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Never commit `.env` or real credentials.

## 4. Install and prepare Prisma

Run these commands manually from `D:\scaloy\icon-worldoftile`, in this order:

```powershell
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run admin:create
```

What they do:

1. `npm install` installs the declared packages, including `bcryptjs`, and updates the lockfile.
2. `npx prisma generate` creates the Prisma client from `prisma/schema.prisma`.
3. `npx prisma migrate deploy` applies the checked-in migrations without resetting data.
4. `npx prisma db seed` ensures the `SUPER_ADMIN` and `ADMIN` roles exist.
5. `npm run admin:create` hashes the bootstrap password and creates the first administrator.

After `admin:create` succeeds, remove `ADMIN_BOOTSTRAP_NAME`, `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD` from `.env`. They are not needed for normal sign-in. Keep `DATABASE_URL`, `SITE_URL` and `ADMIN_SESSION_SECRET`.

To create a second administrator later, temporarily set new bootstrap values and run `npm run admin:create` again. Existing administrator emails are never overwritten by the command.

## 5. Inspect the database in pgAdmin

Refresh this path:

`Databases → icon_world_of_tile → Schemas → public → Tables`

Authentication tables include:

- `AdminUser`
- `AdminSession`
- `Role`
- `LoginThrottle`

Passwords are stored only as bcrypt hashes. Session cookies contain a random token; PostgreSQL stores only its HMAC hash.

## 6. Run the website

Start development mode manually:

```powershell
npm run dev
```

Open:

- Sign in: `http://localhost:3000/admin/login`
- Direct sign-in design route: `http://localhost:3000/signin`
- Dashboard after authentication: `http://localhost:3000/admin/dashboard`

`/admin/login` redirects to the preserved `/signin` design. A valid login redirects to `/admin/dashboard`. `/admin` also redirects to the dashboard. Logged-out users are redirected back through `/admin/login`.

## 7. Common connection issues

### Deployed Hostinger application

The local `.env` is deliberately ignored by Git and does not configure the deployed server.
Set these in the deployed Node application's **runtime environment**, not in browser code:

- `DATABASE_URL`: the production **PostgreSQL** URL, including the database name and any SSL options required by that database provider. The local Windows/localhost URL is not the production database; a MySQL URL is not compatible with this application's Prisma schema.
- `ADMIN_SESSION_SECRET`: one securely generated, stable random secret of at least 32 characters. Use the same value on every application instance; do not regenerate it on each startup or expose it with a `NEXT_PUBLIC_` prefix.
- `SITE_URL`: the actual HTTPS website origin.

Restart the deployed application after saving environment changes. `/signin` reads these values at request time and reports missing or malformed settings without revealing their values. This configuration check does not prove database connectivity.

If the production database is new, apply the existing migrations using the approved deployment procedure and create the first administrator with `npm run admin:create` using temporary bootstrap variables. Do not reset or reseed an existing production database. Remove bootstrap credentials afterwards. Never paste live passwords, connection URLs, or session secrets into chat or commit them to Git.

Changing the error text cannot restore access until these hosting settings are present. No production settings, migrations, or administrator accounts are changed automatically by the website.

### Local development

- **Sign-in is not configured yet:** confirm both `DATABASE_URL` and an `ADMIN_SESSION_SECRET` of at least 32 characters exist in `.env`, then restart the development server.
- **Database connection unavailable:** confirm the PostgreSQL Windows service is running, the database exists, and the username/password/port in `DATABASE_URL` are correct.
- **Migration cannot connect:** verify the same credentials by connecting to `icon_world_of_tile` in pgAdmin.
- **Invalid email or password:** confirm `npm run admin:create` succeeded and use the normalized bootstrap email.
- **Origin verification failed:** confirm `SITE_URL` exactly matches the URL used in the browser, including protocol and port.

The custom `scripts/start-local-postgres.mjs` script is not required for this setup.
