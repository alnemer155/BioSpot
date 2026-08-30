import { getSupabaseUser, json } from "./_lib/auth.js";

const MODEL_CHAIN = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.0-flash"];
let cachedModel = null;

const SYSTEM = `You are BioSpot Agent, a bio-page generator. Reply with ONLY valid JSON, no markdown fences.
Schema: {"profile":{"name":string,"title":string,"bio":string},"items":[{"type":"link"|"text"|"text_link","label":string,"url":string|null,"description":string|null}],"translations":{"ar":{"name":string,"title":string,"bio":string},"ja":{...},"fr":{...},"ru":{...}}}
Rules: name/title/bio short and punchy (bio <= 200 chars); 2-6 items; only include url when clearly implied by the prompt (absolute https URLs); descriptions optional; translations are faithful Arabic, Japanese, French and Russian versions of the profile fields.`;

async function callGemini(env, text) {
  const key = env.GEMINI_API_KEY;
  if (!key) throw new Error("AI is not configured (missing GEMINI_API_KEY).");
  const models = cachedModel ? [cachedModel, ...MODEL_CHAIN.filter((m) => m !== cachedModel)] : MODEL_CHAIN;
  let lastErr = "";
  for (const model of models) {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: "user", parts: [{ text }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
        }),
      }
    );
    if (r.status === 404 || r.status === 400) {
      lastErr = `${model}: ${await r.text()}`;
      continue;
    }
    if (!r.ok) throw new Error(`Gemini error (${r.status})`);
    const data = await r.json();
    const out = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
    const cleaned = out.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    cachedModel = model;
    return JSON.parse(cleaned);
  }
  throw new Error(lastErr || "Gemini request failed.");
}

const VALID_LANGS = ["ar", "ja", "fr", "ru"];

function cleanTranslations(t) {
  if (!t || typeof t !== "object") return null;
  const out = {};
  for (const lang of VALID_LANGS) {
    const v = t[lang];
    if (v && typeof v === "object") {
      out[lang] = {
        name: String(v.name || "").slice(0, 120),
        title: v.title ? String(v.title).slice(0, 160) : null,
        bio: v.bio ? String(v.bio).slice(0, 500) : null,
      };
    }
  }
  return Object.keys(out).length ? out : null;
}

function cleanResult(res) {
  const p = res.profile || {};
  const rawItems = Array.isArray(res.items) ? res.items.slice(0, 8) : [];
  const items = rawItems
    .map((it) => ({
      type: ["link", "text", "text_link"].includes(it.type)
        ? it.type
        : it.url
          ? "link"
          : "text",
      label: String(it.label || "").slice(0, 120) || null,
      url: typeof it.url === "string" && /^https?:\/\//.test(it.url) ? it.url : null,
      description: it.description ? String(it.description).slice(0, 300) : null,
    }))
    .filter((it) => it.label || it.url);
  return {
    profile: {
      name: String(p.name || "").slice(0, 120),
      title: p.title ? String(p.title).slice(0, 160) : null,
      bio: p.bio ? String(p.bio).slice(0, 500) : null,
    },
    items,
    translations: cleanTranslations(res.translations),
  };
}

export async function onRequestPost({ request, env }) {
  try {
    const su = await getSupabaseUser(request, env);
    if (!su) return json(401, "Not authenticated");
    const body = await request.json().catch(() => ({}));

    let prompt;
    if (body.translate && body.translate.name) {
      const p = body.translate;
      prompt = `Translate this bio page profile into Arabic, Japanese, French and Russian. Return the same JSON schema but items must be an empty array and keep profile values equal to the original English. Profile: name=${JSON.stringify(p.name)}, title=${JSON.stringify(p.title || "")}, bio=${JSON.stringify(p.bio || "")}`;
    } else if (body.prompt) {
      prompt = `Create a bio page for: ${String(body.prompt).slice(0, 1000)}`;
    } else {
      return json(400, "Provide a prompt or a profile to translate.");
    }

    const res = cleanResult(await callGemini(env, prompt));
    if (body.translate) return Response.json({ translations: res.translations });
    return Response.json(res);
  } catch (e) {
    console.error(e);
    return json(500, e.message || "Agent failed. Please try again.");
  }
}
