import OpenAI from 'openai';

let client = null;

export function initOpenAI(apiKey) {
  client = new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    dangerouslyAllowBrowser: true,
  });
}

export async function chatCompletion(systemPrompt, messages, { temperature = 0.7, maxTokens = 2000 } = {}) {
  if (!client) throw new Error('OpenAI not initialized. Call initOpenAI(apiKey) first.');
  
  const response = await client.chat.completions.create({
    model: 'openai/gpt-4o',
    temperature,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
  });
  
  return response.choices[0].message.content;
}

export async function generateExpertMap(caseStudy, systemPrompt) {
  if (!client) throw new Error('OpenAI not initialized.');

  const response = await client.chat.completions.create({
    model: 'openai/gpt-4o',
    temperature: 0.3,
    max_tokens: 4000,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate an expert concept map for this case study:\n\n${caseStudy}` },
    ],
  });

  const text = response.choices[0].message.content.trim();
  // Strip markdown fences if present
  const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  return JSON.parse(clean);
}
