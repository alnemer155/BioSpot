const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export async function analyzeRequest(request, { usernameExists, emailExists }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { score: 50, risk: "medium", recommendation: "manual_review", analysis: { error: "No API key configured" } };
  }

  const prompt = `You are Auth-2.0 Security Review for LinkTroo platform. Analyze this account registration request for suspicious patterns and bot activity.

REQUEST DATA:
- Username: ${request.username}
- Email: ${request.email}
- Display Name: ${request.display_name}
- Use Case: ${request.use_case}${request.use_case_details ? `\n- Use Case Details: ${request.use_case_details}` : ""}
- Submitted: ${request.created_at || "just now"}

EXISTING DATA:
- Username already taken in system: ${usernameExists}
- Email already has request/account: ${emailExists}

ANALYZE FOR:
1. Bot probability (score 0-100, higher = more likely bot)
2. Email quality (throwaway, suspicious domain, etc.)
3. Username quality (spam patterns, random chars, etc.)
4. Risk level (low/medium/high/critical)
5. Recommendation (approve/manual_review/reject)
6. Brief summary of findings

Respond ONLY with valid JSON:
{
  "score": <number 0-100>,
  "risk": "<low|medium|high|critical>",
  "recommendation": "<approve|manual_review|reject>",
  "analysis": {
    "bot_probability": "<low|medium|high>",
    "email_quality": "<good|suspicious|throwaway>",
    "username_quality": "<good|suspicious|spam>",
    "summary": "<brief explanation of findings>"
  }
}`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
      }),
    });
    if (!res.ok) throw new Error(`Gemini API ${res.status}`);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in response");
    return JSON.parse(match[0]);
  } catch (e) {
    console.error("[gemini] analysis failed:", e.message);
    return { score: 50, risk: "medium", recommendation: "manual_review", analysis: { error: e.message } };
  }
}
