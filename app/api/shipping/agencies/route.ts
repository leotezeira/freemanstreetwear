import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

type RawAgency = {
  provincia?: string;
  codigo_suc?: string;
  localidad?: string;
  calle?: string;
  numero?: string;
  cpa?: string;
};

type Agency = {
  province: string;
  locality: string;
  agencyCode: string;
  description: string;
  address: string;
  cpa: string;
};

type AgenciesIndex = {
  provinces: string[];
  localitiesByProvince: Map<string, string[]>;
  agenciesByProvinceAndLocality: Map<string, Map<string, Agency[]>>;
};

const CACHE_TTL_MS = 5 * 60_000;

let agenciesCache: Agency[] | null = null;
let agenciesIndexCache: AgenciesIndex | null = null;
let cacheBuiltAtMs = 0;

const PROVINCE_ALIASES: Record<string, string> = {
  C: "CABA",
  CABA: "CABA",
  "CAPITAL FEDERAL": "CABA",

  B: "Buenos Aires",
  BS: "Buenos Aires",
  "BUENOS AIRES": "Buenos Aires",
  "BUEONS AIRES": "Buenos Aires",

  K: "Catamarca",
  CATAMARCA: "Catamarca",

  X: "Córdoba",
  CORDOBA: "Córdoba",
  "CÓRDOBA": "Córdoba",

  W: "Corrientes",
  CORRIENTES: "Corrientes",

  H: "Chaco",
  CHACO: "Chaco",

  U: "Chubut",
  CHUBUT: "Chubut",

  E: "Entre Ríos",
  "ENTRE RIOS": "Entre Ríos",
  "ENTRE RÍOS": "Entre Ríos",

  P: "Formosa",
  FORMOSA: "Formosa",

  Y: "Jujuy",
  JUJUY: "Jujuy",

  L: "La Pampa",
  "LA PAMPA": "La Pampa",

  F: "La Rioja",
  "LA RIOJA": "La Rioja",

  M: "Mendoza",
  MENDOZA: "Mendoza",

  N: "Misiones",
  MISIONES: "Misiones",

  Q: "Neuquén",
  NEUQUEN: "Neuquén",
  "NEUQUÉN": "Neuquén",

  R: "Río Negro",
  "RIO NEGRO": "Río Negro",
  "RÍO NEGRO": "Río Negro",

  A: "Salta",
  SALTA: "Salta",

  J: "San Juan",
  "SAN JUAN": "San Juan",

  D: "San Luis",
  "SAN LUIS": "San Luis",

  Z: "Santa Cruz",
  "SANTA CRUZ": "Santa Cruz",

  S: "Santa Fe",
  "SANTA FE": "Santa Fe",

  G: "Santiago del Estero",
  "SANTIAGO DEL ESTERO": "Santiago del Estero",

  T: "Tucumán",
  TUCUMAN: "Tucumán",
  "TUCUMÁN": "Tucumán",

  V: "Tierra del Fuego",
  "TIERRA DEL FUEGO": "Tierra del Fuego",
};

function toText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeForMatch(value: string) {
  return value.trim().toLocaleUpperCase("es-AR");
}

function provinceLookupKey(value: string) {
  return normalizeForMatch(canonicalProvince(value));
}

function localityLookupKey(value: string) {
  return normalizeForMatch(toDisplayLabel(value));
}

