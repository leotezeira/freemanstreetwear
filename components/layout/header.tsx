"use client";

import Link from "next/link";
import { useState } from "react";
import type { NavLinkItem } from "@/lib/services/content.service";
import { Menu, ShoppingCart } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { useCartStore } from "@/lib/cart/store";

type HeaderProps = {
  logoText: string;
  logoUrl: string | null;
  navLinks: NavLinkItem[];
};

export function Header({ logoText, logoUrl, navLinks }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const totalQty = useCartStore((s) => s.totals.totalQuantity);
  const openCart = useCartStore((s) => s.openDrawer);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="app-container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-black tracking-tight">
          {logoUrl ? <img src={logoUrl} alt={logoText} className="h-8 w-8 object-contain" /> : null}
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {navLinks.map((link) => (
            <Link key={`${link.href}-${link.label}`} href={link.href} className="hover:text-accent">
              {link.label}
            </Link>
          ))}
          <Link href="/auth" className="rounded-lg border border-slate-300 px-3 py-2 hover:border-slate-900">
            Ingresar
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 hover:border-slate-900"
            aria-label="Abrir carrito"
            onClick={() => openCart()}
          >
            <Icon icon={ShoppingCart} />
            {totalQty > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-slate-900 px-1.5 py-0.5 text-[11px] font-black text-white">
                {totalQty}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 md:hidden"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Abrir menú"
          >
            <Icon icon={Menu} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-slate-200 bg-white md:hidden">
          <div className="app-container flex flex-col py-3">
            {navLinks.map((link) => (
              <Link
                key={`mobile-${link.href}-${link.label}`}
                href={link.href}
                className="rounded-lg px-2 py-2 text-sm font-medium hover:bg-slate-100"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/auth"
              className="rounded-lg px-2 py-2 text-sm font-semibold hover:bg-slate-100"
              onClick={() => setMenuOpen(false)}
            >
              Ingresar (Login / Registro)
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
