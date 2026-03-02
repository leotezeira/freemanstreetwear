type PreferenceItem = {
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
};

type CreatePreferenceInput = {
  items: PreferenceItem[];
  payer: {
    name: string;
    email: string;
  };
  externalReference: string;
};

export async function createMercadoPagoPreference(input: CreatePreferenceInput) {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  if (!accessToken) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN is not configured");
  }

  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_BASE_URL is not configured");
  }

  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: input.items,
      payer: input.payer,
      external_reference: input.externalReference,
      notification_url: `${baseUrl}/api/webhooks/mercadopago`,
      back_urls: {
        success: `${baseUrl}/checkout?status=success&orderId=${encodeURIComponent(input.externalReference)}`,
        failure: `${baseUrl}/checkout?status=failure&orderId=${encodeURIComponent(input.externalReference)}`,
        pending: `${baseUrl}/checkout?status=pending&orderId=${encodeURIComponent(input.externalReference)}`,
      },
      auto_return: "approved",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to create preference: ${errorBody}`);
  }

  return response.json();
}
