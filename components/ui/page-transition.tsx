"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

interface PageTransitionProps {
  children: React.ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const isFirstMount = useRef(true);
  const prevPathname = useRef(pathname);

  // Primera carga: fade-in suave al montar
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 30);
    return () => clearTimeout(timer);
  }, []);

  // Cambio de ruta: fade-out ? fade-in
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    if (pathname === prevPathname.current) return;
    prevPathname.current = pathname;

    setIsVisible(false);
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div
      style={{
        opacity: isVisible ? 1 : 0,
        transition: "opacity 350ms cubic-bezier(0.4, 0, 0.2, 1)",
        willChange: "opacity",
      }}
    >
      {children}
    </div>
  );
}
