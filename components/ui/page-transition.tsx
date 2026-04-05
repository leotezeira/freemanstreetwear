"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

interface PageTransitionProps {
  children: React.ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [displayChildren, setDisplayChildren] = useState(children);
  const isFirstMount = useRef(true);

  // Primera carga: mantener visible (no flash de contenido oculto)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      // El contenido ya está visible desde el inicio
      return;
    }
  }, []);

  // Cambio de ruta: fade-out → swap → fade-in
  useEffect(() => {
    if (isFirstMount.current) return;

    setIsVisible(false);

    const swapTimer = setTimeout(() => {
      setDisplayChildren(children);
      setIsVisible(true);
    }, 280); // Duración del fade-out

    return () => clearTimeout(swapTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Sincronizar children si cambian dentro de la misma ruta
  useEffect(() => {
    if (isVisible) {
      setDisplayChildren(children);
    }
  }, [children, isVisible]);

  return (
    <div
      style={{
        opacity: isVisible ? 1 : 0,
        transition: "opacity 350ms cubic-bezier(0.4, 0, 0.2, 1)",
        willChange: "opacity",
      }}
    >
      {displayChildren}
    </div>
  );
}

