/**
 * Frontend API client.
 * All calls go to /api/* — Vercel routes them to serverless functions.
 * No Railway, no separate server.
 */

async function request(path, body, isForm = false) {
  const opts = { method: "POST" };
  if (isForm) {
    opts.body = body;
  } else {
    opts.headers = { "Content-Type": "application/json" };
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`/api${path}`, opts);
  const json = await res.json().catch(() => ({ error: "Bad response from server" }));
  if (!res.ok) throw new Error(json.error || `Server error ${res.status}`);
  return json;
}

export const api = {
  parse: (files) => {
    const form = new FormData();
    files.forEach(f => form.append("files", f));
    return request("/parse", form, true);
  },
  opportunities: (profile, filters) =>
    request("/opportunities", { profile, filters }),
  message: (profile, target, type) =>
    request("/message", { profile, target, type }),
};
