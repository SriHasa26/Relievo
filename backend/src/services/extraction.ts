import { z } from "zod";
import { config } from "../config";
import type { Category, Extraction, AiAnalysis } from "../types";

export const CATEGORIES = ["medical", "food", "water", "shelter", "rescue", "other"] as const;
export const URGENCIES = ["low", "medium", "high", "critical"] as const;

// The shape every extraction must have, whether it came from Gemini or the keyword fallback.
const ExtractionSchema = z.object({
  category: z.enum(CATEGORIES),
  urgency: z.enum(URGENCIES),
  people_affected: z.number().int().min(0).nullable(),
  needs: z.array(z.string()).default([]),
  vulnerable_persons: z.array(z.string()).default([]),
  missing_info: z.array(z.string()).default([]),
  summary: z.string().min(1),
});

/** Validate untrusted AI output. Throws if malformed. Always forces human verification. */
export function validateExtraction(raw: unknown): Extraction {
  const parsed = ExtractionSchema.parse(raw);
  return { ...parsed, requires_human_verification: true };
}

// ---------- keyword fallback (also used as the MOCK_MODE "AI") ----------

const CATEGORY_KEYWORDS: Record<Exclude<Category, "other">, string[]> = {
  rescue: ["trapped", "stuck", "rescue", "drown", "stranded", "boat", "cannot get out", "can't get out"],
  medical: ["bleed", "injur", "wound", "insulin", "medicine", "unconscious", "fever", "pregnant",
    "heart", "breath", "fracture", "diabet", "ambulance", "hospital", "pain"],
  water: ["drinking water", "no water", "water supply", "thirst", "need water", "water bottles"],
  food: ["food", "hungry", "hunger", "starv", "ration", "meal"],
  shelter: ["shelter", "homeless", "tent", "blanket", "roof collapsed", "house collapsed", "nowhere to stay"],
};
// Tie-break order when two categories match equally often.
const PRIORITY: Category[] = ["rescue", "medical", "water", "food", "shelter"];

const FLOOD_WORDS = ["water is entering", "water entering", "flood", "rising water", "water level"];
const CRITICAL_WORDS = ["not breathing", "unconscious", "trapped", "drowning", "bleeding heavily", "bleeding"];

const VULNERABLE: Record<string, string[]> = {
  elderly: ["elderly", "old man", "old woman", "grandmother", "grandfather", "senior"],
  children: ["child", "kids", "baby", "infant", "toddler"],
  pregnant: ["pregnant"],
  disabled: ["disabled", "wheelchair", "bedridden"],
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fifteen: 15, twenty: 20,
};

const countHits = (text: string, words: string[]) => words.filter((w) => text.includes(w)).length;

function findPeople(text: string): number | null {
  const digits = text.match(/(\d+)\s*(people|persons|members|adults|children|kids|of us)/)
    ?? text.match(/family of (\d+)/) ?? text.match(/we are (\d+)/);
  if (digits?.[1]) return Number(digits[1]);
  const words = text.match(/\b([a-z]+)\s+(people|persons|members|of us)\b/);
  const n = words?.[1] ? NUMBER_WORDS[words[1]] : undefined;
  return n ?? null;
}

export function keywordExtract(originalText: string): { extraction: Extraction; confidence: number } {
  const text = originalText.toLowerCase();

  // category = the one with the most keyword hits
  let category: Category = "other";
  let best = 0;
  for (const c of PRIORITY) {
    const hits = countHits(text, CATEGORY_KEYWORDS[c as Exclude<Category, "other">]);
    if (hits > best) { best = hits; category = c; }
  }

  const vulnerable = Object.entries(VULNERABLE)
    .filter(([, words]) => countHits(text, words) > 0).map(([k]) => k);
  const flooding = countHits(text, FLOOD_WORDS) > 0;

  const needs: string[] = [];
  if (countHits(text, CATEGORY_KEYWORDS.water) > 0) needs.push("water");
  if (countHits(text, CATEGORY_KEYWORDS.food) > 0) needs.push("food");
  if (countHits(text, CATEGORY_KEYWORDS.medical) > 0) needs.push("medical_help");
  if (countHits(text, CATEGORY_KEYWORDS.shelter) > 0) needs.push("shelter");
  if (countHits(text, CATEGORY_KEYWORDS.rescue) > 0) needs.push("rescue");
  if (flooding) needs.push("rescue_assessment"); // a person must assess; the AI does not decide rescue

  let urgency: Extraction["urgency"] = "low";
  if (needs.length > 0) urgency = "medium";
  if (vulnerable.length > 0 || flooding || category === "medical") urgency = "high";
  if (countHits(text, CRITICAL_WORDS) > 0) urgency = "critical";

  const people = findPeople(text);
  const missing: string[] = [];
  if (people === null) missing.push("number of people affected");
  if (originalText.trim().length < 25) missing.push("more detail about the situation");
  if (category === "other") missing.push("type of help needed");

  const extraction = validateExtraction({
    category, urgency, people_affected: people, needs,
    vulnerable_persons: vulnerable, missing_info: missing,
    summary: `${category} request, ${people ?? "unknown number of"} people, urgency ${urgency}`,
  });
  return { extraction, confidence: Math.min(0.9, 0.5 + 0.1 * best) };
}

// ---------- entry point ----------

async function geminiExtract(_text: string): Promise<unknown> {
  // TODO(gemini): call Gemini with a JSON response schema, return the parsed object.
  // Output must still pass validateExtraction(). Not implemented yet by design.
  throw new Error("Gemini not implemented yet");
}

export async function extractIncident(
  text: string,
): Promise<Pick<AiAnalysis, "extracted_data" | "confidence" | "source" | "model_version">> {
  if (!config.mockMode && config.geminiApiKey) {
    try {
      const extraction = validateExtraction(await geminiExtract(text));
      return { extracted_data: extraction, confidence: 0.8, source: "gemini", model_version: "gemini" };
    } catch {
      // malformed JSON, rate limit, or not implemented: fall through to keywords
    }
  }
  const { extraction, confidence } = keywordExtract(text);
  return {
    extracted_data: extraction,
    confidence,
    source: config.mockMode ? "mock" : "fallback",
    model_version: "keyword-v1",
  };
}
