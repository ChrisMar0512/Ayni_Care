import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
const client = new GoogleGenAI({ apiKey: apiKey! });

const modelsToTest = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-pro',
  'gemini-3.6-flash',
  'gemini-flash-latest',
];

async function testModels() {
  console.log('🧪 Probando modelos de Gemini con la API Key configurada...');
  for (const model of modelsToTest) {
    try {
      const res = await client.models.generateContent({
        model,
        contents: [{ text: 'Hola, di "OK" brevemente.' }],
      });
      console.log(`✅ [${model}] FUNCIONA: "${res.text?.trim()}"`);
    } catch (err: any) {
      console.log(`❌ [${model}] FALLÓ: ${err?.status || err?.code} - ${err?.message?.slice(0, 100)}`);
    }
  }
}

testModels();
