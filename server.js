import dotenv from "dotenv";
dotenv.config();

import fetch from "node-fetch";
import OpenAI from "openai";
import qs from "querystring";

// server.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";


const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

// init client (uses OPENAI_API_KEY env var)
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Minimal local KB fallback
const KB = [
  { keys: ["hampi"], year: "c. 14th–16th century (≈ 600 years)", category: "Vijayanagara / Historical", summary: "Hampi was the capital of the Vijayanagara Empire — a vast group of ruined monuments and temples." },
  { keys: ["pattadakal"], year: "c. 7th–8th century (≈ 1200 years)", category: "Chalukya / UNESCO World Heritage", summary: "Pattadakal is a UNESCO site known for Chalukya temple architecture and sculptural work." },
  { keys: ["belur", "chennakesava"], year: "c. 12th–13th century (≈ 900 years)", category: "Hoysala", summary: "Belur's Chennakesava Temple is famed for intricate Hoysala soapstone carvings." },
  { keys: ["halebidu"], year: "c. 12th–13th century (≈ 900 years)", category: "Hoysala", summary: "Halebidu houses the Hoysaleshwara Temples with exceptionally detailed relief work." },
  { keys: ["badami"], year: "c. 6th–8th century (≈ 1400 years)", category: "Early Chalukya", summary: "Badami is famous for its rock-cut cave temples and Chalukya sculpture." },
  { keys: ["aihole"], year: "c. 5th–8th century (≈ 1500 years)", category: "Chalukya", summary: "Aihole is a cradle of early temple architecture with many experimental styles." },
  { keys: ["somanathapura", "keshava"], year: "c. 13th–14th century (≈ 750 years)", category: "Hoysala", summary: "Somanathapura's Keshava temple is an excellent example of Hoysala detail." },
  { keys: ["shravanabelagola"], year: "c. 10th–11th century (prominent c.1000 years)", category: "Jain Heritage", summary: "Shravanabelagola is known for the monolithic Bahubali statue and Jain inscriptions." },
  { keys: ["banavasi"], year: "c. 3rd–4th century (≈ 1700+ years)", category: "Kadamba / Ancient", summary: "Banavasi was an early Kadamba capital with ancient temple remains." }
];

function clientAnalyze(text = "") {
  const t = (text || "").toLowerCase();
  for (const item of KB) {
    for (const k of item.keys) if (t.includes(k)) return { year: item.year, summary: item.summary, category: item.category };
  }
  const yearMatch = text.match(/(\d{2,4})\s*years?/i);
  if (yearMatch) return { year: `${yearMatch[1]} years (approx.)`, summary: `Approximately ${yearMatch[1]} years old.`, category: "Historical" };
  return { year: "Unknown", summary: "No match in local KB. Paste a site name (e.g. 'Hampi') for a specific summary.", category: "Historical / Unknown" };
}

async function analyzeWithChatGPT(text = "") {
  // prompt asks for JSON only
  const system = `You are a heritage historian AI. Extract: (1) year built or approximate age, (2) a short summary (1-2 sentences), (3) a category (one of: Chalukya, Hoysala, Jain, Kadamba, Vijayanagara, Ancient, Temple Architecture, Historical). Return ONLY valid JSON with keys: year, summary, category. Example: {"year":"...","summary":"...","category":"..."}`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: text }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const raw = response?.choices?.[0]?.message?.content;
    console.log("[OpenAI] raw response:", raw);

    // try parsing JSON
    try {
      const parsed = JSON.parse(raw);
      // ensure keys exist
      if (parsed && parsed.summary && parsed.category) {
        return { year: parsed.year ?? "Unknown", summary: parsed.summary, category: parsed.category };
      }
      // otherwise, fallback to parsed-to-string if possible
    } catch (parseErr) {
      console.warn("[OpenAI] JSON parse failed:", parseErr.message);
      // fall through to heuristics below
    }
  } catch (err) {
    console.error("[OpenAI] request failed:", err?.message ?? err);
  }

  // fallback to local analyzer if anything went wrong
  return clientAnalyze(text);
}

// main endpoint
app.post("/analyze", async (req, res) => {
  const text = (req.body?.text || "").trim();
  if (!text) return res.json({ year: "Unknown", summary: "No text provided.", category: "Unknown" });

  try {
    const result = await analyzeWithChatGPT(text);
    return res.json(result);
  } catch (err) {
    console.error("Unexpected analyze error:", err);
    return res.json({ year: "Unknown", summary: "Sorry, I couldn't analyze the text.", category: "Unknown" });
  }
});

// optional TTS endpoint (unchanged)
app.post("/speak", async (req, res) => {
  try {
    const text = req.body?.text || "";
    const audio = await client.audio.speech.create({ model: "gpt-4o-mini-tts", voice: "alloy", input: text });
    const buf = Buffer.from(await audio.arrayBuffer());
    res.set("Content-Type", "audio/mpeg");
    res.send(buf);
  } catch (err) {
    console.error("TTS error:", err);
    res.status(500).send("TTS failed");
  }
});

app.get("/_health", (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Backend listening on http://localhost:${PORT}`));
