/**
 * GET /api/health
 * Returns server status and which integrations are configured.
 * Open this URL in your browser to verify your deployment.
 */
import { setCors } from "./_shared.js";

export default function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const OPENAI_KEY  = (process.env.OPENAI_API_KEY  || "").trim();
  const JSEARCH_KEY = (process.env.JSEARCH_KEY      || "").trim();
  const ADZUNA_ID   = (process.env.ADZUNA_APP_ID    || "").trim();
  const SB_URL      = (process.env.SUPABASE_URL     || "").trim();

  res.json({
    status:   "ok",
    version:  "v7-vercel",
    platform: "Vercel Serverless",
    openai:   OPENAI_KEY.startsWith("sk-") ? "✓ configured" : "✗ MISSING — add OPENAI_API_KEY in Vercel settings",
    jsearch:  JSEARCH_KEY.length > 10      ? "✓ configured" : "not set (optional)",
    adzuna:   ADZUNA_ID.length > 0         ? "✓ configured" : "not set (optional)",
    supabase: SB_URL.length > 0            ? "✓ configured" : "not set (optional)",
    time:     new Date().toISOString(),
  });
}
