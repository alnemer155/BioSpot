import { json } from "./_lib/auth.js";

// Extract public X/Twitter profile info: display name, followers and avatar.
export async function onRequestGet({ request, env }) {
  try {
    const handle = (new URL(request.url).searchParams.get("handle") || "")
      .trim()
      .replace(/^@/, "");
    if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) {
      return json(400, "Enter a valid X handle (letters, numbers, underscore).");
    }

    let name = handle;
    let followers = null;
    try {
      const r = await fetch(
        `https://cdn.syndication.twimg.com/widgets/followbutton/info.json?screen_names=${handle}`,
        { headers: { "User-Agent": "Mozilla/5.0" } }
      );
      if (r.ok) {
        const info = await r.json();
        if (Array.isArray(info) && info[0]) {
          name = info[0].name || name;
          followers = typeof info[0].followers_count === "number" ? info[0].followers_count : null;
        }
      }
    } catch {
      // keep defaults — avatar service below still works
    }

    return Response.json({
      handle,
      name,
      followers,
      avatar_url: `https://unavatar.io/twitter/${handle}`,
      url: `https://x.com/${handle}`,
    });
  } catch (e) {
    console.error(e);
    return json(500, "Could not fetch X profile. Please try again.");
  }
}
