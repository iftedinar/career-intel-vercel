/**
 * Frontend API client — all calls go to /api/* Vercel serverless functions.
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
  const json = await res.json().catch(() => ({ error: "Bad response from server — the request may have timed out. Try again." }));
  if (!res.ok) throw new Error(json.error || `Server error ${res.status}`);
  return json;
}

export const api = {
  parse: (files, model = "gpt-4o-mini") => {
    const form = new FormData();
    files.forEach(f => form.append("files", f));
    form.append("model", model);
    return request("/parse", form, true);
  },
  opportunities: (profile, filters, model = "gpt-4o-mini") =>
    request("/opportunities", { profile, filters, model }),
  message: (profile, target, type, model = "gpt-4o-mini") =>
    request("/message", { profile, target, type, model }),
};
