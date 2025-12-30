
import { GoogleGenAI, Type } from "@google/genai";

// AI summarization using gemini-3-flash-preview
export async function summarizeContent(title: string, description: string): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide a very brief (max 15 words) tl;dr summary of this content:
      Title: ${title}
      Text: ${description.substring(0, 1000)}`,
    });
    return response.text?.trim() || "Summary could not be generated.";
  } catch (error: any) {
    console.error("AI Summarization failed:", error);
    return "AI error: Unable to summarize.";
  }
}

// Suggest tags using structured JSON output from gemini-3-flash-preview
export async function suggestTags(title: string, description: string): Promise<string[]> {
  try {
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
