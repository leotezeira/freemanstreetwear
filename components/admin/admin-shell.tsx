"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { ToastProvider } from "@/components/ui/toast";
import {
  BarChart3,
  BookOpen,
  CreditCard,
  Folder,
  Infinity as InfinityIcon,
  Image,
  Megaphone,
  Menu,
  Moon,
  Package,
  Package2,
  Settings,
  Shield,
  ShoppingCart,
  Sun,
  Tags,
  Truck,
  Users,
  X,
} from "lucide-react";
import { Icon } from "@/components/ui/icon";

type AdminNavItem = {
  label: string;
  href: string;
  icon: any;
};

type AdminNavSection = {
  label: string;
  items: AdminNavItem[];
};

const NAV: AdminNavSection[] = [
  {
    label: "General",
    items: [
      { label: "Dashboard", href: "/admin/panel-admin", icon: BarChart3 },
      { label: "Reportes", href: "/admin/panel-admin/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { label: "Productos", href: "/admin/panel-admin/products", icon: Package },
      { label: "Bundles", href: "/admin/panel-admin/bundles", icon: Package2 },
      { label: "Variantes", href: "/admin/panel-admin/variants", icon: Tags },
      { label: "Categorías", href: "/admin/panel-admin/categories", icon: Folder },
    ],
  },
  {
    label: "Ventas",
    items: [
      { label: "Pedidos", href: "/admin/panel-admin/orders", icon: ShoppingCart },
      { label: "Clientes", href: "/admin/panel-admin/customers", icon: Users },
      { label: "Descuentos", href: "/admin/panel-admin/discounts", icon: Tags },
    ],
  },
  {
    label: "Operación",
    items: [
      { label: "Envíos", href: "/admin/panel-admin/shipping", icon: Truck },
      { label: "Pagos", href: "/admin/panel-admin/payments", icon: CreditCard },
      { label: "Marketing", href: "/admin/panel-admin/marketing", icon: Megaphone },
    ],
  },
  {
    label: "Sistema",
    items: [
      { label: "Configuración", href: "/admin/panel-admin/settings", icon: Settings },
      { label: "Usuarios y roles", href: "/admin/panel-admin/users-roles", icon: Shield },
      { label: "Carrusel", href: "/admin/panel-admin/product-carousel", icon: InfinityIcon },
      { label: "Banners", href: "/admin/panel-admin/banners", icon: Image },
      { label: "Contenido", href: "/admin/panel-admin/content", icon: BookOpen },
    ],
  },
];

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function resolveTitle(pathname: string) {
  if (pathname === "/admin/panel-admin") return "Dashboard";
  if (pathname.startsWith("/admin/panel-admin/products")) return "Productos";
  if (pathname.startsWith("/admin/panel-admin/variants")) return "Variantes";
  if (pathname.startsWith("/admin/panel-admin/categories")) return "Categorías";
  if (pathname.startsWith("/admin/panel-admin/orders")) return "Pedidos";
  if (pathname.startsWith("/admin/panel-admin/customers")) return "Clientes";
  if (pathname.startsWith("/admin/panel-admin/discounts")) return "Descuentos";
  if (pathname.startsWith("/admin/panel-admin/shipping")) return "Envíos";
  if (pathname.startsWith("/admin/panel-admin/payments")) return "Pagos";
  if (pathname.startsWith("/admin/panel-admin/reports")) return "Reportes";
  if (pathname.startsWith("/admin/panel-admin/marketing")) return "Marketing";
  if (pathname.startsWith("/admin/panel-admin/settings")) return "Configuración";
  if (pathname.startsWith("/admin/panel-admin/users-roles")) return "Usuarios y roles";
  if (pathname.startsWith("/admin/panel-admin/product-carousel")) return "Carrusel";
  if (pathname.startsWith("/admin/panel-admin/banners")) return "Banners";
  if (pathname.startsWith("/admin/panel-admin/content")) return "Contenido";
  return "Admin";
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const title = useMemo(() => resolveTitle(pathname), [pathname]);

  useEffect(() => {
    const stored = window.localStorage.getItem("admin-theme");
    const isDark = stored === "dark";
    setDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    window.localStorage.setItem("admin-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  function isActive(href: string) {
    if (href === "/admin/panel-admin") return pathname === href;
    return pathname.startsWith(href);
  }

  const sidebar = (
    <aside className="flex h-full w-72 flex-col border-r border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between gap-3">
        <Link href="/admin/panel-admin" className="text-sm font-black tracking-tight">
          Freeman Admin
        </Link>
        <button
          type="button"
          className="md:hidden rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-slate-700"
          onClick={() => setSidebarOpen(false)}
          aria-label="Cerrar menú"
        >
          <Icon icon={X} />
        </button>
      </div>

      <nav className="mt-6 space-y-6 overflow-auto pr-1">
        {NAV.map((section) => (
          <div key={section.label}>
            <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {section.label}
            </p>
            <div className="mt-2 grid gap-1">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={classNames(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold",
                    isActive(item.href)
                      ? "bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-50"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon icon={item.icon} className="text-slate-500 dark:text-slate-400" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="hidden md:fixed md:inset-y-0 md:left-0 md:block">{sidebar}</div>

        {sidebarOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              onClick={() => setSidebarOpen(false)}
              aria-label="Cerrar"
            />
            <div className="absolute inset-y-0 left-0">{sidebar}</div>
          </div>
        ) : null}

        <div className="md:pl-72">
          <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
            <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-8">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Abrir menú"
                >
                  <Icon icon={Menu} />
                </button>
                <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-50">{title}</h1>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary px-3 py-2"
                  onClick={() => setDarkMode((v) => !v)}
                  aria-label="Alternar modo oscuro"
                >
                  <Icon icon={darkMode ? Moon : Sun} />
                </button>
              </div>
            </div>
          </header>

          <main className="px-4 py-6 md:px-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}



