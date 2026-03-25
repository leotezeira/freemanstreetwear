import { z } from "zod";

export const checkoutSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2),
    email: z.string().trim().email(),
    phone: z.string().trim().min(6),
    shippingAddress: z.string().trim().min(5),
    localityName: z.string().trim().min(1),
    postalCode: z
      .string()
      .trim()
      .min(4)
      .max(8)
      .refine(
        (value) => {
          const v = value.replace(/\s+/g, "");
          return /^\d{4}$/.test(v) || /^[A-Za-z]\d{4}[A-Za-z]{3}$/.test(v);
        },
        { message: "Código postal inválido" }
      ),
    provinceCode: z.string().trim().min(1).max(8).optional(),
  }),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
  shipping: z.object({
    type: z.enum(["D", "S"]),
    price: z.number().nonnegative(),
    agencyCode: z.string().trim().min(1).optional().nullable(),
  }),
});

export type CheckoutPayload = z.infer<typeof checkoutSchema>;
