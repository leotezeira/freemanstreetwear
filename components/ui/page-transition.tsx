"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface PageTransitionProps {
  children: React.ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  // Solo fade-in: pathname cambia cuando el HTML nuevo ya está montado.
  // Doble requestAnimationFrame garantiza dos ciclos de pintura antes de animar.
  useEffect(() => {
    setIsVisible(false);

    let raf2: number | null = null;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setIsVisible(true));
    });

    return () => {
      cancelAnimationFrame(raf1);
      if (raf2 !== null) cancelAnimationFrame(raf2);
    };
  }, [pathname]);

  return (
    <div
      style={{
        opacity: isVisible ? 1 : 0,
        transition: isVisible
          ? "opacity 450ms cubic-bezier(0.4, 0, 0.2, 1)"
          : "none",
        willChange: "opacity",
      }}
    >
      {children}
    </div>
  );
}
