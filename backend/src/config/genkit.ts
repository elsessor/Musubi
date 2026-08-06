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
  // Set all env key variations so Genkit and underlying Google GenAI SDK can read it
  process.env.GEMINI_API_KEY = apiKey;
  process.env.GOOGLE_GENAI_API_KEY = apiKey;
  process.env.GOOGLE_API_KEY = apiKey;
}

export const ai = genkit({
  plugins: [googleAI({ apiKey })],
  model: "googleai/gemini-flash-latest"
});
