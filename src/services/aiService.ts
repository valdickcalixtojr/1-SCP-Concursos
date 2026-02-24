import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const identifyUF = async (institution: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Identifique a Unidade Federativa (UF) do Brasil para o seguinte órgão ou instituição: "${institution}". 
      Responda APENAS com a sigla de 2 letras (ex: SP, RJ, MG). 
      Se for um órgão federal ou nacional, responda "BR". 
      Se não for possível identificar, responda "N/A".`,
      config: {
        responseMimeType: "text/plain",
      },
    });

    const uf = response.text?.trim().toUpperCase();
    if (uf && uf.length <= 3) {
      return uf;
    }
    return null;
  } catch (error) {
    console.error("Error identifying UF with Gemini:", error);
    return null;
  }
};

export const identifyMultipleUFs = async (institutions: { id: string, name: string }[]): Promise<{ id: string, uf: string }[]> => {
  if (institutions.length === 0) return [];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Identifique a Unidade Federativa (UF) do Brasil para os seguintes órgãos. 
      Retorne um array JSON de objetos com 'id' e 'uf'. 
      A UF deve ser a sigla de 2 letras (ex: SP, RJ, MG) ou "BR" para órgãos nacionais.
      Se não souber, retorne "N/A".
      
      Lista:
      ${institutions.map(i => `- ID: ${i.id}, Nome: ${i.name}`).join('\n')}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              uf: { type: Type.STRING },
            },
            required: ["id", "uf"],
          },
        },
      },
    });

    const result = JSON.parse(response.text || "[]");
    return result;
  } catch (error) {
    console.error("Error identifying multiple UFs with Gemini:", error);
    return [];
  }
};

export const identifyUFWithMaps = async (institution: string): Promise<string | null> => {
  try {
    // Maps grounding is only supported in Gemini 2.5 series models.
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Pesquise no Google Maps e identifique a Unidade Federativa (UF) do Brasil para o seguinte órgão ou instituição: "${institution}". 
      Responda APENAS com a sigla de 2 letras (ex: SP, RJ, MG). 
      Se for um órgão federal ou nacional, responda "BR". 
      Se não for possível identificar, responda "N/A".`,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    const uf = response.text?.trim().toUpperCase();
    // Basic validation of the response
    if (uf && uf.length <= 3 && uf !== 'N/A') {
      return uf;
    }
    return null;
  } catch (error) {
    console.error("Error identifying UF with Google Maps grounding:", error);
    return null;
  }
};

export const standardizeDates = async (items: { id: string, rawDate: string }[]): Promise<{ id: string, cleanDate: string }[]> => {
  if (items.length === 0) return [];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Padronize as datas de concursos para o formato DD/MM/AAAA.
      Se a data contiver apenas dia e mês (ex: 10/04), assuma o ano de 2026.
      Se o campo indicar que está suspenso, cancelado, a definir ou não disponível, retorne "Suspenso", "A Definir" ou "N/A" conforme o caso.
      Se houver um intervalo ou múltiplas datas, use a data final ou a principal.
      
      Retorne um array JSON de objetos com 'id' e 'cleanDate'.
      
      Lista:
      ${items.map(i => `- ID: ${i.id}, Data: ${i.rawDate}`).join('\n')}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              cleanDate: { type: Type.STRING },
            },
            required: ["id", "cleanDate"],
          },
        },
      },
    });

    const result = JSON.parse(response.text || "[]");
    return result;
  } catch (error) {
    console.error("Error standardizing dates with Gemini:", error);
    return [];
  }
};
