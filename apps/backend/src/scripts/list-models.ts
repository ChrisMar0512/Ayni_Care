import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
const client = new GoogleGenAI({ apiKey: apiKey! });

async function listModels() {
  const models = await client.models.list();
  console.log('📋 Modelos disponibles para esta API Key:');
  for await (const m of models) {
    if (m.name?.includes('flash') || m.name?.includes('gemini')) {
      console.log(`- ${m.name} (${m.displayName})`);
    }
  }
}

listModels().catch(console.error);
