import { redirect } from "next/navigation";

export default async function AdminLoginPage() {
  redirect("/admin/panel-admin");
}
