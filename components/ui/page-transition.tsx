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
  const [hideOverlay, setHideOverlay] = useState(false);

  useEffect(() => {
    setHideOverlay(false);

    const timer = setTimeout(() => {
      setHideOverlay(true);
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [pathname]);

  return (
    <>
      <LoadingOverlay hide={hideOverlay} />
      <div className="page">
        {children}
      </div>
    </>
  );
}

