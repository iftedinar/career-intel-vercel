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
      "You are a resume parser. Return valid JSON only. No markdown fences, no text outside the JSON object. CRITICAL: Extract ONLY information that is explicitly present in the uploaded documents. Do NOT invent, guess, or use example values. If a field is not in the documents, use null.",
      `Extract a career profile from these documents. Use ONLY what is literally written in the text below — do not fill in any field from memory or imagination.

DOCUMENTS:
${docs.map(d => `=== ${d.name} ===\n${d.content}`).join("\n\n")}

Return this exact JSON structure. Replace every placeholder with the real value from the documents above, or null if not found:
{
  "name": null,
  "email": null,
  "phone": null,
  "location": null,
  "linkedin": null,
  "portfolio": null,
  "university": null,
  "graduation": null,
  "gpa": null,
  "majors": [],
  "minors": [],
  "visa_status": null,
  "work_auth": null,
  "skills": {
    "technical": [],
    "tools": [],
    "platforms": [],
    "soft": []
  },
  "experience": [
    {
      "title": null,
      "company": null,
      "location": null,
      "start": null,
      "end": null,
      "type": null,
      "highlights": []
    }
  ],
  "certifications": [
    { "name": null, "issuer": null, "date": null }
  ],
  "education_details": { "honors": null, "clubs": [] },
  "interests": [],
  "strengths": [],
  "target_roles": [],
  "target_locations": [],
  "summary": null
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
