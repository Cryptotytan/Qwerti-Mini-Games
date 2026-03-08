// api/leaderboard.js — CommonJS format for Vercel

const { Redis } = require("@upstash/redis");

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const LB_MAX = 10;
const VALID_LEVELS = ["easy", "normal", "hard"];

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async function handler(req, res) {
  cors(res);

  if (req.method === "OPTIONS") return res.status(200).end();

  const { level } = req.query;
  if (!level || !VALID_LEVELS.includes(level)) {
    return res.status(400).json({ error: "Invalid level." });
  }

  const KEY = "leaderboard_" + level;

  // GET — fetch leaderboard
  if (req.method === "GET") {
    try {
      const data = await kv.get(KEY);
      return res.status(200).json({ level, entries: data || [] });
    } catch (err) {
      console.error("GET error:", err);
      return res.status(500).json({ error: "Failed to fetch leaderboard.", detail: err.message });
    }
  }

  // POST — submit score
  if (req.method === "POST") {
    let body = req.body;

    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch(e) { return res.status(400).json({ error: "Bad JSON body." }); }
    }

    const { handle, time } = body || {};

    if (!handle || typeof handle !== "string" || handle.trim().length < 2)
      return res.status(400).json({ error: "Invalid handle." });
    if (typeof time !== "number" || time <= 0 || time > 86400)
      return res.status(400).json({ error: "Invalid time." });

    const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9@._-]/g, "");

    try {
      let entries = (await kv.get(KEY)) || [];

      // Check if this user already has an entry
      const existing = entries.find(e => e.handle.toLowerCase() === cleanHandle.toLowerCase());

      if (existing) {
        // Only update if the new time is FASTER (lower) than their current best
        if (time >= existing.time) {
          // New score is slower or equal — keep existing best, return current standings
          const rank = entries.findIndex(e => e.handle.toLowerCase() === cleanHandle.toLowerCase()) + 1;
          return res.status(200).json({
            level, entries,
            rank: rank > 0 ? rank : null,
            inTop10: rank > 0 && rank <= LB_MAX,
            improved: false
          });
        }
        // New score is faster — remove old entry so we can add the new best
        entries = entries.filter(e => e.handle.toLowerCase() !== cleanHandle.toLowerCase());
      }

      // Add new best score
      entries.push({ handle: cleanHandle, time });

      // Sort fastest first, keep top 10
      entries.sort((a, b) => a.time - b.time);
      entries = entries.slice(0, LB_MAX);

      await kv.set(KEY, entries);

      const rank = entries.findIndex(e => e.handle.toLowerCase() === cleanHandle.toLowerCase()) + 1;

      return res.status(200).json({
        level, entries,
        rank: rank > 0 ? rank : null,
        inTop10: rank > 0 && rank <= LB_MAX,
        improved: true
      });

    } catch (err) {
      console.error("POST error:", err);
      return res.status(500).json({ error: "Failed to save score.", detail: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed." });
};
