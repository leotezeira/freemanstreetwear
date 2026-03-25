"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/cart/store";
import { useToast } from "@/components/ui/toast";
import { Icon } from "@/components/ui/icon";
import { LoaderCircle, Truck, CheckCircle2 } from "lucide-react";
import type { PaymentMethod } from "@/lib/services/payment-methods.service";
import type { ShippingMethod } from "@/lib/services/shipping-methods.service";

type Step = 1 | 2 | 3;

type ShippingOption = {
  shippingType: "D" | "S";
  serviceName: string;
  price: number;
  etaDays: number | null;
};

type BranchAgency = {
  agencyCode: string;
  description: string;
  address: string;
  locality: string;
  province: string;
  cpa: string;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(value);
}

const PROVINCES = [
  { code: "02", name: "CABA" },
  { code: "06", name: "Buenos Aires" },
  { code: "10", name: "Catamarca" },
  { code: "14", name: "Córdoba" },
  { code: "18", name: "Corrientes" },
  { code: "22", name: "Chaco" },
  { code: "26", name: "Chubut" },
  { code: "30", name: "Entre Ríos" },
  { code: "34", name: "Formosa" },
  { code: "38", name: "Jujuy" },
  { code: "42", name: "La Pampa" },
  { code: "46", name: "La Rioja" },
  { code: "50", name: "Mendoza" },
  { code: "54", name: "Misiones" },
  { code: "58", name: "Neuquén" },
  { code: "62", name: "Río Negro" },
  { code: "66", name: "Salta" },
  { code: "70", name: "San Juan" },
  { code: "74", name: "San Luis" },
  { code: "78", name: "Santa Cruz" },
  { code: "82", name: "Santa Fe" },
  { code: "86", name: "Santiago del Estero" },
  { code: "90", name: "Tucumán" },
  { code: "94", name: "Tierra del Fuego" },
] as const;

type Props = {
  paymentMethods: PaymentMethod[];
  shippingMethods: ShippingMethod[];
};

