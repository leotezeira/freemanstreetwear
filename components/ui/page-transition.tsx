"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function LoadingOverlay() {
  const dots = Array.from({ length: 3 });
  return (
    <div className="loading-overlay" role="status" aria-live="polite">
      <div className="loading-overlay__card">
        <p className="loading-overlay__label">Cargando...</p>
        <div className="loading-overlay__dots" aria-hidden="true">
          {dots.map((_, index) => (
            <span
              key={index}
              className="loading-overlay__dot"
              style={{ animationDelay: `${index * 0.14}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [loaded, setLoaded] = useState(false);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  useEffect(() => {
    setNavigating(true);
    setLoaded(false);
    const timer = setTimeout(() => {
      setNavigating(false);
      setLoaded(true);
    }, 300); // Ajustar delay si es necesario
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div className="relative">
      {navigating && <LoadingOverlay />}
      <div className={`page ${loaded ? "loaded" : ""}`}>
        {children}
      </div>
    </div>
  );
}

