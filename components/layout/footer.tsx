import type { SiteContent } from "@/lib/services/content.service";

type FooterProps = {
  footer: SiteContent["footer"];
};

export function Footer({ footer }: FooterProps) {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-50">
      <div className="app-container flex flex-col gap-4 py-10 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p>
            Contacto: <a href={`mailto:${footer.email}`} className="font-semibold text-slate-900">{footer.email}</a>
          </p>
          <p>{footer.copyrightText}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {footer.socialLinks.map((link) => (
            <a
              key={`${link.href}-${link.label}`}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-slate-900 hover:text-accent"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
