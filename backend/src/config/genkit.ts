import dotenv from "dotenv";
dotenv.config();

import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/googleai";

const apiKey =
  process.env.GEMINI_API_KEY?.trim() ||
  process.env.GOOGLE_GENAI_API_KEY?.trim() ||
  process.env.GOOGLE_API_KEY?.trim();

if (!apiKey) {
  console.warn("[Genkit] Warning: No API key found in GEMINI_API_KEY, GOOGLE_GENAI_API_KEY, or GOOGLE_API_KEY.");
} else {
  process.env.GEMINI_API_KEY = apiKey;
  process.env.GOOGLE_GENAI_API_KEY = apiKey;
  process.env.GOOGLE_API_KEY = apiKey;
}

const rawModel = process.env.GEMINI_MODEL?.trim();
const modelName = rawModel && !rawModel.includes("1.5") && !rawModel.includes("2.0") && !rawModel.includes("2.5") ? rawModel : "googleai/gemini-3.6-flash";

export const ai = genkit({
  plugins: [googleAI({ apiKey })],
  model: modelName
});

