import { redirect } from "next/navigation";

type AdminOrdersLegacyRedirectProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrdersLegacyRedirect({ params }: AdminOrdersLegacyRedirectProps) {
  const { id } = await params;
  redirect(`/admin/panel-admin/orders/${id}`);
}
