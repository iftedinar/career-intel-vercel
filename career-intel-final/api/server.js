/**
 * Career Intel — server.js v6
 * Uses OpenAI ONLY. Anthropic removed completely.
 *
 * Railway environment variables:
 *   OPENAI_API_KEY     REQUIRED  — platform.openai.com → API Keys
 *   JSEARCH_KEY        optional  — rapidapi.com → search "JSearch" → free plan
 *   ADZUNA_APP_ID      optional  — developer.adzuna.com → free
 *   ADZUNA_APP_KEY     optional  — developer.adzuna.com → free
 *   SUPABASE_URL       optional  — supabase.com → project → Settings → API
 *   SUPABASE_KEY       optional  — supabase.com → project → Settings → API (service_role key)
 */

import express from "express";
import multer from "multer";
import cors from "cors";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const upload = multer({ dest: "uploads/", limits: { fileSize: 15 * 1024 * 1024 } });

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "2mb" }));

// Serve built frontend
const distPath = path.join(__dirname, "..", "dist");
if (fs.existsSync(distPath)) app.use(express.static(distPath));

// ─── Keys & config ────────────────────────────────────────────────────────
const OPENAI_KEY  = (process.env.OPENAI_API_KEY  || "").trim();
const JSEARCH_KEY = (process.env.JSEARCH_KEY      || "").trim();
const ADZUNA_ID   = (process.env.ADZUNA_APP_ID    || "").trim();
const ADZUNA_KEY  = (process.env.ADZUNA_APP_KEY   || "").trim();
const SB_URL      = (process.env.SUPABASE_URL     || "").trim();
const SB_KEY      = (process.env.SUPABASE_KEY     || "").trim();

const HAS_OPENAI  = OPENAI_KEY.startsWith("sk-");
const HAS_JSEARCH = JSEARCH_KEY.length > 10;
const HAS_ADZUNA  = ADZUNA_ID.length > 0 && ADZUNA_KEY.length > 0;
const HAS_SB      = SB_URL.length > 0 && SB_KEY.length > 0;

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Career Intel v6
  OpenAI  : ${HAS_OPENAI  ? "✓ configured" : "✗ MISSING — add OPENAI_API_KEY"}
  JSearch : ${HAS_JSEARCH ? "✓ real listings" : "not set (optional)"}
  Adzuna  : ${HAS_ADZUNA  ? "✓ real listings" : "not set (optional)"}
  Supabase: ${HAS_SB      ? "✓ database ready" : "not set (optional)"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

// ─── OpenAI client ────────────────────────────────────────────────────────
if (!HAS_OPENAI) {
  console.error("FATAL: OPENAI_API_KEY not set or invalid. All AI calls will fail.");
}
const openai = HAS_OPENAI ? new OpenAI({ apiKey: OPENAI_KEY }) : null;

async function ai(system, user, maxTokens = 4000) {
  if (!openai) throw new Error("OPENAI_API_KEY is not configured in Railway. Go to Railway → your service → Variables and add OPENAI_API_KEY.");
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      { role: "user",   content: user },
    ],
  });
  return res.choices[0]?.message?.content || "";
}

