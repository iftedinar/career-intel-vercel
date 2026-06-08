/**
 * POST /api/parse
 * Accepts multipart form with PDF/DOCX/TXT files.
 * Returns a structured career profile JSON.
 *
 * Note: Vercel serverless functions have a 4.5MB body limit by default.
 * We configure it to 10MB below.
 */
import formidable from "formidable";
import fs from "fs";
import { ai, extractJSON, setCors } from "./_shared.js";

export const config = {
  api: { bodyParser: false },  // required for file uploads
};

function readFile(filepath) {
  try {
    const raw = fs.readFileSync(filepath).toString("utf-8").replace(/[\x00-\x08\x0B-\x1F]/g, "");
    return raw.slice(0, 12000);
  } catch { return ""; }
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    // Parse multipart form
    const form = formidable({ maxFileSize: 10 * 1024 * 1024, multiples: true });
    const [, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err); else resolve([fields, files]);
      });
    });

    const uploaded = Object.values(files).flat();
    const docs = uploaded
      .map(f => ({ name: f.originalFilename || "file", content: readFile(f.filepath) }))
      .filter(d => d.content.length > 20);

    // Clean up temp files
    uploaded.forEach(f => { try { fs.unlinkSync(f.filepath); } catch {} });

    if (!docs.length) {
      return res.status(400).json({
        error: "No readable content found. Make sure your PDF has selectable text — open it and try to highlight text. If you can, it will work.",
      });
    }

    const raw = await ai(
      "You are a resume parser. Return valid JSON only. No markdown fences, no text outside the JSON object.",
      `Extract a complete career profile from these documents:

${docs.map(d => `=== ${d.name} ===\n${d.content}`).join("\n\n")}

Return this exact JSON structure (fill with real values from the documents):
{
  "name": "Full Name",
  "email": "email@domain.com",
  "phone": "number if present",
  "location": "City, State",
  "linkedin": "linkedin url if present",
  "portfolio": "portfolio url if present",
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
    {
      "title": "Job Title",
      "company": "Company Name",
      "location": "City, ST",
      "start": "Jun 2025",
      "end": "Aug 2025",
      "type": "internship",
      "highlights": ["Key achievement 1", "Key achievement 2"]
    }
  ],
  "certifications": [
    { "name": "Cert Name", "issuer": "LinkedIn Learning", "date": "Nov 2025" }
  ],
  "education_details": { "honors": "Dean's List", "clubs": ["Club 1"] },
  "interests": ["fintech", "data analytics"],
  "strengths": ["Rare ERP experience at undergrad level", "Dual major Finance + Data Analytics"],
  "target_roles": ["Data Analyst", "Finance Analyst", "Business Intelligence Analyst"],
  "target_locations": ["Springfield MO", "Kansas City", "Remote"],
  "summary": "Two-sentence professional summary of this specific candidate."
}`,
      2500
    );

    const profile = extractJSON(raw);
    if (!profile) {
      return res.status(422).json({
        error: "Could not parse profile from your document. Make sure the PDF has selectable text (not a scanned image).",
      });
    }

    res.json({ profile });
  } catch (err) {
    console.error("/api/parse error:", err.message);
    res.status(500).json({ error: err.message });
  }
}
