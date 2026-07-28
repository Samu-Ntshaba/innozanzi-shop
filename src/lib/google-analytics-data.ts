import { createSign } from "node:crypto";

type ServiceAccount = { client_email: string; private_key: string };
type ApiCell = { value?: string };
type ApiRow = { dimensionValues?: ApiCell[]; metricValues?: ApiCell[] };
type ApiResponse = {
  dimensionHeaders?: { name: string }[];
  metricHeaders?: { name: string }[];
  rows?: ApiRow[];
  totals?: ApiRow[];
};

export type AnalyticsTable = {
  dimensions: string[];
  metrics: string[];
  rows: { dimensions: string[]; metrics: number[] }[];
  totals: number[];
};

let tokenCache: { value: string; expiresAt: number } | undefined;

function credentials(): ServiceAccount | null {
  const packed = process.env.GOOGLE_ANALYTICS_CREDENTIALS_JSON;
  if (packed) {
    try {
      const parsed = JSON.parse(packed) as Partial<ServiceAccount>;
      if (parsed.client_email && parsed.private_key) return { client_email: parsed.client_email, private_key: parsed.private_key.replace(/\\n/g, "\n") };
    } catch {
      return null;
    }
  }
  const client_email = process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL;
  const private_key = process.env.GOOGLE_ANALYTICS_PRIVATE_KEY?.replace(/\\n/g, "\n");
  return client_email && private_key ? { client_email, private_key } : null;
}

export function googleAnalyticsConfiguration() {
  const propertyId = process.env.GA4_PROPERTY_ID?.replace(/^properties\//, "").trim() ?? "";
  const hasCredentials = Boolean(credentials());
  return { propertyId, hasCredentials, configured: /^\d+$/.test(propertyId) && hasCredentials };
}

async function accessToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.value;
  const account = credentials();
  if (!account) throw new Error("Google Analytics credentials are not configured.");
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${signer.sign(account.private_key, "base64url")}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Google authentication failed (${response.status}).`);
  const data = await response.json() as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("Google authentication returned no access token.");
  tokenCache = { value: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return tokenCache.value;
}

function normalise(response: ApiResponse): AnalyticsTable {
  return {
    dimensions: response.dimensionHeaders?.map(header => header.name) ?? [],
    metrics: response.metricHeaders?.map(header => header.name) ?? [],
    rows: (response.rows ?? []).map(row => ({
      dimensions: row.dimensionValues?.map(value => value.value ?? "") ?? [],
      metrics: row.metricValues?.map(value => Number(value.value ?? 0)) ?? [],
    })),
    totals: response.totals?.[0]?.metricValues?.map(value => Number(value.value ?? 0)) ?? [],
  };
}

async function report(path: "runReport" | "runRealtimeReport", body: object) {
  const { propertyId, configured } = googleAnalyticsConfiguration();
  if (!configured) throw new Error("Google Analytics reporting is not configured.");
  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${await accessToken()}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(detail?.error?.message ?? `Google Analytics report failed (${response.status}).`);
  }
  return normalise(await response.json() as ApiResponse);
}

export const realtimeOverview = () => report("runRealtimeReport", {
  metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }, { name: "eventCount" }],
  metricAggregations: ["TOTAL"],
});
export const realtimePages = () => report("runRealtimeReport", {
  dimensions: [{ name: "unifiedScreenName" }],
  metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
  orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
  limit: 15,
});
export const realtimeLocations = () => report("runRealtimeReport", {
  dimensions: [{ name: "country" }, { name: "city" }],
  metrics: [{ name: "activeUsers" }],
  orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
  limit: 10,
});
export const realtimeDevices = () => report("runRealtimeReport", {
  dimensions: [{ name: "deviceCategory" }],
  metrics: [{ name: "activeUsers" }],
  orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
});
export const recentSummary = () => report("runReport", {
  dateRanges: [{ startDate: "29daysAgo", endDate: "today" }],
  metrics: [{ name: "activeUsers" }, { name: "newUsers" }, { name: "sessions" }, { name: "screenPageViews" }],
  metricAggregations: ["TOTAL"],
});
export const recentPages = () => report("runReport", {
  dateRanges: [{ startDate: "29daysAgo", endDate: "today" }],
  dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
  metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
  orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
  limit: 15,
});
export const recentSources = () => report("runReport", {
  dateRanges: [{ startDate: "29daysAgo", endDate: "today" }],
  dimensions: [{ name: "sessionSourceMedium" }],
  metrics: [{ name: "sessions" }, { name: "activeUsers" }],
  orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
  limit: 10,
});
