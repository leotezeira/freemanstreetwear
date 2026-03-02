import { redirect } from "next/navigation";

export default function AdminProductsLegacyRedirect() {
  redirect("/admin/panel-admin/products");
}
