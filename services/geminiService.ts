
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

// --- Robust API Error Handling with Exponential Backoff ---

/**
 * A utility for retrying an async function with exponential backoff.
 * @param fn The async function to retry.
 * @param retries The maximum number of retries.
 * @param delay The initial delay in milliseconds.
 * @param backoffFactor The factor by which the delay increases.
 * @returns The result of the async function.
 */
const withRetry = async <T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000,
  backoffFactor = 2
): Promise<T> => {
  let lastError: Error | undefined;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${i + 1} of ${retries} failed. Retrying in ${delay}ms...`, error);
      if (i < retries - 1) {
        await new Promise(res => setTimeout(res, delay));
        delay *= backoffFactor;
      }
    }
  }
  throw lastError;
};

// --- Gemini API Configuration ---

// IMPORTANT: In a real-world frontend application, this API key should NOT be
// hardcoded. It should be fetched from a secure backend endpoint that proxies
// requests to the Gemini API. This prevents public exposure of the key.
// For this demo, we use a placeholder.
const API_KEY = "YOUR_GEMINI_API_KEY"; // <-- PASTE YOUR API KEY HERE

let model: GenerativeModel | null = null;

if (!API_KEY || API_KEY === "YOUR_GEMINI_API_KEY") {
  // API key not configured - AI features will be disabled silently
} else {
  const genAI = new GoogleGenerativeAI(API_KEY);
  model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
}

/**
 * Generates design ideas for a product using the Gemini API.
 * @param productName The name of the product to get ideas for.
 * @returns A promise that resolves to an array of design ideas.
 */
export const getDesignIdeas = async (productName: string): Promise<string[]> => {
  if (!model) {
    return Promise.resolve([
        "AI is not configured. Here are some sample ideas:",
        "A retro sunset design.",
        "A funny quote about coffee.",
        "A minimalist line art of a cat."
    ]);
  }

  const prompt = `Generate 5 short, creative, and visually interesting design ideas for a custom ${productName}. The ideas should be concise, one-sentence descriptions. For example: 'A minimalist line drawing of a mountain range at sunrise'. Return the ideas as a simple numbered list.`;

  try {
    const generate = async () => {
        const result = await model!.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        
        if (!text) {
            throw new Error("API returned an empty response.");
        }

        const ideas = text.split('\n').map(line => line.replace(/^\d+\.\s*/, '').trim()).filter(idea => idea.length > 0);
        if (ideas.length === 0) {
            throw new Error("Parsed response contains no ideas.");
        }
        return ideas;
    };

    return await withRetry(generate);

  } catch (error) {
    console.error("Error fetching design ideas from Gemini after retries:", error);
    
    if (error instanceof Error) {
        if (error.message.includes('SAFETY')) {
            return ["The generated ideas were blocked due to safety settings. Please try a different prompt."];
        }
        if (error.message.includes('API key not valid')) {
            return ["The configured Gemini API key is not valid. Please check the key."];
        }
    }
    
    return ["Failed to generate ideas due to an API error. Please try again later."];
  }
};
