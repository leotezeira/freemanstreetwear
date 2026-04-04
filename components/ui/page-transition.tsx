"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [loaded, setLoaded] = useState(false);
  const [activePath, setActivePath] = useState(pathname);

  useEffect(() => {
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (activePath === pathname) return;

    setLoaded(false);
    const timeout = window.setTimeout(() => {
      setActivePath(pathname);
      setLoaded(true);
    }, 60);

    return () => window.clearTimeout(timeout);
  }, [pathname, activePath]);

  return (
    <div className={`page ${loaded ? "loaded" : ""}`} key={activePath}>
      {children}
    </div>
  );
}

