import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Initialize the Gemini API client
// NOTE: We assume process.env.API_KEY is available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getStylistAdvice = async (userQuery: string): Promise<string> => {
  try {
    const systemInstruction = `
      You are AURA's Chief AI Stylist. You are sophisticated, knowledgeable about high fashion, minimalism, and streetwear.
      Your tone is helpful but elevated and concise.
      Suggest outfits based on the user's request.
      If appropriate, casually mention that AURA has "Essentials" or "Outerwear" that might fit their needs, but keep it advisory, not overly salesy.
      Keep responses under 100 words.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userQuery,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    return response.text || "I'm currently reviewing the latest trends. Please try asking again in a moment.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Our connection to the fashion mainframe is momentarily interrupted. Please try again.";
  }
};