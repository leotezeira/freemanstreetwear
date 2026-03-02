"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/cart/store";
import { useToast } from "@/components/ui/toast";
import { Icon } from "@/components/ui/icon";
import { LoaderCircle, MapPin, Store, Truck } from "lucide-react";

type Step = 1 | 2 | 3 | 4;

type ShippingOption = {
  shippingType: "D" | "S";
  serviceName: string;
  price: number;
  etaDays: number | null;
};

type FixedShippingRateResponse = {
  price: number;
  currency: "ARS";
  deliveryType: "branch" | "home";
  estimatedDays: string;
};

type Agency = {
  agencyCode: string;
  description: string;
  address: string;
  locality: string;
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

export default function CheckoutPage() {
  const router = useRouter();
  const toast = useToast();
  const cartItems = useCartStore((s) => s.items);
  const cartSubtotal = useCartStore((s) => s.totals.subtotal);
  const validateCart = useCartStore((s) => s.validateAgainstSupabase);
  const setShippingEstimate = useCartStore((s) => s.setShippingEstimate);

  const [step, setStep] = useState<Step>(1);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    shippingAddress: "",
    postalCode: "",
    provinceCode: "02",
  });

  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);

  const [selectedShippingType, setSelectedShippingType] = useState<"D" | "S" | null>(null);
  const [selectedShippingPrice, setSelectedShippingPrice] = useState<number>(0);

  const [agenciesLoading, setAgenciesLoading] = useState(false);
  const [agenciesError, setAgenciesError] = useState<string | null>(null);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [selectedAgencyCode, setSelectedAgencyCode] = useState<string>("");

  const shipping = useMemo(() => selectedShippingPrice ?? 0, [selectedShippingPrice]);
  const total = cartSubtotal + shipping;

  async function quoteShipping() {
    setQuoteLoading(true);
    setQuoteError(null);

    try {
      if (!customer.postalCode.trim()) throw new Error("Ingresá un código postal");
      if (cartItems.length === 0) throw new Error("El carrito está vacío");

      const zipCode = customer.postalCode.trim();

      const cartItemsForRates = cartItems.map((item) => ({
        weight_grams: item.weight_grams ?? undefined,
        height: item.height ?? undefined,
        width: item.width ?? undefined,
        length: item.length ?? undefined,
        quantity: item.quantity,
      }));

      const quote = async (deliveryType: "home" | "branch") => {
        const res = await fetch("/api/shipping/rates", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ zipCode, deliveryType, cartItems: cartItemsForRates }),
        });

        const body = (await res.json().catch(() => null)) as Partial<FixedShippingRateResponse> & { error?: string };
        if (!res.ok) throw new Error(body?.error ?? "No se pudo cotizar el envío");

        if (typeof body.price !== "number" || !Number.isFinite(body.price)) {
          throw new Error("Respuesta inválida de cotización");
        }

        return {
          shippingType: deliveryType === "home" ? "D" : "S",
          serviceName: deliveryType === "home" ? "Envío a domicilio" : "Envío a sucursal",
          price: body.price,
          etaDays: null,
        } as ShippingOption;
      };

      const options = (await Promise.all([quote("home"), quote("branch")])).sort((a, b) => a.price - b.price);

      setShippingOptions(options);

      const cheapest = options[0];
      setSelectedShippingType(cheapest.shippingType);
      setSelectedShippingPrice(Number(cheapest.price));
      setShippingEstimate({ postalCode: customer.postalCode, price: Number(cheapest.price), updatedAt: Date.now() });
      setSelectedAgencyCode("");
      setAgencies([]);
      setAgenciesError(null);

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

  async function loadAgencies() {
    setAgenciesLoading(true);
    setAgenciesError(null);

    try {
      const res = await fetch(
        `/api/shipping/agencies?provinceCode=${encodeURIComponent(customer.provinceCode)}`
      );
      const body = (await res.json().catch(() => null)) as any;
      if (!res.ok) throw new Error(body?.error ?? "No se pudieron cargar las sucursales");

      const list = (body?.agencies ?? []) as Agency[];
      setAgencies(Array.isArray(list) ? list : []);

      if (!Array.isArray(list) || list.length === 0) {
        setAgenciesError("No hay sucursales para la provincia seleccionada");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudieron cargar las sucursales";
      setAgenciesError(msg);
      toast.push({ variant: "error", title: "Sucursales", description: msg });
    } finally {
      setAgenciesLoading(false);
    }
  }

  async function handlePay() {
    setPayLoading(true);
    setPayError(null);

    try {
      if (
        !customer.name ||
        !customer.email ||
        !customer.phone ||
        !customer.shippingAddress ||
        !customer.postalCode
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

      const response = await fetch("/api/payments/create-preference", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
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
        }),
      });

      const body = (await response.json().catch(() => null)) as any;
      if (!response.ok) throw new Error(body?.error ?? "No se pudo iniciar el pago");
      if (!body?.initPoint) throw new Error("MercadoPago no devolvió initPoint");

      window.location.href = body.initPoint;
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "No se pudo iniciar el pago");
    } finally {
      setPayLoading(false);
    }
  }

  const canContinueFromShipping =
    !!selectedShippingType && (selectedShippingType === "D" || !!selectedAgencyCode);

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
        <button
          className={`btn-secondary ${step === 4 ? "opacity-100" : "opacity-70"}`}
          onClick={() => setStep(4)}
          type="button"
        >
          Paso 4
        </button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="card-base space-y-4">
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

          {step === 2 ? (
            <>
              <h2 className="text-lg font-bold">Paso 2: Dirección</h2>
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
              <div className="flex gap-2">
                <button className="btn-secondary" type="button" onClick={() => setStep(1)}>
                  Atrás
                </button>
                <button className="btn-primary" type="button" onClick={() => setStep(3)}>
                  Continuar
                </button>
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <h2 className="text-lg font-bold">Paso 3: Envío</h2>
              <p className="text-sm text-slate-600">
                Cotizá el envío con Correo Argentino y elegí la opción.
              </p>

              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon icon={MapPin} />
                    <p className="text-sm font-semibold">
                      Código postal: {customer.postalCode || "—"}
                    </p>
                  </div>

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
                              setSelectedAgencyCode("");
                              setAgencies([]);
                              setAgenciesError(null);
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
                              <Icon icon={opt.shippingType === "D" ? Truck : Store} />
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                                {opt.shippingType === "D"
                                  ? "Envío a domicilio"
                                  : "Envío a sucursal"}
                              </p>
                              <p className="text-sm text-slate-600 dark:text-slate-300">
                                {opt.serviceName}
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

                    <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                      <select
                        className="input-base"
                        value={customer.provinceCode}
                        onChange={(e) =>
                          setCustomer((p) => ({ ...p, provinceCode: e.target.value }))
                        }
                      >
                        {PROVINCES.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.name}
                          </option>
                        ))}
                      </select>

                      <button
                        className="btn-secondary"
                        type="button"
                        onClick={loadAgencies}
                        disabled={agenciesLoading}
                      >
                        <span className="flex items-center gap-2">
                          {agenciesLoading ? (
                            <Icon icon={LoaderCircle} className="animate-spin" />
                          ) : (
                            <Icon icon={Store} />
                          )}
                          <span>{agenciesLoading ? "Buscando..." : "Buscar"}</span>
                        </span>
                      </button>
                    </div>

                    {agenciesError ? (
                      <p className="mt-2 text-sm text-red-600">{agenciesError}</p>
                    ) : null}

                    {agenciesLoading ? (
                      <div className="mt-3 h-12 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
                    ) : null}

                    {!agenciesLoading && agencies.length ? (
                      <div className="mt-3 grid gap-2">
                        <label className="text-sm font-semibold">Sucursal</label>
                        <select
                          className="input-base"
                          value={selectedAgencyCode}
                          onChange={(e) => setSelectedAgencyCode(e.target.value)}
                        >
                          <option value="">Seleccioná una sucursal</option>
                          {agencies.map((a) => (
                            <option key={a.agencyCode} value={a.agencyCode}>
                              {a.description} · {a.locality}
                            </option>
                          ))}
                        </select>

                        {selectedAgencyCode ? (
                          <p className="text-xs text-slate-500">
                            {agencies.find((a) => a.agencyCode === selectedAgencyCode)
                              ?.address ?? ""}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="flex gap-2">
                <button className="btn-secondary" type="button" onClick={() => setStep(2)}>
                  Atrás
                </button>
                <button
                  className="btn-primary"
                  type="button"
                  onClick={() => setStep(4)}
                  disabled={!canContinueFromShipping}
                >
                  Continuar
                </button>
              </div>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <h2 className="text-lg font-bold">Paso 4: Confirmación</h2>
              {payError ? <p className="text-sm text-red-600">{payError}</p> : null}

              <p className="text-sm text-slate-600">Por ahora solo MercadoPago.</p>

              <div className="flex gap-2">
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={payLoading}
                >
                  Atrás
                </button>
                <button
                  className="btn-primary"
                  type="button"
                  onClick={handlePay}
                  disabled={payLoading || cartItems.length === 0}
                >
                  {payLoading ? "Procesando..." : "Pagar con MercadoPago"}
                </button>
              </div>

              <button
                className="text-sm font-medium text-slate-700 underline-offset-2 hover:underline"
                type="button"
                onClick={() => router.push("/cart")}
              >
                Volver al carrito
              </button>
            </>
          ) : null}
        </section>

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
