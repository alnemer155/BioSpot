import { getSql, getUserByUsername, getProfile, getItems } from "../_lib/db.js";
import { json } from "../_lib/auth.js";

export async function onRequestGet({ env, params }) {
  try {
    const uname = decodeURIComponent(params.username || "")
      .toLowerCase()
      .replace(/^@/, "");
    if (!uname) return json(404, "This BioSpot page does not exist.");
    const sql = await getSql(env);
    const user = await getUserByUsername(sql, uname);
    if (!user) return json(404, "This BioSpot page does not exist.");
    const profile = await getProfile(sql, user.id);
    const items = await getItems(sql, user.id, true);
    return Response.json({
      profile:
        profile || { name: user.username, title: null, bio: null, avatar_url: null },
      items,
    });
  } catch (e) {
    console.error(e);
    return json(500, "Failed to load page.");
  }
}
