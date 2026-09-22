import { redirect } from "next/navigation";
import { currentAdmin } from "@/server/auth/session";

export default async function AdminLoginPage() {
  if (await currentAdmin()) redirect("/admin");
  redirect("/signin");
}
