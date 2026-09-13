export const adminSessionPolicy = {
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secureInProduction: true,
    path: "/admin",
  },
  absoluteTtlSeconds: 60 * 60 * 8,
  rotateAfterSeconds: 60 * 30,
} as const;

export type AdminSessionIdentity = Readonly<{
  adminUserId: string;
  role: "SUPER_ADMIN" | "ADMIN" | "EDITOR";
}>;
