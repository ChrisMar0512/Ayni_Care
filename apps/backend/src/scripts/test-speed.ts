import { GoogleGenAI } from '@google/genai';

async function main() {
  const ai = new GoogleGenAI({ apiKey: 'AQ.Ab8RN6Ltby_39xeGNfcUe4zCPXSO53Gd9J7ZKPinHpUvE-S6LQ' });
  const t0 = Date.now();
  const res = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: 'Hola',
  });
  console.log(`gemini-3.6-flash tardó: ${Date.now() - t0}ms -> ${res.text}`);
}

main();
