import { revalidatePath } from "next/cache";
import { getSiteContent, type NavLinkItem, type SocialLinkItem } from "@/lib/services/content.service";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { LogoUploader } from "@/components/admin/logo-uploader";

async function upsertSiteContent(key: string, value: unknown) {
  "use server";

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("site_content").upsert({ key, value }, { onConflict: "key" });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/admin/panel-admin/settings");
}

async function updateBranding(formData: FormData) {
  "use server";

  await upsertSiteContent("logo_text", String(formData.get("logoText") ?? "Freeman Store"));
  await upsertSiteContent("logo_url", String(formData.get("logoUrl") ?? ""));
  await upsertSiteContent("accent_color", String(formData.get("accentColor") ?? "#111827"));
}

async function updateNavigation(formData: FormData) {
  "use server";

  const input = String(formData.get("navJson") ?? "[]");
  const parsed = JSON.parse(input) as NavLinkItem[];
  await upsertSiteContent("nav_links", parsed);
}

async function updateFooter(formData: FormData) {
  "use server";

  const email = String(formData.get("footerEmail") ?? "hola@freemanstore.com");
  const copyrightText = String(formData.get("copyrightText") ?? "");
  const socialJson = String(formData.get("socialJson") ?? "[]");
  const socialLinks = JSON.parse(socialJson) as SocialLinkItem[];

  await upsertSiteContent("footer", {
    email,
    copyrightText,
    socialLinks,
  });
}

export default async function AdminSettingsPage() {
  const content = await getSiteContent();

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-black tracking-tight">Branding, Nav y Footer</h1>
      <p className="text-slate-600">Configurá logo, links de navegación, redes y color de acento.</p>

      <form action={updateBranding} className="card-base grid gap-3">
        <h2 className="text-lg font-bold">Branding</h2>
        <input name="logoText" defaultValue={content.logoText} className="input-base" placeholder="Logo texto" required />
        <LogoUploader currentUrl={content.logoUrl} />
        <input name="accentColor" defaultValue={content.accentColor} className="input-base" placeholder="#111827" required />
        <button className="btn-primary w-full md:w-auto" type="submit">
          Guardar branding
        </button>
      </form>

      <form action={updateNavigation} className="card-base grid gap-3">
        <h2 className="text-lg font-bold">Navegación</h2>
        <p className="text-sm text-slate-500">
          Formato JSON: <code className="font-mono">{'[{"label":"Home","href":"/"}]'}</code>
        </p>
        <textarea
          name="navJson"
          defaultValue={JSON.stringify(content.navLinks, null, 2)}
          className="input-base min-h-44"
          required
        />
        <button className="btn-primary w-full md:w-auto" type="submit">
          Guardar navegación
        </button>
      </form>

      <form action={updateFooter} className="card-base grid gap-3">
        <h2 className="text-lg font-bold">Footer</h2>
        <input name="footerEmail" defaultValue={content.footer.email} className="input-base" placeholder="Email" required />
        <input name="copyrightText" defaultValue={content.footer.copyrightText} className="input-base" placeholder="Copyright" required />
        <p className="text-sm text-slate-500">
          Social links en JSON: <code className="font-mono">{'[{"label":"Instagram","href":"https://..."}]'}</code>
        </p>
        <textarea
          name="socialJson"
          defaultValue={JSON.stringify(content.footer.socialLinks, null, 2)}
          className="input-base min-h-36"
          required
        />
        <button className="btn-primary w-full md:w-auto" type="submit">
          Guardar footer
        </button>
      </form>
    </section>
  );
}
