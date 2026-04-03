import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSignedProductImageUrl } from "@/lib/services/product-images.service";

export type NavLinkItem = {
  label: string;
  href: string;
};

export type SocialLinkItem = {
  label: string;
  href: string;
};

export type SiteContent = {
  accentColor: string;
  logoText: string;
  logoUrl: string | null;
  navLinks: NavLinkItem[];
  footer: {
    email: string;
    copyrightText: string;
    socialLinks: SocialLinkItem[];
  };
  home: {
    topBarText: string;
    heroTitle: string;
    heroSubtitle: string;
    heroCtaLabel: string;
    heroCtaHref: string;
    heroImageUrl: string;
    promoTitle: string;
    promoSubtitle: string;
    newsletterTitle: string;
    newsletterSubtitle: string;
  };
};

const defaultContent: SiteContent = {
  accentColor: "#111827",
  logoText: "Freeman Store",
  logoUrl: null,
  navLinks: [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
    { label: "Sobre nosotros", href: "/sobre-nosotros" },
    { label: "Contacto", href: "/contacto" },
  ],
  footer: {
    email: "hola@freemanstore.com",
    copyrightText: "© Freeman Store. Todos los derechos reservados.",
    socialLinks: [
      { label: "Instagram", href: "https://instagram.com" },
      { label: "TikTok", href: "https://tiktok.com" },
    ],
  },
  home: {
    topBarText: "DROP 03 LIVE NOW // LIMITED STOCK // ENVÍOS A TODO ARG",
    heroTitle: "Streetwear premium para todos los días",
    heroSubtitle: "Colecciones minimalistas con identidad urbana y entrega rápida.",
    heroCtaLabel: "Comprar ahora",
    heroCtaHref: "/shop",
    heroImageUrl:
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80",
    promoTitle: "Envío fijo a todo el país",
    promoSubtitle: "Checkout simple y pago seguro con MercadoPago.",
    newsletterTitle: "Recibí novedades",
    newsletterSubtitle: "Suscribite para enterarte de lanzamientos y reposiciones.",
  },
};

function normalizeStorageHeroPath(value: string) {
  if (!value.startsWith("storage:")) return null;
  const path = value.slice("storage:".length).trim();
  return path || null;
}

export async function getSiteContent(options?: { resolveStorageUrls?: boolean }): Promise<SiteContent> {
  try {
    const resolveStorageUrls = options?.resolveStorageUrls ?? true;
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("site_content")
      .select("key, value")
      .in("key", ["accent_color", "logo_text", "logo_url", "nav_links", "footer", "home_content"]);

    if (error || !data) {
      return defaultContent;
    }

    const map = new Map<string, unknown>(data.map((entry) => [entry.key, entry.value]));

    const home =
      typeof map.get("home_content") === "object" && map.get("home_content") !== null
        ? (map.get("home_content") as SiteContent["home"])
        : defaultContent.home;

    const heroStoragePath = normalizeStorageHeroPath(home.heroImageUrl ?? "");
    let resolvedHeroImageUrl = home.heroImageUrl || defaultContent.home.heroImageUrl;

    if (resolveStorageUrls && heroStoragePath) {
      try {
        resolvedHeroImageUrl = await createSignedProductImageUrl(heroStoragePath);
      } catch {
        resolvedHeroImageUrl = defaultContent.home.heroImageUrl;
      }
    }

    return {
      accentColor: typeof map.get("accent_color") === "string" ? String(map.get("accent_color")) : defaultContent.accentColor,
      logoText: typeof map.get("logo_text") === "string" ? String(map.get("logo_text")) : defaultContent.logoText,
      logoUrl: typeof map.get("logo_url") === "string" ? String(map.get("logo_url")) : defaultContent.logoUrl,
      navLinks: Array.isArray(map.get("nav_links")) ? (map.get("nav_links") as NavLinkItem[]) : defaultContent.navLinks,
      footer: typeof map.get("footer") === "object" && map.get("footer") !== null
        ? (map.get("footer") as SiteContent["footer"])
        : defaultContent.footer,
      home: {
        ...defaultContent.home,
        ...home,
        heroImageUrl: resolvedHeroImageUrl,
      },
    };
  } catch {
    return defaultContent;
  }
}
