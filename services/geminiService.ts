
import { GoogleGenAI, Type } from "@google/genai";

declare global {
  interface Window {
    aistudio?: any;
  }
}

async function getApiKey(): Promise<string | undefined> {
  if (typeof window !== 'undefined') {
    // 1) Host-provided aistudio
    if (window.aistudio) {
      try {
        if (typeof window.aistudio.getSelectedKey === 'function') {
          const k = await window.aistudio.getSelectedKey();
          if (k) return k;
        }
        if (window.aistudio.selectedKey) return window.aistudio.selectedKey;
      } catch (e) {
        console.warn('aistudio key retrieval failed', e);
      }
    }

    // 2) localStorage persisted key
    try {
      const local = localStorage.getItem('nexus_feed_api_key');
      if (local) return local;
    } catch (e) {
      /* ignore */
    }
  }

  // 3) build-time Vite env (if provided)
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const viteKey = import.meta.env?.VITE_API_KEY;
    if (viteKey) return viteKey;
  } catch (e) {
    /* ignore */
  }

  return undefined;
}

// AI summarization using gemini-3-flash-preview
export async function summarizeContent(title: string, description: string): Promise<string> {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) return 'AI error: No API key available.';
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide a very brief (max 15 words) tl;dr summary of this content:\nTitle: ${title}\nText: ${description.substring(0, 1000)}`,
    });
    return response.text?.trim() || 'Summary could not be generated.';
  } catch (error: any) {
    console.error('AI Summarization failed:', error);
    return 'AI error: Unable to summarize.';
  }
}

// Suggest tags using structured JSON output from gemini-3-flash-preview
export async function suggestTags(title: string, description: string): Promise<string[]> {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) return [];
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Suggest 3-5 tags for this content:\nTitle: ${title}\nDescription: ${description.substring(0, 500)}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ['tags']
        }
      }
    });
    const result = JSON.parse(response.text || '{"tags": []}');
    return result.tags || [];
  } catch (error) {
    console.error('Tag suggestion failed:', error);
    return [];
  }
}
