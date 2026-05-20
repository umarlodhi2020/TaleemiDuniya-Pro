// Lightweight OpenAI wrapper used by the AI Agent UI.
// Expects a Vite env var `VITE_OPENAI_KEY` to be set in the deployment environment.
export async function generateAIReply(prompt, { systemPrompt } = {}) {
  const key = import.meta.env.VITE_OPENAI_KEY;
  if (!key) {
    throw new Error('OpenAI API key not configured. Set VITE_OPENAI_KEY in your environment.');
  }

  const body = {
    model: 'gpt-4o-mini',
    messages: [],
    max_tokens: 800,
    temperature: 0.2,
  };

  if (systemPrompt) body.messages.push({ role: 'system', content: systemPrompt });
  body.messages.push({ role: 'user', content: prompt });

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    const err = data?.error?.message || 'OpenAI request failed';
    throw new Error(err);
  }

  const message = data.choices?.[0]?.message?.content || '';
  return message;
}
