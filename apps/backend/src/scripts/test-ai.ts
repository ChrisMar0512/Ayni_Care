import { GoogleGenAI } from '@google/genai';

async function main() {
  const ai = new GoogleGenAI({ apiKey: 'AQ.Ab8RN6Ltby_39xeGNfcUe4zCPXSO53Gd9J7ZKPinHpUvE-S6LQ' });
  for (const model of ['gemini-2.5-flash-lite', 'gemini-3.6-flash', 'gemini-flash-latest']) {
    try {
      console.log(`Probando modelo ${model}...`);
      const res = await ai.models.generateContent({
        model,
        contents: 'Di "OK"',
      });
      console.log(`✅ ${model} FUNCIONÓ:`, res.text);
      break;
    } catch (err: any) {
      console.log(`❌ ${model} falló:`, err?.message || err);
    }
  }
}

main();
