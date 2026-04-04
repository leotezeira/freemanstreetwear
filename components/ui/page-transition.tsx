"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function LoadingOverlay({ hide }: { hide: boolean }) {
  const dots = Array.from({ length: 3 });
  return (
    <div className={`loading-overlay ${hide ? "hide" : ""}`} role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-3">
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
  const [hideOverlay, setHideOverlay] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  useEffect(() => {
    // Inicio: mostrar contenido borroso con overlay
    const timer = setTimeout(() => {
      setLoaded(true);
      // Pequeño delay para que el fade sea fluido
      setTimeout(() => {
        setHideOverlay(true);
      }, 300);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Detectar cambio de ruta
    if (prevPathname !== pathname) {
      setLoaded(false);
      setHideOverlay(false);
      
      const timer = setTimeout(() => {
        setLoaded(true);
        // Pequeño delay para que el fade sea fluido
        setTimeout(() => {
          setHideOverlay(true);
        }, 300);
      }, 100);

      setPrevPathname(pathname);
      return () => clearTimeout(timer);
    }
  }, [pathname, prevPathname]);

  return (
    <>
      <LoadingOverlay hide={hideOverlay} />
      <div className={`page ${loaded ? "loaded" : ""}`}>
        {children}
      </div>
    </>
  );
}

