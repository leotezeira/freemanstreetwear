import { z } from "zod";
import { checkoutSchema } from "./checkout";

export const createPreferenceSchema = checkoutSchema;

export const webhookQuerySchema = z.object({
  type: z.string().optional(),
  topic: z.string().optional(),
  "data.id": z.string().optional(),
  id: z.string().optional(),
});
