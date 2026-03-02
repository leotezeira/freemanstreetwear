import CorreoArgentinoApi from "ylazzari-correoargentino";
import { Environment, ProvinceCode } from "ylazzari-correoargentino/enums";

type CorreoConfig = {
  userToken: string;
  passwordToken: string;
  email: string;
  password: string;
};

type CorreoApiInstance = InstanceType<typeof CorreoArgentinoApi>;

declare global {
  // eslint-disable-next-line no-var
  var __correoApiInstance: CorreoApiInstance | undefined;
  // eslint-disable-next-line no-var
  var __correoApiInitPromise: Promise<CorreoApiInstance> | undefined;
}

function getCorreoConfig(): CorreoConfig {
  const userToken = process.env.CORREO_USER_TOKEN;
  const passwordToken = process.env.CORREO_PASSWORD_TOKEN;
  const email = process.env.CORREO_EMAIL;
  const password = process.env.CORREO_PASSWORD;

  if (!userToken) throw new Error("CORREO_USER_TOKEN is not configured");
  if (!passwordToken) throw new Error("CORREO_PASSWORD_TOKEN is not configured");
  if (!email) throw new Error("CORREO_EMAIL is not configured");
  if (!password) throw new Error("CORREO_PASSWORD is not configured");

  return { userToken, passwordToken, email, password };
}

export async function getCorreoApi(): Promise<CorreoApiInstance> {
  if (globalThis.__correoApiInstance) {
    return globalThis.__correoApiInstance;
  }

  if (globalThis.__correoApiInitPromise) {
    return globalThis.__correoApiInitPromise;
  }

  globalThis.__correoApiInitPromise = (async () => {
    const config = getCorreoConfig();
    const api = new CorreoArgentinoApi();

    await api.initializeAll({
      userToken: config.userToken,
      passwordToken: config.passwordToken,
      email: config.email,
      password: config.password,
      environment: Environment.PROD,
    });

    globalThis.__correoApiInstance = api;
    return api;
  })();

  try {
    return await globalThis.__correoApiInitPromise;
  } finally {
    globalThis.__correoApiInitPromise = undefined;
  }
}

function extractAgencies(response: unknown): unknown[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (response && typeof response === "object" && "agencies" in response) {
    const maybeAgencies = (response as { agencies?: unknown }).agencies;
    if (Array.isArray(maybeAgencies)) {
      return maybeAgencies;
    }
  }

  return [];
}

export async function getCorreoAgencies(province?: ProvinceCode): Promise<unknown[]> {
  const api = await getCorreoApi();
  const response = province ? await api.getAgencies(province) : await api.getAgencies();
  return extractAgencies(response);
}

export async function getCorreoRates(payload: {
  zipCode: string;
  cartItems?: Array<{ weight_grams?: number; height?: number; width?: number; length?: number; quantity?: number }>;
}): Promise<{
  priceByType: Record<"D" | "S", number | null>;
  etaByType: Record<"D" | "S", string | null>;
}> {
  const api = await getCorreoApi();

  const normalizedPayload = {
    destinationPostalCode: payload.zipCode,
    weight: Math.round((payload.cartItems?.reduce((sum, item) => sum + ((item.weight_grams ?? 0) * (item.quantity ?? 1)), 0) ?? 0) / 1000),
    height: payload.cartItems?.[0]?.height ?? 0,
    width: payload.cartItems?.[0]?.width ?? 0,
    length: payload.cartItems?.[0]?.length ?? 0,
  };

  try {
    const response = (await api.getRates(normalizedPayload)) as any;

    const priceByType: Record<"D" | "S", number | null> = { D: null, S: null };
    const etaByType: Record<"D" | "S", string | null> = { D: null, S: null };

    if (Array.isArray(response?.rates)) {
      response.rates.forEach((rate: any) => {
        const type = rate.serviceType === "D" || rate.serviceType === "home" ? "D" : "S";
        const price = parseFloat(rate.price ?? rate.amount ?? 0);
        if (Number.isFinite(price) && (!priceByType[type] || price < priceByType[type])) {
          priceByType[type] = price;
          etaByType[type] = rate.estimatedDays ?? "3-6";
        }
      });
    }

    return { priceByType, etaByType };
  } catch (error) {
    return {
      priceByType: { D: null, S: null },
      etaByType: { D: null, S: null },
    };
  }
}
