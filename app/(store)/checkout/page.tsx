import { getEnabledPaymentMethods } from "@/lib/services/payment-methods.service";
import CheckoutClient from "./checkout-client";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const paymentMethods = await getEnabledPaymentMethods();
  return <CheckoutClient paymentMethods={paymentMethods} />;
}