function stripDiacritics(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeAliasKey(value: string) {
  return stripDiacritics(value)
    .toLocaleUpperCase("es-AR")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalProvince(value: string) {
  const key = normalizeAliasKey(value);
  return PROVINCE_ALIASES[key] ?? toDisplayLabel(value.trim());
}

function toDisplayLabel(value: string) {
  const raw = value.replace(/\s+/g, " ").trim();
  if (!raw) return "";

  const upper = normalizeAliasKey(raw);
  if (["CABA", "CPA", "BS"].includes(upper)) return upper;

  const words = stripDiacritics(raw)
    .toLocaleLowerCase("es-AR")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase("es-AR") + word.slice(1));

  return words.join(" ");
}

function parseRawAgenciesFile(raw: string): RawAgency[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const tryParse = (candidate: string): unknown => {
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  };

  const full = tryParse(trimmed);
  if (Array.isArray(full)) return full as RawAgency[];
  if (full && typeof full === "object" && Array.isArray((full as any).agencies)) {
    return (full as any).agencies as RawAgency[];
  }

  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return [];

  const arrayText = trimmed.slice(start, end + 1);
  const parsedArray = tryParse(arrayText);
  return Array.isArray(parsedArray) ? (parsedArray as RawAgency[]) : [];
}

function isCacheFresh() {
  return cacheBuiltAtMs > 0 && Date.now() - cacheBuiltAtMs < CACHE_TTL_MS;
}

function clearCaches() {
  agenciesCache = null;
  agenciesIndexCache = null;
  cacheBuiltAtMs = 0;
}

function ensureCacheFresh() {
  if (!isCacheFresh()) {
    clearCaches();
  }
}

function mapAgency(item: RawAgency): Agency | null {
  const province = canonicalProvince(toText(item.provincia));
  const locality = toDisplayLabel(toText(item.localidad));
  const agencyCode = toText(item.codigo_suc);
  const street = toDisplayLabel(toText(item.calle));
  const number = toText(item.numero);
  const cpa = toText(item.cpa);

  if (!province || !locality || !agencyCode) return null;

  const address = [street, number].filter(Boolean).join(" ").trim() || street || "Sin dirección";
  const description = `Sucursal ${agencyCode}`;

  return {
    province,
    locality,
    agencyCode,
    description,
    address,
    cpa,
  };
}

async function getAgenciesData(): Promise<Agency[]> {
  ensureCacheFresh();
  if (agenciesCache) return agenciesCache;

  const filePath = path.join(process.cwd(), "data", "correo-argentino-sucursales.json");
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = parseRawAgenciesFile(raw);
  agenciesCache = parsed.map(mapAgency).filter((a): a is Agency => a !== null);
  cacheBuiltAtMs = Date.now();
  return agenciesCache;
}

async function getAgenciesIndex(): Promise<AgenciesIndex> {
  ensureCacheFresh();
  if (agenciesIndexCache) return agenciesIndexCache;

  const allAgencies = await getAgenciesData();
  const localitiesByProvince = new Map<string, Set<string>>();
  const agenciesByProvinceAndLocality = new Map<string, Map<string, Agency[]>>();

  for (const agency of allAgencies) {
    const provinceKey = provinceLookupKey(agency.province);
    const localityKey = localityLookupKey(agency.locality);

    if (!localitiesByProvince.has(provinceKey)) {
      localitiesByProvince.set(provinceKey, new Set<string>());
    }
    localitiesByProvince.get(provinceKey)!.add(agency.locality);

    if (!agenciesByProvinceAndLocality.has(provinceKey)) {
      agenciesByProvinceAndLocality.set(provinceKey, new Map<string, Agency[]>());
    }

    const byLocality = agenciesByProvinceAndLocality.get(provinceKey)!;
    if (!byLocality.has(localityKey)) {
      byLocality.set(localityKey, []);
    }
    byLocality.get(localityKey)!.push(agency);
  }

  const provinces = Array.from(new Set(allAgencies.map((a) => a.province))).sort((a, b) =>
    a.localeCompare(b, "es-AR")
  );

  const localitiesSorted = new Map<string, string[]>();
  for (const [provinceKey, localitiesSet] of localitiesByProvince.entries()) {
    localitiesSorted.set(
      provinceKey,
      Array.from(localitiesSet).sort((a, b) => a.localeCompare(b, "es-AR"))
    );
  }

  for (const [, byLocality] of agenciesByProvinceAndLocality.entries()) {
    for (const [localityKey, list] of byLocality.entries()) {
      byLocality.set(
        localityKey,
        [...list].sort((a, b) => a.agencyCode.localeCompare(b.agencyCode, "es-AR"))
      );
    }
  }

  agenciesIndexCache = {
    provinces,
    localitiesByProvince: localitiesSorted,
    agenciesByProvinceAndLocality,
  };

  cacheBuiltAtMs = Date.now();

  return agenciesIndexCache;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const provinceQuery = toText(url.searchParams.get("province"));
    const localityQuery = toText(url.searchParams.get("locality"));

    const index = await getAgenciesIndex();
    const provinces = index.provinces;

    if (!provinceQuery) {
      return NextResponse.json({ provinces, localities: [], agencies: [] });
    }

    const provinceKey = provinceLookupKey(provinceQuery);
    const localities = index.localitiesByProvince.get(provinceKey) ?? [];

    if (!localityQuery) {
      return NextResponse.json({ provinces, localities, agencies: [] });
    }

    const localityKey = localityLookupKey(localityQuery);
    const agencies =
      index.agenciesByProvinceAndLocality.get(provinceKey)?.get(localityKey) ?? [];

    return NextResponse.json({ provinces, localities, agencies });
  } catch (error) {
    console.error("[api:shipping:agencies:local]", error);
    return NextResponse.json(
      { error: "No se pudo cargar el listado de sucursales", provinces: [], localities: [], agencies: [] },
      { status: 500 }
    );
  }
}
