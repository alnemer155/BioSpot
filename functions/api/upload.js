import { getSupabaseUser } from "../_lib/auth.js";
import { makeSupa } from "../_lib/supa.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const su = await getSupabaseUser(request, env);
  if (!su) return Response.json({ error: "Not authenticated" }, { status: 401 });
  try {
    const auth = request.headers.get("Authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    const supa = makeSupa(env, token);
    const { file, filename, contentType } = await request.json();
    if (!file || !filename) return Response.json({ error: "Missing file data." }, { status: 400 });
    const buf = Uint8Array.from(atob(file), c => c.charCodeAt(0));
    const safeName = filename.replace(/[^\w.\-]/g, "_");
    const path = `${su.id}/${Date.now()}-${safeName}`;
    const { error } = await supa.storage.from("files").upload(path, buf, {
      contentType: contentType || "application/octet-stream",
    });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    const { data } = supa.storage.from("files").getPublicUrl(path);
    return Response.json({ url: data.publicUrl });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
