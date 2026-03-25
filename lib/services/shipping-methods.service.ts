import { getSupabasePublicServerClient } from "@/lib/supabase/public";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type ShippingMethod = {
  id: string;
  name: string;
  type: "D" | "S"; // D = Domicilio, S = Sucursal
  price: number;
  etaDays: number | null;
  enabled: boolean;
  description?: string;
};

const DEFAULT_SHIPPING_METHODS: ShippingMethod[] = [
  {
    id: "home-standard",
    name: "Envío a domicilio",
    type: "D",
    price: 7500,
    etaDays: null,
    enabled: true,
    description: "Envío estándar a domicilio",
  },
  {
    id: "branch-standard",
    name: "Envío a sucursal",
    type: "S",
    price: 6500,
    etaDays: null,
    enabled: true,
    description: "Retiro en sucursal de Correo Argentino",
  },
];

export async function getShippingMethods(): Promise<ShippingMethod[]> {
  try {
    const supabase = getSupabasePublicServerClient();
    const { data } = await supabase
      .from("site_content")
      .select("value")
      .eq("key", "shipping_methods")
      .maybeSingle();

    const methods = (data?.value as ShippingMethod[]) ?? [];
    return methods.length > 0 ? methods : DEFAULT_SHIPPING_METHODS;
  } catch (error) {
    console.error("[shipping-methods:get]", error);
    return DEFAULT_SHIPPING_METHODS;
  }
}

export async function getEnabledShippingMethods(): Promise<ShippingMethod[]> {
  const methods = await getShippingMethods();
  return methods.filter((m) => m.enabled);
}

export async function saveShippingMethods(methods: ShippingMethod[]) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("site_content")
    .upsert({ key: "shipping_methods", value: methods }, { onConflict: "key" });

  if (error) throw new Error(error.message);
}

export async function addShippingMethod(method: Omit<ShippingMethod, "id">) {
  const methods = await getShippingMethods();
  
  // Generar ID único basado en el nombre
  const baseId = method.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  
  let id = baseId;
  let counter = 1;
  while (methods.some((m) => m.id === id)) {
    id = `${baseId}-${counter}`;
    counter++;
  }

  const newMethod: ShippingMethod = { ...method, id };
  methods.push(newMethod);
  
  await saveShippingMethods(methods);
  return newMethod;
}

export async function updateShippingMethod(id: string, updates: Partial<ShippingMethod>) {
  const methods = await getShippingMethods();
  
  const index = methods.findIndex((m) => m.id === id);
  if (index === -1) {
    throw new Error(`Método de envío no encontrado: ${id}`);
  }

  methods[index] = { ...methods[index], ...updates };
  await saveShippingMethods(methods);
  return methods[index];
}

export async function deleteShippingMethod(id: string) {
  const methods = await getShippingMethods();
  
  // No permitir eliminar los métodos por defecto
  const isDefault = DEFAULT_SHIPPING_METHODS.some((m) => m.id === id);
  if (isDefault) {
    throw new Error("No se pueden eliminar los métodos de envío por defecto");
  }

  const filtered = methods.filter((m) => m.id !== id);
  await saveShippingMethods(filtered);
}

export async function toggleShippingMethod(id: string) {
  const methods = await getShippingMethods();
  
  const method = methods.find((m) => m.id === id);
  if (!method) {
    throw new Error(`Método de envío no encontrado: ${id}`);
  }

  method.enabled = !method.enabled;
  await saveShippingMethods(methods);
  return method;
}
