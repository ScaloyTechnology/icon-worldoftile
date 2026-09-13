import { z } from "zod";

export const adminLoginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