export default function CheckoutClient({ paymentMethods, shippingMethods }: Props) {
  const router = useRouter();
  const toast = useToast();
  const cartItems = useCartStore((s) => s.items);
  const cartSubtotal = useCartStore((s) => s.totals.subtotal);
  const validateCart = useCartStore((s) => s.validateAgainstSupabase);
  const setShippingEstimate = useCartStore((s) => s.setShippingEstimate);

  const [step, setStep] = useState<Step>(1);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Payment method state
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>(
    paymentMethods[0]?.id ?? "mercadopago"
  );
  const [manualOrderResult, setManualOrderResult] = useState<{
    orderId: string;
    instructions: string;
    methodLabel: string;
  } | null>(null);

  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    shippingAddress: "",
    postalCode: "",
    provinceCode: "02",
    locality: "",
  });

  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);

  const [selectedShippingType, setSelectedShippingType] = useState<"D" | "S" | null>(null);
  const [selectedShippingPrice, setSelectedShippingPrice] = useState<number>(0);
  const [branchLoading, setBranchLoading] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [branchProvinces, setBranchProvinces] = useState<string[]>([]);
  const [branchLocalities, setBranchLocalities] = useState<string[]>([]);
  const [branchAgencies, setBranchAgencies] = useState<BranchAgency[]>([]);
  const [selectedBranchProvince, setSelectedBranchProvince] = useState<string>("");
  const [selectedBranchLocality, setSelectedBranchLocality] = useState<string>("");
  const [selectedAgencyCode, setSelectedAgencyCode] = useState<string>("");

  const shipping = useMemo(() => selectedShippingPrice ?? 0, [selectedShippingPrice]);
  const total = cartSubtotal + shipping;

  async function loadBranchProvinces() {
    setBranchLoading(true);
    setBranchError(null);
    try {
      const res = await fetch("/api/shipping/agencies");
      const body = (await res.json().catch(() => null)) as
        | { provinces?: string[]; error?: string }
        | null;

      if (!res.ok) throw new Error(body?.error ?? "No se pudieron cargar las provincias");

      const provinces = Array.isArray(body?.provinces) ? body.provinces : [];
      setBranchProvinces(provinces);
      if (!provinces.length) {
        setBranchError("No hay provincias disponibles en el archivo de sucursales");
      }
    } catch (e) {
      setBranchError(e instanceof Error ? e.message : "No se pudieron cargar las provincias");
    } finally {
      setBranchLoading(false);
    }
  }

  async function loadBranchLocalities(province: string) {
    setBranchLoading(true);
    setBranchError(null);
    try {
      const res = await fetch(`/api/shipping/agencies?province=${encodeURIComponent(province)}`);
      const body = (await res.json().catch(() => null)) as
        | { localities?: string[]; error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? "No se pudieron cargar las localidades");

      const localities = Array.isArray(body?.localities) ? body.localities : [];
      setBranchLocalities(localities);
      setBranchAgencies([]);
      setSelectedAgencyCode("");

      if (!localities.length) {
        setBranchError("No hay localidades para la provincia seleccionada");
      }
    } catch (e) {
      setBranchError(e instanceof Error ? e.message : "No se pudieron cargar las localidades");
    } finally {
      setBranchLoading(false);
    }
  }

  async function loadBranchAgencies(province: string, locality: string) {
    setBranchLoading(true);
    setBranchError(null);
    try {
      const res = await fetch(
        `/api/shipping/agencies?province=${encodeURIComponent(province)}&locality=${encodeURIComponent(locality)}`
      );
      const body = (await res.json().catch(() => null)) as
        | { agencies?: BranchAgency[]; error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? "No se pudieron cargar las sucursales");

      const agencies = Array.isArray(body?.agencies) ? body.agencies : [];
      setBranchAgencies(agencies);
      setSelectedAgencyCode("");

      if (!agencies.length) {
        setBranchError("No hay sucursales para la localidad seleccionada");
      }
    } catch (e) {
      setBranchError(e instanceof Error ? e.message : "No se pudieron cargar las sucursales");
    } finally {
      setBranchLoading(false);
    }
  }

  async function quoteShipping() {
    setQuoteLoading(true);
    setQuoteError(null);

    try {
      if (!customer.postalCode.trim()) throw new Error("Ingresá un código postal");
      if (cartItems.length === 0) throw new Error("El carrito está vacío");

      // Convertir ShippingMethod a ShippingOption
      const options: ShippingOption[] = shippingMethods.map((m) => ({
        shippingType: m.type,
        serviceName: m.name,
        price: m.price,
        etaDays: m.etaDays,
      })).sort((a, b) => a.price - b.price);

      if (options.length === 0) {
        throw new Error("No hay métodos de envío disponibles");
      }

      setShippingOptions(options);

      const cheapest = options[0];
      setSelectedShippingType(cheapest.shippingType);
      setSelectedShippingPrice(Number(cheapest.price));
      setShippingEstimate({ postalCode: customer.postalCode, price: Number(cheapest.price), updatedAt: Date.now() });

      toast.push({
        variant: "success",
        title: "Envío cotizado",
        description: "Seleccioná la opción que prefieras.",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo cotizar el envío";
      setQuoteError(msg);
      toast.push({ variant: "error", title: "Error al cotizar", description: msg });
    } finally {
      setQuoteLoading(false);
    }
  }

  async function handlePay() {
    setPayLoading(true);
    setPayError(null);

    try {
      const { createPreferenceSchema } = await import("@/lib/validations/payment");
      const payload = {
        customer,
        items: cartItems.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
        })),
        shipping: {
          type: selectedShippingType,
          price: shipping,
          agencyCode: selectedShippingType === "S" ? selectedAgencyCode : null,
        },
      };

      const parsed = createPreferenceSchema.safeParse(payload);
      if (!parsed.success) {
        const err = parsed.error.flatten();
        let msg = Object.entries(err.fieldErrors)
          .map(([k, v]) => `${k}: ${v?.join(", ")}`)
          .join("; ");

        const names: Record<string, string> = {
          "customer.name": "Nombre",
          "customer.email": "Email",
          "customer.phone": "Teléfono",
          "customer.shippingAddress": "Dirección",
          "customer.postalCode": "Código postal",
          "customer.locality": "Localidad",
          "shipping.price": "Precio de envío",
        };
        for (const [key, friendly] of Object.entries(names)) {
          msg = msg.replace(new RegExp(key, "g"), friendly);
        }
        msg = msg
          .replace(/String must contain at least (\d+) character\(s\)/g, "Debe tener al menos $1 caracteres")
          .replace(/Invalid email/g, "Email inválido")
          .replace(/Required/g, "Requerido");

        throw new Error(msg);
      }

      if (!customer.name || customer.name.trim().length < 2) {
        throw new Error("El nombre debe tener al menos 2 caracteres");
      }
      if (!customer.phone || customer.phone.trim().length < 6) {
        throw new Error("El teléfono debe tener al menos 6 dígitos");
      }
      if (!customer.shippingAddress || customer.shippingAddress.trim().length < 5) {
        throw new Error("La dirección debe tener al menos 5 caracteres");
      }
      if (
        !customer.name ||
        !customer.email ||
        !customer.phone ||
        !customer.shippingAddress ||
        !customer.postalCode ||
        !customer.locality
      ) {
        throw new Error("Completá todos los datos requeridos");
      }

      if (cartItems.length === 0) throw new Error("El carrito está vacío");
      if (!selectedShippingType) throw new Error("Cotizá y seleccioná un método de envío");
      if (selectedShippingType === "S" && !selectedAgencyCode) {
        throw new Error("Seleccioná una sucursal");
      }

      const validation = await validateCart();
      if (!validation.ok) {
        throw new Error(validation.reason);
      }

      // Bifurcar según método de pago seleccionado
      if (selectedPaymentMethod === "mercadopago") {
        const response = await fetch("/api/payments/create-preference", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });

        const body = (await response.json().catch(() => null)) as any;
        if (!response.ok) {
          const msg = body?.message || body?.error || "No se pudo iniciar el pago";
          throw new Error(msg);
        }
        if (!body?.initPoint) throw new Error("MercadoPago no devolvió initPoint");

        window.location.href = body.initPoint;
      } else {
        // Pago manual (transferencia, domicilio, etc.)
        const response = await fetch("/api/payments/manual-order", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...payload, paymentMethodId: selectedPaymentMethod }),
        });

        const body = (await response.json().catch(() => null)) as any;
        if (!response.ok) {
          throw new Error(body?.error || "No se pudo crear el pedido");
        }

        // Limpiar carrito y mostrar confirmación
        useCartStore.getState().clearCart();
        setManualOrderResult({
          orderId: body.orderId,
          instructions: body.instructions ?? "",
          methodLabel: body.methodLabel,
        });
      }
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "No se pudo procesar el pago");
    } finally {
      setPayLoading(false);
    }
  }

  const canContinueFromShipping = !!selectedShippingType && (selectedShippingType === "D" || !!selectedAgencyCode);

  return (
    <main className="app-container py-10">
      <h1 className="text-3xl font-black tracking-tight">Checkout</h1>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <button
          className={`btn-secondary ${step === 1 ? "opacity-100" : "opacity-70"}`}
          onClick={() => setStep(1)}
          type="button"
        >
          Paso 1
        </button>
        <button
          className={`btn-secondary ${step === 2 ? "opacity-100" : "opacity-70"}`}
          onClick={() => setStep(2)}
          type="button"
        >
          Paso 2
        </button>
        <button
          className={`btn-secondary ${step === 3 ? "opacity-100" : "opacity-70"}`}
          onClick={() => setStep(3)}
          type="button"
        >
          Paso 3
        </button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="card-base space-y-4">
          {/* ── PASO 1: Datos personales ── */}
          {step === 1 ? (
            <>
              <h2 className="text-lg font-bold">Paso 1: Datos personales</h2>
              <div className="grid gap-3">
                <input
                  className="input-base"
                  type="text"
                  placeholder="Nombre completo"
                  value={customer.name}
                  onChange={(e) => setCustomer((p) => ({ ...p, name: e.target.value }))}
                  required
                />
                <input
                  className="input-base"
                  type="email"
                  placeholder="Email"
                  value={customer.email}
                  onChange={(e) => setCustomer((p) => ({ ...p, email: e.target.value }))}
                  required
                />
                <input
                  className="input-base"
                  type="tel"
                  placeholder="Teléfono"
                  value={customer.phone}
                  onChange={(e) => setCustomer((p) => ({ ...p, phone: e.target.value }))}
                  required
                />
              </div>
              <button className="btn-primary" type="button" onClick={() => setStep(2)}>
                Continuar
              </button>
            </>
          ) : null}

          {/* ── PASO 2: Dirección y envío ── */}
          {step === 2 ? (
            <>
              <h2 className="text-lg font-bold">Paso 2: Dirección y envío</h2>

              <div className="grid gap-3">
                <input
                  className="input-base"
                  type="text"
                  placeholder="Dirección"
                  value={customer.shippingAddress}
                  onChange={(e) =>
                    setCustomer((p) => ({ ...p, shippingAddress: e.target.value }))
                  }
                  required
                />
                <input
                  className="input-base"
                  type="text"
                  placeholder="Localidad"
                  value={customer.locality}
                  onChange={(e) => setCustomer((p) => ({ ...p, locality: e.target.value }))}
                />
                <input
                  className="input-base"
                  type="text"
                  placeholder="Código postal"
                  value={customer.postalCode}
                  onChange={(e) => setCustomer((p) => ({ ...p, postalCode: e.target.value }))}
                  required
                />
                <div className="grid gap-1">
                  <label className="text-sm font-semibold text-slate-700">Provincia</label>
                  <select
                    className="input-base"
                    value={customer.provinceCode}
                    onChange={(e) => setCustomer((p) => ({ ...p, provinceCode: e.target.value }))}
                  >
                    {PROVINCES.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cotización de envío */}
              <div className="mt-6 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Código postal: {customer.postalCode || "—"}</p>

                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={quoteShipping}
                    disabled={
                      quoteLoading ||
                      !customer.postalCode.trim() ||
                      cartItems.length === 0
                    }
                  >
                    <span className="flex items-center gap-2">
                      {quoteLoading ? (
                        <Icon icon={LoaderCircle} className="animate-spin" />
                      ) : (
                        <Icon icon={Truck} />
                      )}
                      <span>{quoteLoading ? "Cotizando..." : "Cotizar envío"}</span>
                    </span>
                  </button>
                </div>

                {quoteError ? (
                  <p className="mt-2 text-sm text-red-600">{quoteError}</p>
                ) : null}

                {quoteLoading ? (
                  <div className="mt-4 grid gap-3">
                    <div className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
                    <div className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
                  </div>
                ) : null}

                {!quoteLoading && shippingOptions.length ? (
                  <div className="mt-4 grid gap-3">
                    {shippingOptions.map((opt, idx) => {
                      const selected =
                        selectedShippingType === opt.shippingType &&
                        Number(opt.price) === Number(selectedShippingPrice);

                      return (
                        <button
                          key={`${opt.shippingType}-${idx}-${opt.serviceName}`}
                          type="button"
                          onClick={() => {
                            setSelectedShippingType(opt.shippingType);
                            setSelectedShippingPrice(Number(opt.price));
                            setShippingEstimate({
                              postalCode: customer.postalCode,
                              price: Number(opt.price),
                              updatedAt: Date.now(),
                            });

                            if (opt.shippingType === "D") {
                              setBranchError(null);
                              setSelectedBranchProvince("");
                              setSelectedBranchLocality("");
                              setSelectedAgencyCode("");
                              setBranchLocalities([]);
                              setBranchAgencies([]);
                            } else if (!branchProvinces.length) {
                              void loadBranchProvinces();
                            }
                          }}
                          className={[
                            "flex items-center justify-between rounded-2xl border p-4 text-left transition",
                            selected
                              ? "border-slate-900 bg-slate-50 dark:border-slate-100 dark:bg-slate-900"
                              : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900",
                          ].join(" ")}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-slate-700 dark:text-slate-200">
                              <Icon icon={Truck} />
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                                {opt.serviceName}
                              </p>
                              <p className="text-sm text-slate-600 dark:text-slate-300">
                                {opt.shippingType === "D" ? "Domicilio" : "Sucursal"}
                                {typeof opt.etaDays === "number" ? ` · ${opt.etaDays} días` : ""}
                              </p>
                            </div>
                          </div>

                          <p className="text-sm font-bold text-slate-900 dark:text-slate-50">
                            {formatMoney(Number(opt.price))}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {selectedShippingType === "S" ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <p className="text-sm font-semibold">Retiro en sucursal</p>

                    <div className="mt-3 grid gap-3">
                      <div className="grid gap-1">
                        <label className="text-sm font-semibold text-slate-700">Provincia</label>
                        <select
                          className="input-base"
                          value={selectedBranchProvince}
                          onChange={(e) => {
                            const value = e.target.value;
                            setSelectedBranchProvince(value);
                            setSelectedBranchLocality("");
                            setSelectedAgencyCode("");
                            setBranchLocalities([]);
                            setBranchAgencies([]);
                            if (value) void loadBranchLocalities(value);
                          }}
                          disabled={branchLoading || !branchProvinces.length}
                        >
                          <option value="">Seleccioná una provincia</option>
                          {branchProvinces.map((province) => (
                            <option key={province} value={province}>
                              {province}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid gap-1">
                        <label className="text-sm font-semibold text-slate-700">Localidad</label>
                        <select
                          className="input-base"
                          value={selectedBranchLocality}
                          onChange={(e) => {
                            const value = e.target.value;
                            setSelectedBranchLocality(value);
                            setSelectedAgencyCode("");
                            setBranchAgencies([]);
                            if (value && selectedBranchProvince) {
                              void loadBranchAgencies(selectedBranchProvince, value);
                            }
                          }}
                          disabled={branchLoading || !selectedBranchProvince || !branchLocalities.length}
                        >
                          <option value="">Seleccioná una localidad</option>
                          {branchLocalities.map((locality) => (
                            <option key={locality} value={locality}>
                              {locality}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid gap-1">
                        <label className="text-sm font-semibold text-slate-700">Sucursal</label>
                        <select
                          className="input-base"
                          value={selectedAgencyCode}
                          onChange={(e) => setSelectedAgencyCode(e.target.value)}
                          disabled={branchLoading || !selectedBranchLocality || !branchAgencies.length}
                        >
                          <option value="">Seleccioná una sucursal</option>
                          {branchAgencies.map((agency) => (
                            <option key={agency.agencyCode} value={agency.agencyCode}>
                              {agency.agencyCode} · {agency.locality}
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedAgencyCode ? (
                        <p className="text-xs text-slate-500">
                          {branchAgencies.find((agency) => agency.agencyCode === selectedAgencyCode)?.address ?? ""}
                        </p>
                      ) : null}

                      {branchError ? <p className="text-sm text-red-600">{branchError}</p> : null}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex gap-2">
                <button className="btn-secondary" type="button" onClick={() => setStep(1)}>
                  Atrás
                </button>
                <button
                  className="btn-primary"
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={!canContinueFromShipping}
                >
                  Continuar
                </button>
              </div>
            </>
          ) : null}

          {/* ── PASO 3: Método de pago ── */}
          {step === 3 ? (
            <>
              <h2 className="text-lg font-bold">Paso 3: Método de pago</h2>

              {/* Selección de método de pago */}
              {paymentMethods.length === 0 ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/20">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                    No hay métodos de pago activos.
                  </p>
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Contactá al administrador para habilitar un método de pago.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {paymentMethods.map((method) => {
                    const isSelected = selectedPaymentMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setSelectedPaymentMethod(method.id)}
                        className={[
                          "flex items-start gap-3 rounded-2xl border p-4 text-left transition",
                          isSelected
                            ? "border-slate-900 bg-slate-50 dark:border-slate-100 dark:bg-slate-900"
                            : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900",
                        ].join(" ")}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                            {method.label}
                          </p>
                          {method.type === "manual" && method.instructions && isSelected && (
                            <p className="mt-2 whitespace-pre-line text-xs text-slate-600 dark:text-slate-300">
                              {method.instructions}
                            </p>
                          )}
                          {method.id === "mercadopago" && isSelected && (
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Serás redirigido a MercadoPago para completar el pago.
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 dark:bg-slate-50">
                            <svg
                              className="h-3 w-3 text-white dark:text-slate-950"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {payError ? (
                <p className="text-sm text-red-600">{payError}</p>
              ) : null}

              {/* Resultado de pedido manual (confirmación exitosa) */}
              {manualOrderResult && (
                <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
                  <div className="flex items-center gap-2">
                    <Icon icon={CheckCircle2} className="text-emerald-700 dark:text-emerald-300" />
                    <p className="font-bold text-emerald-800 dark:text-emerald-300">
                      ¡Pedido creado con éxito!
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">
                    Método: <span className="font-semibold">{manualOrderResult.methodLabel}</span>
                  </p>
                  {manualOrderResult.instructions && (
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3 dark:border-emerald-900/40 dark:bg-emerald-950/40">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                        Instrucciones de pago
                      </p>
                      <p className="mt-1 whitespace-pre-line text-sm text-emerald-800 dark:text-emerald-200">
                        {manualOrderResult.instructions}
                      </p>
                    </div>
                  )}
                  <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400">
                    ID de pedido:{" "}
                    <span className="font-mono font-semibold">
                      {manualOrderResult.orderId.slice(0, 8).toUpperCase()}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                    Te enviamos un email con los detalles a {customer.email}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={payLoading || !!manualOrderResult}
                >
                  Atrás
                </button>
                {!manualOrderResult && (
                  <button
                    className="btn-primary"
                    type="button"
                    onClick={handlePay}
                    disabled={
                      payLoading ||
                      cartItems.length === 0 ||
                      paymentMethods.length === 0
                    }
                  >
                    {payLoading
                      ? "Procesando..."
                      : selectedPaymentMethod === "mercadopago"
                      ? "Pagar con MercadoPago"
                      : "Confirmar pedido"}
                  </button>
                )}
              </div>

              {!manualOrderResult && (
                <button
                  className="text-sm font-medium text-slate-700 underline-offset-2 hover:underline"
                  type="button"
                  onClick={() => router.push("/cart")}
                >
                  Volver al carrito
                </button>
              )}
            </>
          ) : null}
        </section>

        {/* ── RESUMEN LATERAL ── */}
        <aside className="card-base h-fit space-y-3">
          <h2 className="text-lg font-bold">Resumen</h2>

          <div className="space-y-2 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <span>Productos</span>
              <span>{formatMoney(cartSubtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Envío</span>
              <span>{formatMoney(shipping)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
              <span>Total</span>
              <span>{formatMoney(total)}</span>
            </div>
          </div>

          <div className="space-y-2">
            {cartItems.map((it) => (
              <div
                key={`${it.productId}-${it.variantId ?? "base"}`}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-slate-700">
                  {it.name} × {it.quantity}
                </span>
                <span className="text-slate-900">
                  {formatMoney(it.unitPrice * it.quantity)}
                </span>
              </div>
            ))}
            {cartItems.length === 0 ? (
              <p className="text-sm text-slate-500">Carrito vacío.</p>
            ) : null}
          </div>
        </aside>
      </div>
    </main>
  );
}