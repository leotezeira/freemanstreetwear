import { NextResponse } from "next/server";
import { ProvinceCode } from "ylazzari-correoargentino/enums";
import { getCorreoAgencies } from "@/lib/correo";

const PROVINCE_QUERY_MAP: Record<string, ProvinceCode> = {
  c: ProvinceCode.C,
  "02": ProvinceCode.C,
  "capital federal": ProvinceCode.C,
  "caba": ProvinceCode.C,
  b: ProvinceCode.B,
  "06": ProvinceCode.B,
  "buenos aires": ProvinceCode.B,
  k: ProvinceCode.K,
  "10": ProvinceCode.K,
  catamarca: ProvinceCode.K,
  h: ProvinceCode.H,
  "14": ProvinceCode.H,
  chaco: ProvinceCode.H,
  u: ProvinceCode.U,
  "18": ProvinceCode.U,
  chubut: ProvinceCode.U,
  x: ProvinceCode.X,
  "22": ProvinceCode.X,
  cordoba: ProvinceCode.X,
  w: ProvinceCode.W,
  "26": ProvinceCode.W,
  corrientes: ProvinceCode.W,
  e: ProvinceCode.E,
  "30": ProvinceCode.E,
  "entre rios": ProvinceCode.E,
  p: ProvinceCode.P,
  "34": ProvinceCode.P,
  formosa: ProvinceCode.P,
  y: ProvinceCode.Y,
  "38": ProvinceCode.Y,
  jujuy: ProvinceCode.Y,
  l: ProvinceCode.L,
  "42": ProvinceCode.L,
  "la pampa": ProvinceCode.L,
  f: ProvinceCode.F,
  "46": ProvinceCode.F,
  "la rioja": ProvinceCode.F,
  m: ProvinceCode.M,
  "50": ProvinceCode.M,
  mendoza: ProvinceCode.M,
  n: ProvinceCode.N,
  "54": ProvinceCode.N,
  misiones: ProvinceCode.N,
  q: ProvinceCode.Q,
  "58": ProvinceCode.Q,
  neuquen: ProvinceCode.Q,
  r: ProvinceCode.R,
  "62": ProvinceCode.R,
  "rio negro": ProvinceCode.R,
  a: ProvinceCode.A,
  "66": ProvinceCode.A,
  salta: ProvinceCode.A,
  j: ProvinceCode.J,
  "70": ProvinceCode.J,
  "san juan": ProvinceCode.J,
  d: ProvinceCode.D,
  "74": ProvinceCode.D,
  "san luis": ProvinceCode.D,
  z: ProvinceCode.Z,
  "78": ProvinceCode.Z,
  "santa cruz": ProvinceCode.Z,
  s: ProvinceCode.S,
  "82": ProvinceCode.S,
  "santa fe": ProvinceCode.S,
  g: ProvinceCode.G,
  "86": ProvinceCode.G,
  "santiago del estero": ProvinceCode.G,
  v: ProvinceCode.V,
  "90": ProvinceCode.V,
  "tierra del fuego": ProvinceCode.V,
  t: ProvinceCode.T,
  "94": ProvinceCode.T,
  tucuman: ProvinceCode.T,
};

function parseProvinceCode(value: string | null): ProvinceCode | undefined {
  if (!value) return undefined;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;

  const upperValue = normalized.toUpperCase();
  const enumValues = new Set(Object.values(ProvinceCode));

  if (enumValues.has(upperValue as ProvinceCode)) {
    return upperValue as ProvinceCode;
  }

  return PROVINCE_QUERY_MAP[normalized];
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const provinceParam = url.searchParams.get("province") ?? url.searchParams.get("provinceCode");
    const provinceCode = parseProvinceCode(provinceParam);
    const agencies = await getCorreoAgencies(provinceCode);

    return NextResponse.json({ agencies });
  } catch (error) {
    console.error("[api:shipping:agencies]", error);
    return NextResponse.json({ agencies: [] });
  }
}
