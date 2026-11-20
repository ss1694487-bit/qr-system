import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { rateLimit } from "express-rate-limit";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENTS_DIR = path.join(__dirname, "data", "clients");
const app = express();
const PORT = Number(process.env.PORT || 5000);
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

if (!process.env.GEMINI_API_KEY) {
  console.warn("WARNING: GEMINI_API_KEY is missing. AI draft generation will fail.");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "missing-key" });

const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
  .split(",").map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Allow non-browser health checks; browsers must match configured origins.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed by CORS"));
  }
}));
app.use(express.json({ limit: "12kb" }));

app.use("/api/", rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: "draft-7",
  legacyHeaders: false
}));

function validSlug(slug) {
  return typeof slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

async function loadClient(slug) {
  if (!validSlug(slug)) return null;
  try {
    const file = path.join(CLIENTS_DIR, `${slug}.json`);
    const raw = await fs.readFile(file, "utf8");
    const client = JSON.parse(raw);
    if (client.slug !== slug || !client.businessName || !client.reviewUrl) return null;
    const reviewUrl = new URL(client.reviewUrl);
    const host = reviewUrl.hostname.toLowerCase();
    const isGoogleHost = host === "google.com" || host.endsWith(".google.com") || host === "g.page" || host === "maps.app.goo.gl";
    if (reviewUrl.protocol !== "https:" || !isGoogleHost) return null;
    return client;
  } catch {
    return null;
  }
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "AIMARKATER QR Review API" });
});

app.get("/api/business/:slug", async (req, res) => {
  const client = await loadClient(req.params.slug);
  if (!client) return res.status(404).json({ error: "Business page not found." });

  // Only public, customer-facing fields are returned.
  res.json({
    businessName: client.businessName,
    city: client.city || "",
    services: client.services || [],
    reviewUrl: client.reviewUrl,
    languages: client.languages || ["English", "Hindi", "Hinglish"],
    brandColor: /^#[0-9A-Fa-f]{6}$/.test(client.brandColor || "") ? client.brandColor : "#0864EB"
  });
});

app.post("/api/generate-review", async (req, res) => {
  try {
    const { slug, service, experience, feedback, language } = req.body || {};
    const client = await loadClient(slug);

    if (!client) return res.status(404).json({ error: "Business page not found." });

    const fields = [service, experience, feedback, language];
    if (fields.some(v => typeof v !== "string" || !v.trim())) {
      return res.status(400).json({ error: "Please complete all feedback fields." });
    }
    if (service.length > 120 || experience.length > 80 || feedback.length > 1200 || language.length > 30) {
      return res.status(400).json({ error: "One or more fields are too long." });
    }
    if (!(client.languages || ["English", "Hindi", "Hinglish"]).includes(language)) {
      return res.status(400).json({ error: "Please choose an available language." });
    }

    const prompt = `
You help a customer express their OWN real experience in a clear, natural review draft.
This is a draft for the customer to inspect, edit, and decide whether to publish.
Do not claim to be the customer. Do not invent details, outcomes, ratings, or facts.
Do not add marketing copy, calls to action, exaggerated praise, or keyword stuffing.
Only mention a service or location term if it is naturally supported by the customer's
own feedback. Do not optimize for ranking or promise SEO results.
If the feedback does not contain enough detail for a truthful draft, ask one brief
follow-up question instead of writing a review.

Business: ${client.businessName}
Business location (context only): ${client.city || "Not supplied"}
Customer says they used: ${service}
Their own description of experience: ${experience}
Their feedback in their own words: ${feedback}
Requested language: ${language}

Return a concise first-person draft based only on the customer's words.
No star rating. No heading. No quotation marks.
`;

    const result = await ai.models.generateContent({
      model: MODEL,
      contents: prompt
    });

    const draft = (result.text || "").trim();
    if (!draft) return res.status(502).json({ error: "AI returned an empty draft. Please try again." });

    res.json({ review: draft });
  } catch (error) {
    console.error("Review generation failed:", error?.message || "Unknown error");
    res.status(500).json({ error: "Could not create a draft right now. Please try again." });
  }
});

app.use((err, _req, res, _next) => {
  if (err.message === "Origin not allowed by CORS") {
    return res.status(403).json({ error: "Origin not allowed." });
  }
  console.error(err);
  res.status(500).json({ error: "Server error." });
});

app.listen(PORT, () => console.log(`AIMARKATER API listening on ${PORT}`));
