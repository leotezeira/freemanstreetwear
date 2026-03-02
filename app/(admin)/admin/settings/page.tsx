import { redirect } from "next/navigation";

export default function AdminSettingsLegacyRedirect() {
  redirect("/admin/panel-admin/settings");
}
