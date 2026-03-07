// api/leaderboard.js — CommonJS format for Vercel

const { Redis } = require("@upstash/redis");

const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
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

    // Parse body manually if it's a string (sometimes happens in Vercel)
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

      // One entry per user — remove old record if exists
      entries = entries.filter(e => e.handle.toLowerCase() !== cleanHandle.toLowerCase());

      // Add new score
      entries.push({ handle: cleanHandle, time });

      // Sort fastest first, keep top 10
      entries.sort((a, b) => a.time - b.time);
      entries = entries.slice(0, LB_MAX);

      await kv.set(KEY, entries);

      const rank = entries.findIndex(e => e.handle.toLowerCase() === cleanHandle.toLowerCase()) + 1;

      return res.status(200).json({
        level, entries,
        rank: rank > 0 ? rank : null,
        inTop10: rank > 0 && rank <= LB_MAX
      });

    } catch (err) {
      console.error("POST error:", err);
      return res.status(500).json({ error: "Failed to save score.", detail: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed." });
};
  // ── GET: fetch leaderboard for a level ──────────────────
  if (req.method === "GET") {
    try {
      const data = await kv.get(KEY);
      return res.status(200).json({ level, entries: data || [] });
    } catch (err) {
      console.error("KV GET error:", err);
      return res.status(500).json({ error: "Failed to fetch leaderboard." });
    }
  }

  // ── POST: submit a new score ─────────────────────────────
  if (req.method === "POST") {
    const { handle, time } = req.body;

    if (!handle || typeof handle !== "string" || handle.trim().length < 2) {
      return res.status(400).json({ error: "Invalid handle." });
    }
    if (typeof time !== "number" || time <= 0 || time > 86400) {
      return res.status(400).json({ error: "Invalid time." });
    }

    const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9@._-]/g, "");

    try {
      // Load current leaderboard
      let entries = (await kv.get(KEY)) || [];

      // Remove any existing entry for this handle (one entry per user)
      entries = entries.filter(e => e.handle.toLowerCase() !== cleanHandle.toLowerCase());

      // Add new entry
      entries.push({ handle: cleanHandle, time });

      // Sort by fastest time ascending
      entries.sort((a, b) => a.time - b.time);

      // Keep only top 10
      entries = entries.slice(0, LB_MAX);

      // Save back
      await kv.set(KEY, entries);

      // Find rank of submitted handle
      const rank = entries.findIndex(e => e.handle.toLowerCase() === cleanHandle.toLowerCase()) + 1;

      return res.status(200).json({
        level,
        entries,
        rank: rank > 0 ? rank : null,
        inTop10: rank > 0 && rank <= LB_MAX
      });

    } catch (err) {
      console.error("KV POST error:", err);
      return res.status(500).json({ error: "Failed to save score." });
    }
  }

  return res.status(405).json({ error: "Method not allowed." });
}
  // ── GET: fetch leaderboard for a level ──────────────────
  if (req.method === "GET") {
    try {
      const data = await kv.get(KEY);
      return res.status(200).json({ level, entries: data || [] });
    } catch (err) {
      console.error("KV GET error:", err);
      return res.status(500).json({ error: "Failed to fetch leaderboard." });
    }
  }

  // ── POST: submit a new score ─────────────────────────────
  if (req.method === "POST") {
    const { handle, time } = req.body;

    if (!handle || typeof handle !== "string" || handle.trim().length < 2) {
      return res.status(400).json({ error: "Invalid handle." });
    }
    if (typeof time !== "number" || time <= 0 || time > 86400) {
      return res.status(400).json({ error: "Invalid time." });
    }

    const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9@._-]/g, "");

    try {
      // Load current leaderboard
      let entries = (await kv.get(KEY)) || [];

      // Remove any existing entry for this handle (one entry per user)
      entries = entries.filter(e => e.handle.toLowerCase() !== cleanHandle.toLowerCase());

      // Add new entry
      entries.push({ handle: cleanHandle, time });

      // Sort by fastest time ascending
      entries.sort((a, b) => a.time - b.time);

      // Keep only top 10
      entries = entries.slice(0, LB_MAX);

      // Save back
      await kv.set(KEY, entries);

      // Find rank of submitted handle
      const rank = entries.findIndex(e => e.handle.toLowerCase() === cleanHandle.toLowerCase()) + 1;

      return res.status(200).json({
        level,
        entries,
        rank: rank > 0 ? rank : null,
        inTop10: rank > 0 && rank <= LB_MAX
      });

    } catch (err) {
      console.error("KV POST error:", err);
      return res.status(500).json({ error: "Failed to save score." });
    }
  }

  return res.status(405).json({ error: "Method not allowed." });
}      const data = await kv.get(KEY);
      return res.status(200).json({ level, entries: data || [] });
    } catch (err) {
      console.error("KV GET error:", err);
      return res.status(500).json({ error: "Failed to fetch leaderboard." });
    }
  }

  // ── POST: submit a new score ─────────────────────────────
  if (req.method === "POST") {
    const { handle, time } = req.body;

    if (!handle || typeof handle !== "string" || handle.trim().length < 2) {
      return res.status(400).json({ error: "Invalid handle." });
    }
    if (typeof time !== "number" || time <= 0 || time > 86400) {
      return res.status(400).json({ error: "Invalid time." });
    }

    const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9@._-]/g, "");

    try {
      // Load current leaderboard
      let entries = (await kv.get(KEY)) || [];

      // Remove any existing entry for this handle (one entry per user)
      entries = entries.filter(e => e.handle.toLowerCase() !== cleanHandle.toLowerCase());

      // Add new entry
      entries.push({ handle: cleanHandle, time });

      // Sort by fastest time ascending
      entries.sort((a, b) => a.time - b.time);

      // Keep only top 10
      entries = entries.slice(0, LB_MAX);

      // Save back
      await kv.set(KEY, entries);

      // Find rank of submitted handle
      const rank = entries.findIndex(e => e.handle.toLowerCase() === cleanHandle.toLowerCase()) + 1;

      return res.status(200).json({
        level,
        entries,
        rank: rank > 0 ? rank : null,
        inTop10: rank > 0 && rank <= LB_MAX
      });

    } catch (err) {
      console.error("KV POST error:", err);
      return res.status(500).json({ error: "Failed to save score." });
    }
  }

  return res.status(405).json({ error: "Method not allowed." });
        }
