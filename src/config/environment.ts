import { z } from "zod";

const databaseUrlSchema = z
  .string()
  .url()
  .refine((value) => /^(postgresql|postgres):\/\//.test(value), {
    message: "DATABASE_URL must use the postgresql:// or postgres:// protocol.",
  });

export function getDatabaseUrl() {
  return databaseUrlSchema.parse(process.env.DATABASE_URL);
}
