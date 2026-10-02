async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text || res.statusText };
  }
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.details = data?.details;
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  health: () => request("/api/health"),
  stats: () => request("/api/catalog/stats"),
  countries: (source) => request(`/api/catalog/countries${source ? `?source=${source}` : ""}`),
  localIndicators: () => request("/api/catalog/indicators"),
  defaults: () => request("/api/imports/defaults"),
  jobs: () => request("/api/imports"),
  job: (id) => request(`/api/imports/${id}`),
  startImport: (body) => request("/api/imports", { method: "POST", body: JSON.stringify(body) }),
  cancelJob: (id) => request(`/api/imports/${id}/cancel`, { method: "POST" }),
  compare: (q) => request(`/api/analytics/compare?${q}`),
  trends: (q) => request(`/api/analytics/trends?${q}`),
  rankings: (q) => request(`/api/analytics/rankings?${q}`),
};
