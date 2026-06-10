export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { imageBase64, mediaType } = req.body;
  if (!imageBase64) return res.status(400).json({ error: "Image manquante" });

  const KEY = process.env.ANTHROPIC_API_KEY;
  if (!KEY) return res.status(500).json({ error: "Cle API manquante" });

  const prompt = `Analyse cette capture Mylight. Reponds UNIQUEMENT avec un objet JSON brut sans backticks ni texte:
{"source":"Mylight","type":"journalier","date":"2026-06-09","mois":null,"annee":2026,"production":13.33,"consumption":7.45,"chargeBatt":10.36,"dechargeBatt":4.48,"reseau":0.00,"autoconso":2.97,"notes":""}
Si mensuel: date=null et mois=numero 1-12. Si valeur non visible: null.`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 } },
            { type: "text", text: prompt }
          ]
        }]
      })
    });

    const data = await r.json();
    if (!r.ok) return res.status(500).json({ error: data.error?.message || "Erreur API" });

    const raw = data.content?.map(c => c.text || "").join("").trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: "Pas de JSON", raw });

    try {
      return res.status(200).json({ success: true, data: JSON.parse(match[0]) });
    } catch {
      return res.status(500).json({ error: "JSON invalide", raw });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
