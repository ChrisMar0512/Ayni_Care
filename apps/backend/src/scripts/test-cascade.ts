import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
const client = new GoogleGenAI({ apiKey: apiKey! });

const candidates = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
];

async function testCascade() {
  console.log('🧪 Probando modelos de la lista...');
  for (const model of candidates) {
    try {
      const res = await client.models.generateContent({
        model,
        contents: [{ text: 'Di "Funciona perfecto"' }],
      });
      console.log(`✅ [${model}] -> ${res.text?.trim()}`);
    } catch (e: any) {
      console.log(`❌ [${model}] -> ${e?.status || e?.code}: ${e?.message?.slice(0, 80)}`);
    }
  }
}

testCascade();
