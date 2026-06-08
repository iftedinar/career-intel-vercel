/**
 * POST /api/message
 * Generates a personalized outreach message for a given opportunity.
 */
import { ai, setCors } from "./_shared.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const { profile, target, type } = req.body;

    const raw = await ai(
      "You write outreach messages for students. Return only the message text — no subject line, no JSON, nothing before or after the message.",
      `Write a ${type} from ${profile.name} to ${target.company || target.university}.
Target role/program: ${target.title || target.program || "data or analytics position"}

About the candidate:
- ${profile.university}, ${profile.majors?.join(" + ") || "Business"}, GPA ${profile.gpa}
- Top skills: ${[...(profile.skills?.technical || []), ...(profile.skills?.tools || [])].slice(0, 5).join(", ")}
- Experience: ${profile.experience?.slice(0, 2).map(e => `${e.title} at ${e.company}`).join("; ")}
- Portfolio: ${profile.portfolio || "not provided"}

Why this role fits: ${target.notes || target.why_fit || target.prob_reason || "strong skills match"}

Rules:
1. Under 120 words
2. Reference ONE specific thing about this company or role (not generic)
3. Name exactly 2 skills that match this specific role
4. End with a single clear ask
5. Do NOT open with "I hope this finds you well", "My name is", or any cliché
6. Write as a real student, not marketing copy`,
      400
    );

    res.json({ message: raw.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
