/**
 * POST /api/opportunities
 * Takes a profile + filters, fetches real job listings, runs AI analysis.
 * Returns internships, full-time jobs, startups, grad programs.
 */
import { ai, extractJSON, setCors, fetchJSearch, fetchAdzuna, fetchUSAJobs } from "./_shared.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { profile, filters = {}, model = "gpt-4o-mini" } = body;
    if (!profile) return res.status(400).json({ error: "Profile is required." });

    const today = new Date().toISOString().split("T")[0];
    const {
      visaFriendly = true,
      location = "both",
      remote = false,
      jobTypes = ["internship", "fulltime"],
    } = filters;

    const wantIntern   = jobTypes.includes("internship");
    const wantFulltime = jobTypes.includes("fulltime");

    const skillQ = [
      ...(profile.skills?.technical || []),
      ...(profile.skills?.tools || []),
    ].slice(0, 3).join(" ");
    const roleQ = profile.target_roles?.[0] || profile.majors?.[0] || "data analytics finance";
    const country = location === "international" ? "ca" : "us";

    // Fetch all real job sources in parallel
    const [jsIntern, jsFull, azIntern, azFull, usaJobs] = await Promise.all([
      wantIntern   ? fetchJSearch(`${skillQ} ${roleQ}`, "intern")    : [],
      wantFulltime ? fetchJSearch(`${skillQ} ${roleQ}`, "full time") : [],
      wantIntern   ? fetchAdzuna(`${roleQ} intern`,     country, "internship") : [],
      wantFulltime ? fetchAdzuna(roleQ,                 country, "full-time")  : [],
      wantFulltime ? fetchUSAJobs(roleQ) : [],
    ]);

    const realInternships = [...jsIntern, ...azIntern];
    const realFulltime    = [...jsFull, ...azFull, ...usaJobs];
    const allReal         = [...realInternships, ...realFulltime];

    const realBlock = allReal.length > 0
      ? `\nVERIFIED LIVE JOB LISTINGS — incorporate these using their exact apply_url:\n${JSON.stringify(allReal, null, 2)}\n`
      : "";

    const raw = await ai(
      "You are a career intelligence AI. Return valid JSON only. No markdown fences, no text before or after the JSON.",
      `Find the best opportunities for this candidate. Today: ${today}.

CANDIDATE:
Name: ${profile.name} | University: ${profile.university} | GPA: ${profile.gpa}
Graduating: ${profile.graduation} | Visa: ${profile.visa_status} | Auth: ${profile.work_auth}
Majors: ${profile.majors?.join(", ")}
Technical: ${profile.skills?.technical?.join(", ")}
Tools: ${profile.skills?.tools?.join(", ")}
Platforms: ${profile.skills?.platforms?.join(", ")}
Certs: ${profile.certifications?.map(c => c.name).join(", ") || "none"}
Interests: ${profile.interests?.join(", ")}
Strengths: ${profile.strengths?.join("; ")}
Target roles: ${profile.target_roles?.join(", ") || "open"}
Target locations: ${profile.target_locations?.join(", ") || "open"}
Portfolio: ${profile.portfolio || "none"}
${realBlock}

FILTERS: visa_friendly=${visaFriendly}, location=${location}, remote=${remote}, types=${jobTypes.join(",")}

Return ONE JSON object (no markdown, no text outside JSON):
{
  "generated_at": "${today}",
  "internships": [
    {
      "id": "company-role-slug",
      "title": "Job Title",
      "company": "Company Name",
      "location": "City, ST",
      "country": "US",
      "type": "Summer 2026",
      "deadline": "YYYY-MM-DD or Rolling",
      "remote": false,
      "visa_friendly": true,
      "work_auth": "CPT/OPT accepted",
      "apply_url": "https://careers.company.com/job",
      "salary": "$22-26/hr",
      "probability": 82,
      "prob_reason": "Strong Power BI + ERP background matches the role directly.",
      "match_skills": ["Power BI", "Python"],
      "missing_skills": ["Tableau"],
      "category": "Fintech",
      "company_size": "large",
      "notes": "Why this role fits this specific candidate.",
      "source": "AI"
    }
  ],
  "fulltime_jobs": [
    {
      "id": "company-role-slug",
      "title": "Job Title",
      "company": "Company Name",
      "location": "City, ST",
      "country": "US",
      "employment_type": "Full-time",
      "remote": false,
      "visa_friendly": true,
      "visa_sponsorship": true,
      "work_auth": "OPT/H1B sponsor",
      "apply_url": "https://careers.company.com/job",
      "salary": "$65-85k",
      "probability": 75,
      "prob_reason": "Why this full-time role fits.",
      "match_skills": ["SQL", "Power BI"],
      "missing_skills": [],
      "category": "Data Analytics",
      "company_size": "mid-size",
      "notes": "Why this fits their post-graduation goals.",
      "source": "AI"
    }
  ],
  "startups": [
    {
      "id": "startup-slug",
      "company": "Startup Name",
      "location": "City, ST",
      "country": "US",
      "stage": "Series B",
      "funding": "$40M 2024",
      "headcount": "50-200",
      "focus": "One sentence: what they build.",
      "why_fit": "Why this candidate specifically fits.",
      "open_roles": ["Data Analyst", "Finance Analyst"],
      "outreach_tip": "DM the Head of Data on LinkedIn, lead with your Workday + Oracle internship.",
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
      "id": "program-slug",
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
      "admit_reason": "GPA 3.78 exceeds average; dual major is rare differentiator.",
      "tuition": 45000,
      "scholarship": true,
      "salary_after": 95000,
      "placement": 93,
      "top_employers": ["Amazon", "Deloitte", "Goldman Sachs"],
      "apply_url": "https://grad.university.edu/apply",
      "notes": "STEM designation gives 3-year OPT extension."
    }
  ],
  "summary": {
    "top_action": "Most important single action this week.",
    "urgent": ["Specific deadline alert 1"],
    "skill_gaps": ["Specific skill to add"],
    "highlights": ["Top strength to lead with"],
    "market_note": "One sentence on the job market for this profile."
  }
}

REQUIREMENTS:
- 6 internships, 5 full-time jobs, 4 startups, 4 grad programs
- Order each section by probability / fit_score highest first
${visaFriendly ? "- ONLY roles open to F-1/CPT/OPT. Skip anything requiring US citizenship, green card, or security clearance." : ""}
${remote ? "- Prefer remote and hybrid positions." : ""}
- For jobs from the real listings above, use their exact apply_url and set source to their source value
- Use real company names and real URLs throughout`,
      4000,
      model
    );

    const opportunities = extractJSON(raw);
    if (!opportunities) {
      return res.status(422).json({ error: "Could not generate results. Please try again." });
    }

    opportunities.summary = opportunities.summary || {};
    opportunities.summary.real_jobs_found = allReal.length;
    opportunities.summary.sources = [
      (process.env.JSEARCH_KEY || "").length > 10 ? "JSearch" : null,
      (process.env.ADZUNA_APP_ID || "").length > 0 ? "Adzuna" : null,
      "USAJobs",
      "AI",
    ].filter(Boolean);

    res.json({ opportunities });
  } catch (err) {
    console.error("/api/opportunities error:", err.message);
    res.status(500).json({ error: err.message });
  }
}
