import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/cart/CartProvider";
import Navbar from "@/components/ui/Navbar";

export const metadata: Metadata = {
  title: "Freeman Streetwear - Loja Online",
  description: "Streetwear autêntico e de qualidade",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <CartProvider>
          <Navbar />
          <main className="min-h-screen">
            {children}
          </main>
          <footer className="bg-gray-900 text-white py-8 mt-12">
            <div className="container mx-auto px-4 text-center">
              <p>&copy; 2026 Freeman Streetwear. Todos os direitos reservados.</p>
            </div>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
