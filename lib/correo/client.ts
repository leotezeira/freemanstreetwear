import "server-only";

type CorreoConfig = {
  user: string;
  password: string;
  customerId: string;
  apiBase: string;
};

type TokenState = {
  token: string;
  expiresAtMs: number;
};

type TokenResponse = {
  access_token?: string;
  token?: string;
  jwt?: string;
  expires_in?: number;
  expiresIn?: number;
  exp?: number;
};

const DEFAULT_API_BASE = "https://api.correoargentino.com.ar/micorreo/v1";
const TOKEN_SKEW_MS = 60_000;

let tokenState: TokenState | null = null;
let tokenPromise: Promise<string> | null = null;

const inFlight = new Map<string, Promise<unknown>>();

type CacheEntry<T> = { value: T; expiresAtMs: number };
const ratesCache = new Map<string, CacheEntry<unknown>>();
const RATES_CACHE_TTL_MS = 10 * 60_000;

function getConfig(): CorreoConfig {
  const user = process.env.CORREO_USER;
  const password = process.env.CORREO_PASSWORD;
  const customerId = process.env.CORREO_CUSTOMER_ID;
  const apiBase = process.env.CORREO_API_BASE || DEFAULT_API_BASE;

  if (!user) throw new Error("CORREO_USER is not configured");
  if (!password) throw new Error("CORREO_PASSWORD is not configured");
  if (!customerId) throw new Error("CORREO_CUSTOMER_ID is not configured");

  return { user, password, customerId, apiBase };
}

function basicAuthHeader(user: string, password: string) {
  const raw = `${user}:${password}`;
  const encoded = Buffer.from(raw, "utf8").toString("base64");
  return `Basic ${encoded}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRefreshToken(state: TokenState) {
  return Date.now() + TOKEN_SKEW_MS >= state.expiresAtMs;
}

function coalesceToken(resp: TokenResponse): { token: string; expiresAtMs: number } {
  const token = resp.access_token ?? resp.token ?? resp.jwt;
  if (!token) {
    throw new Error("Correo token response did not include a token");
  }

  const expiresIn = resp.expires_in ?? resp.expiresIn;
  if (typeof expiresIn === "number" && Number.isFinite(expiresIn) && expiresIn > 0) {
    return { token, expiresAtMs: Date.now() + expiresIn * 1000 };
  }

  if (typeof resp.exp === "number" && Number.isFinite(resp.exp) && resp.exp > 0) {
    return { token, expiresAtMs: resp.exp * 1000 };
  }

  // Conservative default: 10 minutes
  return { token, expiresAtMs: Date.now() + 10 * 60_000 };
}

async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  opts: { maxRetries: number; retryOn401?: boolean; requestKey?: string }
): Promise<Response> {
  const maxRetries = Math.max(0, opts.maxRetries);

  let attempt = 0;
  let lastResponse: Response | null = null;

  while (attempt <= maxRetries) {
    const response = await fetch(input, init);
    lastResponse = response;

    if (response.status !== 429) {
      return response;
    }

    const retryAfter = response.headers.get("retry-after");
    const retryAfterMs = retryAfter ? Number(retryAfter) * 1000 : NaN;

    const base = 250;
    const backoff = Math.min(4_000, base * 2 ** attempt);
    const jitter = Math.round(Math.random() * 120);
    const delay = Number.isFinite(retryAfterMs) && retryAfterMs > 0 ? retryAfterMs : backoff + jitter;

    if (process.env.DEBUG_CORREO === "true") {
      console.log("[correo] 429 retry", { attempt, delay, url: String(input) });
    }

    await sleep(delay);
    attempt += 1;
  }

  return lastResponse!;
}

async function tokenRequest(config: CorreoConfig): Promise<TokenState> {
  const url = `${config.apiBase.replace(/\/$/, "")}/token`;

  const response = await fetchWithRetry(
    url,
    {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(config.user, config.password),
        "content-type": "application/json",
      },
      body: JSON.stringify({ customerId: config.customerId }),
      cache: "no-store",
    },
    { maxRetries: 5 }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Correo token request failed (${response.status}): ${body || response.statusText}`);
  }

  const json = (await response.json().catch(() => null)) as TokenResponse | null;
  if (!json) {
    throw new Error("Correo token request returned invalid JSON");
  }

  const next = coalesceToken(json);
  return { token: next.token, expiresAtMs: next.expiresAtMs };
}

