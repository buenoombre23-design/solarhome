export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const TOKEN = process.env.GITHUB_TOKEN;
  const OWNER = process.env.GITHUB_OWNER;
  const REPO  = process.env.GITHUB_REPO;
  if (!TOKEN || !OWNER || !REPO) return res.status(500).json({ error: "Variables GitHub manquantes" });

  try {
    const r = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/data/solarhome.json`,
      { headers: { "Authorization": `token ${TOKEN}`, "Accept": "application/vnd.github.v3+json" } }
    );

    if (r.status === 404) return res.status(200).json({ success: true, data: null, sha: null });
    if (!r.ok) return res.status(500).json({ error: "Erreur GitHub " + r.status });

    const file = await r.json();
    const content = JSON.parse(Buffer.from(file.content, "base64").toString("utf8"));
    return res.status(200).json({ success: true, data: content, sha: file.sha });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
