"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Option = { label: string; value: string };

type ListFiltersProps = {
  searchPlaceholder?: string;
  searchParam?: string;
  filters?: Array<{ label: string; param: string; options: Option[] }>;
};

function updateParams(url: URL, updates: Record<string, string | null>) {
  for (const [key, value] of Object.entries(updates)) {
    if (!value) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  url.searchParams.delete("page");
  return url;
}

export function ListFilters({
  searchPlaceholder = "Buscar...",
  searchParam = "q",
  filters = [],
}: ListFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [query, setQuery] = useState(params.get(searchParam) ?? "");

  const filterValues = useMemo(() => {
    const values: Record<string, string> = {};
    for (const f of filters) values[f.param] = params.get(f.param) ?? "";
    return values;
  }, [filters, params]);

  useEffect(() => {
    setQuery(params.get(searchParam) ?? "");
  }, [params, searchParam]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const url = new URL(window.location.href);
      updateParams(url, { [searchParam]: query.trim() || null });
      router.replace(`${pathname}?${url.searchParams.toString()}`);
    }, 250);

    return () => window.clearTimeout(handle);
  }, [query, pathname, router, searchParam]);

  return (
    <div className="card-base">
      <div className="grid gap-3 md:grid-cols-4">
        <div className={filters.length ? "md:col-span-2" : "md:col-span-4"}>
          <input
            className="input-base"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {filters.map((f) => (
          <div key={f.param}>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {f.label}
            </label>
            <select
              className="input-base"
              value={filterValues[f.param]}
              onChange={(e) => {
                const url = new URL(window.location.href);
                updateParams(url, { [f.param]: e.target.value || null });
                router.replace(`${pathname}?${url.searchParams.toString()}`);
              }}
            >
              {f.options.map((opt) => (
                <option key={`${f.param}-${opt.value}`} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
