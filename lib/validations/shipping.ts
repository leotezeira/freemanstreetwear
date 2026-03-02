import { z } from "zod";

const postalCodeSchema = z
  .string()
  .trim()
  .min(4)
  .max(8)
  .refine(
    (value) => {
      // AR old format: 4 digits (e.g. 1000)
      // AR CPA format: LDDDDLLL (e.g. C1425ABC)
      const v = value.replace(/\s+/g, "");
      return /^\d{4}$/.test(v) || /^[A-Za-z]\d{4}[A-Za-z]{3}$/.test(v);
    },
    { message: "Código postal inválido" }
  );

export const cartItemForRatesSchema = z.object({
  weight_grams: z.number().int().positive(),
  height: z.number().int().nonnegative().optional().nullable(),
  width: z.number().int().nonnegative().optional().nullable(),
  length: z.number().int().nonnegative().optional().nullable(),
  quantity: z.number().int().positive().default(1),
});

export const shippingRatesRequestSchema = z.object({
  postalCode: postalCodeSchema,
  cartItems: z.array(cartItemForRatesSchema).min(1),
});

export type ShippingRatesRequest = z.infer<typeof shippingRatesRequestSchema>;

export const shippingAgenciesQuerySchema = z.object({
  provinceCode: z.string().trim().min(1).max(8),
});

export const shippingImportRequestSchema = z.object({
  orderId: z.string().uuid(),
  force: z.boolean().optional().default(false),
});

export type ShippingImportRequest = z.infer<typeof shippingImportRequestSchema>;

export const shippingTrackingQuerySchema = z.object({
  shippingId: z.string().trim().min(1),
  force: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});
