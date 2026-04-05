import { getEnabledPaymentMethods } from "@/lib/services/payment-methods.service";
import { getEnabledShippingMethods } from "@/lib/services/shipping-methods.service";
import { getTransferDiscountPercent } from "@/lib/services/payment-settings.service";
import CheckoutClient from "./checkout-client";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const paymentMethods = await getEnabledPaymentMethods();
  const shippingMethods = await getEnabledShippingMethods();
  const transferDiscountPercent = await getTransferDiscountPercent();
  return (
    <CheckoutClient
      paymentMethods={paymentMethods}
      shippingMethods={shippingMethods}
      transferDiscountPercent={transferDiscountPercent}
    />
  );
}
