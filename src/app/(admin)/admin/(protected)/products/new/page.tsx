import { redirect } from "next/navigation";
export default function AddProductPage() { redirect("/admin/products?action=new"); }
