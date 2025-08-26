import 'dotenv/config';

const API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini';

export async function shortExplanation(system: string, user: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return '';

  try {
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(process.env.OPENAI_ORG ? { 'OpenAI-Organization': process.env.OPENAI_ORG } : {}),
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        temperature: 0.2,
        max_tokens: 220,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('[openai] HTTP', resp.status, text);
      return '';
    }
    const json: any = await resp.json();
    return json?.choices?.[0]?.message?.content?.trim() || '';
  } catch (err) {
    console.error('[openai] network/other error:', err);
    return '';
  }
}
