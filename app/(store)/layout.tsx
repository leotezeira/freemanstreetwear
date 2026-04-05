import type { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getSiteContent } from "@/lib/services/content.service";
import { ToastProvider } from "@/components/ui/toast";
import { CartDrawer } from "@/components/cart/CartDrawer";
import PageTransition from "@/components/ui/page-transition";

export default async function StoreLayout({ children }: { children: ReactNode }) {
  const content = await getSiteContent();

  return (
    <div style={{ ["--accent" as string]: content.accentColor }}>
      <ToastProvider>
        <Header logoText={content.logoText} logoUrl={content.logoUrl} navLinks={content.navLinks} />
        <CartDrawer />
        <PageTransition>{children}</PageTransition>
        <Footer footer={content.footer} />
      </ToastProvider>
    </div>
  );
}
