import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    const mp3 = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "marin",
      instructions: "Speak in clear, professional English with a noticeably German accent. Keep the tone warm, confident, and concise.",
      input: text,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    res.setHeader('Content-Type', 'audio/mpeg');
    res.status(200).send(buffer);
  } catch (error) {
    console.error('OpenAI TTS Error:', error);
    res.status(500).json({ error: 'Error generating speech' });
  }
}
