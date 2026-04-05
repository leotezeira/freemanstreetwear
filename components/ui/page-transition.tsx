"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

interface PageTransitionProps {
  children: React.ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const prevPathname = useRef<string | null>(null);

  // Cada vez que cambia el pathname (incluida la primera carga), ocultar sin transición
  // y hacer fade-in en el siguiente frame una vez que el DOM ya tiene el contenido nuevo.
  useEffect(() => {
    if (pathname === prevPathname.current) return;
    prevPathname.current = pathname;

    // Ocultar instantáneamente, sin animación
    setIsVisible(false);

    let timer: ReturnType<typeof setTimeout> | undefined;
    const raf = requestAnimationFrame(() => {
      // Pequeño delay para asegurar que el DOM se pintó antes del fade-in
      timer = setTimeout(() => setIsVisible(true), 20);
    });

    return () => {
      cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
    };
  }, [pathname]);

  return (
    <div
      style={{
        opacity: isVisible ? 1 : 0,
        // Solo transicionar cuando aparece; al ocultar no hay animación
        transition: isVisible
          ? "opacity 400ms cubic-bezier(0.4, 0, 0.2, 1)"
          : "none",
        willChange: "opacity",
      }}
    >
      {children}
    </div>
  );
}