export async function getToken(): Promise<string> {
  const config = getConfig();

  if (tokenState && !shouldRefreshToken(tokenState)) {
    return tokenState.token;
  }

  if (tokenPromise) {
    return tokenPromise;
  }

  tokenPromise = (async () => {
    const next = await tokenRequest(config);
    tokenState = next;
    return next.token;
  })();

  try {
    return await tokenPromise;
  } finally {
    tokenPromise = null;
  }
}

async function correoJson<T = unknown>(
  path: string,
  init: Omit<RequestInit, "headers"> & { headers?: Record<string, string> },
  opts?: { maxRetries?: number; dedupeKey?: string; allowCache?: boolean }
): Promise<T> {
  const config = getConfig();
  const url = `${config.apiBase.replace(/\/$/, "")}${path.startsWith("/") ? "" : "/"}${path}`;

  const maxRetries = opts?.maxRetries ?? 5;
  const dedupeKey = opts?.dedupeKey;

  const run = async () => {
    let token = await getToken();

    const doRequest = async () =>
      fetchWithRetry(
        url,
        {
          ...init,
          headers: {
            ...(init.headers ?? {}),
            Authorization: `Bearer ${token}`,
            ...(init.body ? { "content-type": "application/json" } : {}),
            accept: "application/json",
          },
          cache: "no-store",
        },
        { maxRetries }
      );

    let response = await doRequest();

    if (response.status === 401) {
      // Refresh token once, then retry.
      tokenState = null;
      token = await getToken();
      response = await doRequest();
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      const safe = text && text.length > 10_000 ? text.slice(0, 10_000) : text;
      throw new Error(`Correo API error (${response.status}) on ${path}: ${safe || response.statusText}`);
    }

    const json = (await response.json().catch(() => null)) as T | null;
    if (json === null) {
      throw new Error(`Correo API returned invalid JSON on ${path}`);
    }

    return json;
  };

  if (!dedupeKey) {
    return run();
  }

  const existing = inFlight.get(dedupeKey);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = run();
  inFlight.set(dedupeKey, promise as Promise<unknown>);
  try {
    return await promise;
  } finally {
    inFlight.delete(dedupeKey);
  }
}

export async function getRates(payload: unknown): Promise<unknown> {
  const key = JSON.stringify(payload);
  const cached = ratesCache.get(key);
  if (cached && Date.now() < cached.expiresAtMs) {
    return cached.value;
  }

  const dedupeKey = `rates:${key}`;
  const result = await correoJson("/rates", { method: "POST", body: JSON.stringify(payload) }, { dedupeKey });

  ratesCache.set(key, { value: result, expiresAtMs: Date.now() + RATES_CACHE_TTL_MS });
  return result;
}

export async function getAgencies(query: Record<string, string>): Promise<unknown> {
  const search = new URLSearchParams(query);
  const key = `agencies:${search.toString()}`;
  return correoJson(`/agencies?${search.toString()}`, { method: "GET" }, { dedupeKey: key });
}

export async function importShipment(payload: unknown): Promise<unknown> {
  const key = `import:${JSON.stringify(payload)}`;
  return correoJson("/import", { method: "POST", body: JSON.stringify(payload) }, { dedupeKey: key });
}

export async function getTracking(query: Record<string, string>): Promise<unknown> {
  const search = new URLSearchParams(query);
  const key = `tracking:${search.toString()}`;
  return correoJson(`/tracking?${search.toString()}`, { method: "GET" }, { dedupeKey: key });
}
