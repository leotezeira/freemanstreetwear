"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Infinity as InfinityIcon, Loader2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Icon } from "@/components/ui/icon";
import { ClientImage } from "@/components/ui/client-image";

type Product = {
  id: string;
  name: string;
  category: string | null;
  price: number;
  stock: number;
  is_active: boolean;
  primary_image_url?: string | null;
};

type CarouselItem = {
  id?: string;
  product_id: string;
  sort_order: number;
  is_active: boolean;
  products?: Product;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(value);
}

export default function AdminProductCarouselPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<CarouselItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [carouselRes, productsRes] = await Promise.all([
        fetch("/api/admin/product-carousel"),
        fetch("/api/admin/products/all?all=true"),
      ]);

      const [carouselBody, productsBody] = await Promise.all([
        carouselRes.json().catch(() => ({})),
        productsRes.json().catch(() => ({})),
      ]);

      if (!carouselRes.ok) throw new Error(carouselBody?.error ?? "No se pudo cargar el carrusel");
      if (!productsRes.ok) throw new Error(productsBody?.error ?? "No se pudieron cargar productos");

      const loadedItems = Array.isArray(carouselBody?.items)
        ? (carouselBody.items as CarouselItem[]).map((item, idx) => ({
            ...item,
            sort_order: item?.sort_order ?? idx,
          }))
        : [];
      const orphans = loadedItems.filter((item) => !item.products);
      if (orphans.length) {
        toast.push({
          variant: "warning",
          title: "Productos huérfanos",
          description: `${orphans.length} producto${orphans.length === 1 ? "" : "s"} no existe${orphans.length === 1 ? "" : "n"} en la tienda.`,
        });
      }
      setItems(loadedItems);
      setProducts(Array.isArray(productsBody?.products) ? (productsBody.products as Product[]) : []);
    } catch (e) {
      toast.push({
        variant: "error",
        title: "Error",
        description: e instanceof Error ? e.message : "No se pudo cargar la información",
      });
    } finally {
      setLoading(false);
    }
  }

  function normalize(items: CarouselItem[]) {
    return items.map((item, idx) => ({ ...item, sort_order: idx }));
  }

  function addProduct(product: Product) {
    if (items.some((item) => item.product_id === product.id)) {
      toast.push({ variant: "error", title: "Duplicado", description: "Ese producto ya está en el carrusel" });
      return;
    }
    setItems((prev) =>
      normalize([
        ...prev,
        {
          product_id: product.id,
          sort_order: prev.length,
          is_active: true,
          products: product,
        },
      ])
    );
  }

  function removeProduct(productId: string) {
    setItems((prev) => normalize(prev.filter((item) => item.product_id !== productId)));
  }

  function move(productId: string, direction: "up" | "down") {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.product_id === productId);
      if (idx < 0) return prev;
      const target = direction === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(target, 0, item);
      return normalize(copy);
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const productIds = items.map((item) => item.product_id);
      const res = await fetch("/api/admin/product-carousel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productIds }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "No se pudo guardar");

      toast.push({ variant: "success", title: "Carrusel guardado" });
      await loadData();
    } catch (e) {
      toast.push({
        variant: "error",
        title: "Error",
        description: e instanceof Error ? e.message : "No se pudo guardar el carrusel",
      });
    } finally {
      setSaving(false);
    }
  }

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => p.is_active)
      .filter((p) => !items.some((item) => item.product_id === p.id))
      .filter((p) => (q ? p.name.toLowerCase().includes(q) || (p.category ?? "").toLowerCase().includes(q) : true))
      .slice(0, 12);
  }, [products, items, search]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Carrusel de productos</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Selección actual \n            Arrastrá el orden (o usa las flechas) y quitá los que no quieras mostrar.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadData()}
            className="btn-secondary flex items-center gap-2 px-3 py-2"
            disabled={loading || saving}
          >
            <Icon icon={RefreshCw} className="h-4 w-4" />
            Recargar
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            className="btn-primary flex items-center gap-2 px-4 py-2.5"
            disabled={saving || loading}
          >
            {saving ? <Icon icon={Loader2} className="h-4 w-4 animate-spin" /> : <Icon icon={InfinityIcon} className="h-4 w-4" />}
            {saving ? "Guardando..." : "Guardar carrusel"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="card-base space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Selección actual</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Arrastrá el orden (o usa las flechas) y quitá los que no quieras mostrar.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">{items.length} productos</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
              ))}
            </div>
          ) : !items.length ? (
            <div className="card-base border border-dashed border-slate-300 text-center dark:border-slate-800">
              <p className="font-semibold text-slate-700 dark:text-slate-200">Todavía no hay productos en el carrusel</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Agregá productos desde la columna derecha.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={item.product_id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900">
                    <ClientImage src={item.products?.primary_image_url ?? null} alt={item.products?.name ?? "Producto"} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{item.products?.name ?? "Producto sin nombre"}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.products?.category ?? "Sin categoría"} · {formatPrice(Number(item.products?.price ?? 0))}</p>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Orden #{idx + 1} {item.products?.is_active ? "" : "· Inactivo"}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" className="rounded-lg p-1.5 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800" onClick={() => move(item.product_id, "up")} disabled={idx === 0} title="Subir">
                      <Icon icon={ArrowUp} className="h-4 w-4" />
                    </button>
                    <button type="button" className="rounded-lg p-1.5 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800" onClick={() => move(item.product_id, "down")} disabled={idx === items.length - 1} title="Bajar">
                      <Icon icon={ArrowDown} className="h-4 w-4" />
                    </button>
                    <button type="button" className="rounded-lg p-1.5 hover:bg-red-50 dark:hover:bg-red-900/40" onClick={() => removeProduct(item.product_id)} title="Quitar">
                      <Icon icon={Trash2} className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-base space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Agregar productos</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">Buscá entre los productos activos.</p>
            </div>
          </div>

          <div className="relative">
            <Icon icon={Search} className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre o categoría" className="input-base rounded-xl pl-9 pr-3" />
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No hay productos disponibles con ese filtro.</p>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/80">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-900">
                      <ClientImage src={product.primary_image_url ?? null} alt={product.name} className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{product.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{product.category ?? "Sin categoría"} · {formatPrice(product.price)}</p>
                    </div>
                  </div>
                  <button type="button" className="btn-secondary flex items-center gap-2 px-3 py-2" onClick={() => addProduct(product)}>
                    <Icon icon={Plus} className="h-4 w-4" />
                    Agregar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
