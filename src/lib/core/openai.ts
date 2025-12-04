import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Use this type instead of ChatCompletionMessageParam
type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export async function askOpenAI(messages: ChatMessage[]) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  try {
    console.log('Sending request to OpenAI with messages:', messages);

    const response = await openai.chat.completions.create({
      model: 'gpt-5-mini-2025-08-07',
      messages,
    });

    const content = response.choices?.[0]?.message?.content ?? '';
    console.log('OpenAI response:', content);
    return content;
  } catch (err) {
    console.error('OpenAI request failed:', err);
    throw err;
  }
}
