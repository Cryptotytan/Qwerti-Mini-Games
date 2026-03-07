// api/leaderboard.js
// Vercel Serverless Function — Universal Leaderboard
// Uses Vercel KV (Redis) for persistent global storage
// Install: npm i @vercel/kv

import { kv } from "@vercel/kv";

const LB_MAX = 10;
const VALID_LEVELS = ["easy", "normal", "hard"];

// CORS headers so the frontend can call this from any origin
function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  cors(res);

  // Preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { level } = req.query;

  if (!level || !VALID_LEVELS.includes(level)) {
    return res.status(400).json({ error: "Invalid level. Use easy, normal, or hard." });
  }

  const KEY = `leaderboard:${level}`;

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
