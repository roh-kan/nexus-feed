
import { GoogleGenAI, Type } from "@google/genai";

export async function summarizeContent(title: string, description: string): Promise<string> {
  try {
    // Fixed: Initializing GoogleGenAI directly with process.env.API_KEY in the constructor
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide a very brief (max 15 words) tl;dr summary of this content:
      Title: ${title}
      Text: ${description.substring(0, 1000)}`,
      config: {
        maxOutputTokens: 100,
        thinkingConfig: { thinkingBudget: 50 },
        temperature: 0.5,
      },
    });
    return response.text?.trim() || "Summary could not be generated.";
  } catch (error: any) {
    console.error("AI Summarization failed:", error);
    return "AI error: Unable to summarize.";
  }
}

export async function suggestTags(title: string, description: string): Promise<string[]> {
  try {
    // Fixed: Initializing GoogleGenAI directly with process.env.API_KEY in the constructor
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Suggest 3-5 tags for this content:
      Title: ${title}
      Description: ${description.substring(0, 500)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["tags"]
        }
      }
    });
    const result = JSON.parse(response.text || '{"tags": []}');
    return result.tags;
  } catch (error) {
    return [];
  }
}
