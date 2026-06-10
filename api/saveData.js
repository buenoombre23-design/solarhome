export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const TOKEN = process.env.GITHUB_TOKEN;
  const OWNER = process.env.GITHUB_OWNER;
  const REPO  = process.env.GITHUB_REPO;
  if (!TOKEN || !OWNER || !REPO) return res.status(500).json({ error: "Variables GitHub manquantes" });

  const { data } = req.body;
  if (!data) return res.status(400).json({ error: "Donnees manquantes" });

  try {
    // Always get latest sha to avoid conflicts
    const getR = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/data/solarhome.json`,
      { headers: { "Authorization": `token ${TOKEN}`, "Accept": "application/vnd.github.v3+json" } }
    );

    let currentSha = null;
    if (getR.ok) {
      const existing = await getR.json();
      currentSha = existing.sha;
    }

    const content = Buffer.from(JSON.stringify(data, null, 2)).toString("base64");
    const body = {
      message: "SolarHome: sauvegarde " + new Date().toISOString().slice(0, 10),
      content,
      ...(currentSha ? { sha: currentSha } : {})
    };

    const putR = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/data/solarhome.json`,
      {
        method: "PUT",
        headers: {
          "Authorization": `token ${TOKEN}`,
          "Accept": "application/vnd.github.v3+json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }
    );

    if (!putR.ok) {
      const err = await putR.json();
      return res.status(500).json({ error: err.message || "Erreur GitHub " + putR.status });
    }

    const result = await putR.json();
    return res.status(200).json({ success: true, sha: result.content.sha });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
