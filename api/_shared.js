/**
 * Shared AI utilities for all Vercel API functions.
 * Supports OpenAI (GPT-4o, GPT-4o-mini) and Anthropic (Claude Haiku, Claude Sonnet).
 * Auto-falls back to the other provider if the primary fails or is unconfigured.
 */
import OpenAI    from "openai";
import Anthropic from "@anthropic-ai/sdk";

// ── API clients ─────────────────────────────────────────────────────────────
const OPENAI_KEY    = (process.env.OPENAI_API_KEY    || "").trim();
const ANTHROPIC_KEY = (process.env.ANTHROPIC_API_KEY || "").trim();

const openaiClient    = OPENAI_KEY.startsWith("sk-")       ? new OpenAI({ apiKey: OPENAI_KEY })        : null;
const anthropicClient = ANTHROPIC_KEY.startsWith("sk-ant") ? new Anthropic({ apiKey: ANTHROPIC_KEY })  : null;

if (!openaiClient && !anthropicClient) {
  console.error("No AI provider configured — add OPENAI_API_KEY or ANTHROPIC_API_KEY in Vercel Settings → Environment Variables");
}

// ── Model ID map ─────────────────────────────────────────────────────────────
const MODEL_IDS = {
  "gpt-4o-mini":    "gpt-4o-mini",
  "gpt-4o":         "gpt-4o",
  "claude-haiku":   "claude-haiku-4-5-20251001",
  "claude-sonnet":  "claude-sonnet-4-6",
};

function isClaudeModel(model) {
  return model && (model.startsWith("claude") || model === "claude-haiku" || model === "claude-sonnet");
}

// ── Provider calls ────────────────────────────────────────────────────────────
async function callOpenAI(modelKey, system, user, maxTokens) {
  if (!openaiClient) throw new Error("OpenAI API key not configured (OPENAI_API_KEY)");
  const res = await openaiClient.chat.completions.create({
    model: MODEL_IDS[modelKey] || "gpt-4o-mini",
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      { role: "user",   content: user   },
    ],
  });
  return res.choices[0]?.message?.content || "";
}

async function callAnthropic(modelKey, system, user, maxTokens) {
  if (!anthropicClient) throw new Error("Anthropic API key not configured (ANTHROPIC_API_KEY)");
  const res = await anthropicClient.messages.create({
    model: MODEL_IDS[modelKey] || "claude-haiku-4-5-20251001",
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });
  return res.content[0]?.text || "";
}

// ── Main AI call with auto-fallback ──────────────────────────────────────────
export async function ai(system, user, maxTokens = 4000, model = "gpt-4o-mini") {
  const useAnthropic = isClaudeModel(model);

  // Primary attempt
  try {
    if (useAnthropic) {
      return await callAnthropic(model, system, user, maxTokens);
    } else {
      return await callOpenAI(model, system, user, maxTokens);
    }
  } catch (primaryErr) {
    console.warn(`[ai] ${model} failed: ${primaryErr.message} — trying fallback`);
  }

  // Fallback to the other provider
  try {
    if (useAnthropic) {
      return await callOpenAI("gpt-4o-mini", system, user, maxTokens);
    } else {
      return await callAnthropic("claude-haiku", system, user, maxTokens);
    }
  } catch (fallbackErr) {
    throw new Error(
      `Both AI providers failed. ` +
      `Make sure at least one of OPENAI_API_KEY or ANTHROPIC_API_KEY is set in Vercel → Settings → Environment Variables.`
    );
  }
}

// ── JSON extractor ────────────────────────────────────────────────────────────
export function extractJSON(text) {
  const clean = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
  const start = clean.search(/[{[]/);
  if (start === -1) return null;
  try { return JSON.parse(clean.slice(start)); } catch { return null; }
}

// ── CORS headers ──────────────────────────────────────────────────────────────
export function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// ── Real job APIs ─────────────────────────────────────────────────────────────
const JSEARCH_KEY = (process.env.JSEARCH_KEY    || "").trim();
const ADZUNA_ID   = (process.env.ADZUNA_APP_ID  || "").trim();
const ADZUNA_KEY  = (process.env.ADZUNA_APP_KEY || "").trim();

export async function fetchJSearch(query, type = "intern") {
  if (!JSEARCH_KEY || JSEARCH_KEY.length < 10) return [];
  try {
    const q = encodeURIComponent(`${query} ${type}`);
    const res = await fetch(
      `https://jsearch.p.rapidapi.com/search?query=${q}&num_pages=2&date_posted=month`,
      { headers: { "x-rapidapi-host": "jsearch.p.rapidapi.com", "x-rapidapi-key": JSEARCH_KEY } }
    );
    const data = await res.json();
    return (data.data || []).slice(0, 10).map(j => ({
      id: j.job_id || `js-${Date.now()}`,
      title: j.job_title,
      company: j.employer_name,
      location: [j.job_city, j.job_state || j.job_country].filter(Boolean).join(", "),
      apply_url: j.job_apply_link,
      remote: !!j.job_is_remote,
      deadline: j.job_offer_expiration_datetime_utc?.split("T")[0] || "Rolling",
      employment_type: type,
      source: "JSearch",
    }));
  } catch (e) { console.error("JSearch:", e.message); return []; }
}

export async function fetchAdzuna(keywords, country = "us", type = "internship") {
  if (!ADZUNA_ID || !ADZUNA_KEY) return [];
  try {
    const params = new URLSearchParams({
      app_id: ADZUNA_ID, app_key: ADZUNA_KEY,
      results_per_page: 10, what: keywords, sort_by: "date",
    });
    const res = await fetch(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`);
    const data = await res.json();
    return (data.results || []).slice(0, 10).map(j => ({
      id: j.id || `az-${Date.now()}`,
      title: j.title,
      company: j.company?.display_name || "",
      location: j.location?.display_name || country.toUpperCase(),
      apply_url: j.redirect_url,
      salary: j.salary_min
        ? `$${Math.round(j.salary_min / 1000)}k–$${Math.round((j.salary_max || j.salary_min * 1.3) / 1000)}k`
        : null,
      employment_type: type,
      source: "Adzuna",
    }));
  } catch (e) { console.error("Adzuna:", e.message); return []; }
}

export async function fetchUSAJobs(keywords) {
  try {
    const params = new URLSearchParams({ Keyword: keywords, ResultsPerPage: 8 });
    const res = await fetch(
      `https://data.usajobs.gov/api/search?${params}`,
      { headers: { "Host": "data.usajobs.gov", "User-Agent": "career-intel@iftedinar.github.io" } }
    );
    const data = await res.json();
    return (data.SearchResult?.SearchResultItems || []).slice(0, 6).map(item => {
      const j = item.MatchedObjectDescriptor;
      return {
        id: `usa-${j.PositionID}`,
        title: j.PositionTitle,
        company: j.OrganizationName,
        location: j.PositionLocation?.[0]?.LocationName || "USA",
        apply_url: j.ApplyURI?.[0] || "https://usajobs.gov",
        salary: j.PositionRemuneration?.[0]
          ? `$${Math.round(j.PositionRemuneration[0].MinimumRange / 1000)}k–$${Math.round(j.PositionRemuneration[0].MaximumRange / 1000)}k`
          : null,
        deadline: j.ApplicationCloseDate?.split("T")[0] || "Rolling",
        employment_type: "Full-time",
        visa_friendly: true,
        source: "USAJobs",
      };
    });
  } catch (e) { console.error("USAJobs:", e.message); return []; }
}