// ─── Supabase (optional) ──────────────────────────────────────────────────
let supabase = null;
if (HAS_SB) {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    supabase = createClient(SB_URL, SB_KEY);
    console.log("Supabase connected");
  } catch (e) {
    console.warn("Supabase load failed:", e.message);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function readFile(file) {
  try {
    const raw = fs.readFileSync(file.path).toString("utf-8").replace(/[\x00-\x08\x0B-\x1F]/g, "");
    fs.unlinkSync(file.path);
    return { name: file.originalname, content: raw.slice(0, 12000) };
  } catch {
    try { fs.unlinkSync(file.path); } catch {}
    return { name: file.originalname, content: "" };
  }
}

function parseJSON(text) {
  const clean = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
  const start = clean.search(/[{[]/);
  if (start === -1) return null;
  try { return JSON.parse(clean.slice(start)); } catch { return null; }
}

// ─── Real job APIs ────────────────────────────────────────────────────────

async function fetchJSearch(query, type = "intern") {
  if (!HAS_JSEARCH) return [];
  try {
    const q = encodeURIComponent(`${query} ${type}`);
    const res = await fetch(
      `https://jsearch.p.rapidapi.com/search?query=${q}&num_pages=2&date_posted=month`,
      { headers: { "x-rapidapi-host": "jsearch.p.rapidapi.com", "x-rapidapi-key": JSEARCH_KEY } }
    );
    const data = await res.json();
    return (data.data || []).slice(0, 10).map(j => ({
      id: j.job_id || `js-${Math.random()}`,
      title: j.job_title,
      company: j.employer_name,
      location: [j.job_city, j.job_state || j.job_country].filter(Boolean).join(", "),
      apply_url: j.job_apply_link,
      remote: !!j.job_is_remote,
      deadline: j.job_offer_expiration_datetime_utc?.split("T")[0] || "Rolling",
      employment_type: j.job_employment_type || type,
      description: (j.job_description || "").slice(0, 300),
      source: "JSearch",
    }));
  } catch (e) { console.error("JSearch error:", e.message); return []; }
}

async function fetchAdzuna(keywords, country = "us", type = "internship") {
  if (!HAS_ADZUNA) return [];
  try {
    const params = new URLSearchParams({
      app_id: ADZUNA_ID, app_key: ADZUNA_KEY,
      results_per_page: 10, what: keywords, sort_by: "date",
    });
    const res = await fetch(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`);
    const data = await res.json();
    return (data.results || []).slice(0, 10).map(j => ({
      id: j.id || `az-${Math.random()}`,
      title: j.title,
      company: j.company?.display_name || "",
      location: j.location?.display_name || country.toUpperCase(),
      apply_url: j.redirect_url,
      salary: j.salary_min ? `$${Math.round(j.salary_min/1000)}k–$${Math.round((j.salary_max||j.salary_min*1.3)/1000)}k` : null,
      employment_type: type,
      source: "Adzuna",
    }));
  } catch (e) { console.error("Adzuna error:", e.message); return []; }
}

// USAJobs — free federal government jobs API
async function fetchUSAJobs(keywords, location = "") {
  try {
    const params = new URLSearchParams({ Keyword: keywords, LocationName: location, ResultsPerPage: 8 });
    const res = await fetch(
      `https://data.usajobs.gov/api/search?${params}`,
      { headers: { "Authorization-Key": "pkH1lpVRBWmK8MzEKOnN1/P9N2kKNFV7L4y07mT/GKE=", "Host": "data.usajobs.gov" } }
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
        salary: j.PositionRemuneration?.[0] ? `$${Math.round(j.PositionRemuneration[0].MinimumRange/1000)}k–$${Math.round(j.PositionRemuneration[0].MaximumRange/1000)}k` : null,
        deadline: j.ApplicationCloseDate?.split("T")[0] || "Rolling",
        employment_type: "Full-time",
        visa_friendly: true,
        source: "USAJobs",
      };
    });
  } catch (e) { console.error("USAJobs error:", e.message); return []; }
}

// ─── Routes ───────────────────────────────────────────────────────────────

// POST /api/parse
app.post("/api/parse", upload.array("files", 10), async (req, res) => {
  try {
    const docs = req.files.map(readFile).filter(d => d.content.length > 20);
    if (!docs.length) return res.status(400).json({ error: "No readable content. Make sure your PDF has selectable text." });

    const raw = await ai(
      "You are a resume parser. Return valid JSON only. No markdown, no text outside the JSON.",
      `Extract a complete career profile from these documents:

${docs.map(d => `=== ${d.name} ===\n${d.content}`).join("\n\n")}

Return this exact JSON (fill from documents, no placeholders):
{
  "name": "Full Name",
  "email": "email@domain.com",
  "phone": "number if present",
  "location": "City, State",
  "linkedin": "url if present",
  "portfolio": "url if present",
  "university": "University Name",
  "graduation": "Month Year",
  "gpa": 3.78,
  "majors": ["Major 1", "Major 2"],
  "minors": [],
  "visa_status": "international_student",
  "work_auth": "CPT eligible",
  "skills": {
    "technical": ["Python", "SQL"],
    "tools": ["Power BI", "Tableau", "Excel"],
    "platforms": ["Workday", "Oracle", "PeopleSoft"],
    "soft": ["Leadership", "Communication"]
  },
  "experience": [
    { "title": "Role", "company": "Company", "location": "City, ST", "start": "Jun 2025", "end": "Aug 2025", "type": "internship", "highlights": ["achievement 1"] }
  ],
  "certifications": [
    { "name": "Cert Name", "issuer": "LinkedIn Learning", "date": "Nov 2025", "cpe": 2.6 }
  ],
  "education_details": { "honors": "Dean's List", "clubs": ["Gamma Iota Sigma"] },
  "interests": ["fintech", "data analytics", "ERP systems"],
  "strengths": ["Rare ERP experience at undergrad level", "Dual major Finance + Data Analytics"],
  "target_roles": ["Data Analyst", "Finance Analyst", "Business Intelligence Analyst"],
  "target_locations": ["Springfield MO", "Kansas City", "Remote"],
  "summary": "Two-sentence professional summary of this specific candidate."
}`,
      2500
    );

    const profile = parseJSON(raw);
    if (!profile) return res.status(422).json({ error: "Could not parse profile. Try a text-based PDF (open PDF → can you select text? If yes, it will work)." });

    // Save to Supabase if configured
    if (supabase && req.body.userId) {
      await supabase.from("profiles").upsert({ user_id: req.body.userId, profile_data: profile, updated_at: new Date().toISOString() }).catch(console.warn);
    }

    res.json({ profile });
  } catch (err) {
    console.error("/api/parse:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/opportunities
app.post("/api/opportunities", async (req, res) => {
  try {
    const { profile, filters = {}, userId } = req.body;
    if (!profile) return res.status(400).json({ error: "Profile required." });

    const today = new Date().toISOString().split("T")[0];
    const { visaFriendly = true, location = "both", remote = false, jobTypes = ["internship", "fulltime"] } = filters;

    const wantIntern   = jobTypes.includes("internship");
    const wantFulltime = jobTypes.includes("fulltime");
    const skillQ  = [...(profile.skills?.technical||[]), ...(profile.skills?.tools||[])].slice(0,3).join(" ");
    const roleQ   = profile.target_roles?.[0] || profile.majors?.[0] || "data analytics finance";

    // Fetch real listings in parallel
    const [jsIntern, jsFull, azIntern, azFull, usaJobs] = await Promise.all([
      wantIntern   ? fetchJSearch(`${skillQ} ${roleQ}`, "intern")    : [],
      wantFulltime ? fetchJSearch(`${skillQ} ${roleQ}`, "full time") : [],
      wantIntern   ? fetchAdzuna(`${roleQ} intern`, location === "international" ? "ca" : "us", "internship") : [],
      wantFulltime ? fetchAdzuna(roleQ, location === "international" ? "ca" : "us", "full-time") : [],
      wantFulltime ? fetchUSAJobs(roleQ, profile.target_locations?.[0] || "") : [],
    ]);

    const realInternships = [...jsIntern, ...azIntern];
    const realFulltime    = [...jsFull,   ...azFull, ...usaJobs];
    const allReal = [...realInternships, ...realFulltime];

    const realBlock = allReal.length > 0
      ? `\nVERIFIED LIVE JOB LISTINGS (use exact title/company/apply_url from these):\n${JSON.stringify(allReal, null, 2)}\n`
      : "";

    const raw = await ai(
      "You are a career intelligence AI. Return valid JSON only. No markdown fences, no text outside the JSON object.",
      `Find the best opportunities for this candidate. Today: ${today}.

CANDIDATE:
Name: ${profile.name} | University: ${profile.university} | GPA: ${profile.gpa}
Graduating: ${profile.graduation} | Visa: ${profile.visa_status} | Auth: ${profile.work_auth}
Majors: ${profile.majors?.join(", ")} | Location: ${profile.location}
Technical: ${profile.skills?.technical?.join(", ")}
Tools: ${profile.skills?.tools?.join(", ")}
Platforms: ${profile.skills?.platforms?.join(", ")}
Certs: ${profile.certifications?.map(c=>c.name).join(", ")||"none"}
Interests: ${profile.interests?.join(", ")}
Strengths: ${profile.strengths?.join("; ")}
Target roles: ${profile.target_roles?.join(", ")||"open"}
Target locations: ${profile.target_locations?.join(", ")||"open"}
Portfolio: ${profile.portfolio||"none"}
${realBlock}

FILTERS: visa_friendly=${visaFriendly}, location=${location}, remote=${remote}, job_types=${jobTypes.join(",")}

Return ONE JSON object:
{
  "generated_at": "${today}",
  "internships": [
    {
      "id": "slug",
      "title": "Exact Title",
      "company": "Company Name",
      "location": "City, ST",
      "country": "US",
      "type": "Summer 2026",
      "deadline": "YYYY-MM-DD or Rolling",
      "remote": false,
      "visa_friendly": true,
      "work_auth": "CPT/OPT accepted",
      "apply_url": "https://real-url.com",
      "salary": "$22-26/hr",
      "probability": 82,
      "prob_reason": "Strong Power BI + ERP experience directly matches role.",
      "match_skills": ["Power BI", "Python"],
      "missing_skills": ["Tableau"],
      "category": "Fintech",
      "company_size": "large",
      "notes": "Why this specific role fits this candidate.",
      "source": "AI"
    }
  ],
  "fulltime_jobs": [
    {
      "id": "slug",
      "title": "Exact Title",
      "company": "Company Name",
      "location": "City, ST",
      "country": "US",
      "employment_type": "Full-time",
      "remote": false,
      "visa_friendly": true,
      "visa_sponsorship": true,
      "work_auth": "OPT/H1B sponsor",
      "apply_url": "https://real-url.com",
      "salary": "$65-80k",
      "probability": 75,
      "prob_reason": "Why this candidate fits this full-time role.",
      "match_skills": ["Power BI", "SQL"],
      "missing_skills": [],
      "category": "Data Analytics",
      "company_size": "mid-size",
      "notes": "Why this role fits their post-graduation goals.",
      "source": "AI"
    }
  ],
  "startups": [
    {
      "id": "slug",
      "company": "Startup Name",
      "location": "City, ST",
      "country": "US",
      "stage": "Series B",
      "funding": "$40M 2024",
      "headcount": "50-200",
      "focus": "What they build.",
      "why_fit": "Why this candidate specifically.",
      "open_roles": ["Data Analyst", "Finance Analyst"],
      "outreach_tip": "DM Head of Data on LinkedIn. Lead with your Workday + Oracle experience from City Utilities.",
      "outreach_channel": "LinkedIn DM",
      "website": "https://company.com",
      "linkedin_url": "https://linkedin.com/company/name",
      "careers_url": "https://company.com/careers",
      "hiring_signal": "actively hiring",
      "fit_score": 87
    }
  ],
  "grad_programs": [
    {
      "id": "slug",
      "program": "MS Business Analytics",
      "degree": "MS",
      "university": "University Name",
      "location": "City, ST",
      "country": "US",
      "stem": true,
      "opt": "36 months STEM OPT",
      "duration": "12 months",
      "deadline_r1": "YYYY-MM-DD",
      "deadline_r2": "YYYY-MM-DD",
      "gre": false,
      "gmat": false,
      "avg_gpa": 3.5,
      "admit_prob": 82,
      "admit_reason": "Why this candidate is competitive.",
      "tuition": 45000,
      "scholarship": true,
      "salary_after": 95000,
      "placement": 93,
      "top_employers": ["Amazon", "Deloitte"],
      "apply_url": "https://grad.university.edu/apply",
      "notes": "Why this program fits their visa + career goals."
    }
  ],
  "summary": {
    "top_action": "Most important single action this week.",
    "urgent": ["Deadline alert 1", "Deadline alert 2"],
    "skill_gaps": ["Specific gap to close"],
    "highlights": ["Strength to lead with"],
    "market_note": "One sentence on job market conditions for this profile."
  }
}

RULES:
- 10 internships, 8 full-time jobs, 6 startups, 6 grad programs
- Order every section by probability/fit highest first
${visaFriendly ? "- ONLY roles open to F-1/CPT/OPT. Skip anything requiring US citizenship, green card, or clearance." : ""}
${remote ? "- Prefer remote/hybrid positions." : ""}
- For jobs from real listings above, keep their exact apply_url and set source to their source field
- Use real company names and real program names throughout`,
      6000
    );

    const opportunities = parseJSON(raw);
    if (!opportunities) return res.status(422).json({ error: "Could not generate results. Please try again." });

    opportunities.summary = opportunities.summary || {};
    opportunities.summary.real_jobs_found = allReal.length;
    opportunities.summary.sources = [HAS_JSEARCH?"JSearch":"", HAS_ADZUNA?"Adzuna":"", "USAJobs", "AI"].filter(Boolean);

    // Save snapshot to Supabase
    if (supabase && userId) {
      await supabase.from("opportunity_snapshots").insert({
        user_id: userId, snapshot_date: today, data: opportunities, filters,
      }).catch(console.warn);
    }

    res.json({ opportunities });
  } catch (err) {
    console.error("/api/opportunities:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/message
app.post("/api/message", async (req, res) => {
  try {
    const { profile, target, type } = req.body;
    const raw = await ai(
      "You write outreach messages for students. Return only the message text — nothing before or after it.",
      `Write a ${type} from ${profile.name} to ${target.company || target.university}.
Role: ${target.title || target.program || "data/analytics position"}

Candidate: ${profile.university}, ${profile.majors?.join("+")||"Business"}, GPA ${profile.gpa}
Skills: ${[...(profile.skills?.technical||[]),...(profile.skills?.tools||[])].slice(0,5).join(", ")}
Experience: ${profile.experience?.slice(0,2).map(e=>`${e.title} at ${e.company}`).join("; ")}
Portfolio: ${profile.portfolio||"not provided"}
Why this fits: ${target.notes||target.why_fit||target.prob_reason||"strong match"}

Rules: under 120 words · mention 1 specific thing about this company · name 2 matching skills · clear ask at end · no cliché openers · sound like a real student`,
      400
    );
    res.json({ message: raw.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/health
app.get("/api/health", (_, res) => res.json({
  status: "ok",
  version: "v6",
  openai: HAS_OPENAI ? "configured" : "MISSING — add OPENAI_API_KEY to Railway",
  jsearch: HAS_JSEARCH ? "configured" : "not set",
  adzuna: HAS_ADZUNA ? "configured" : "not set",
  supabase: HAS_SB ? "configured" : "not set",
  time: new Date().toISOString(),
}));

// Supabase routes
app.get("/api/snapshots/:userId", async (req, res) => {
  if (!supabase) return res.json({ snapshots: [] });
  const { data } = await supabase.from("opportunity_snapshots").select("*").eq("user_id", req.params.userId).order("created_at", { ascending: false }).limit(20);
  res.json({ snapshots: data || [] });
});

app.get("/api/profile/:userId", async (req, res) => {
  if (!supabase) return res.json({ profile: null });
  const { data } = await supabase.from("profiles").select("profile_data").eq("user_id", req.params.userId).single();
  res.json({ profile: data?.profile_data || null });
});

// Serve React SPA
app.get("*", (req, res) => {
  const index = path.join(__dirname, "..", "dist", "index.html");
  if (fs.existsSync(index)) res.sendFile(index);
  else res.json({ message: "Career Intel v6 API running." });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Career Intel v6 → http://localhost:${PORT}`));
