import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `
You are the "Trove Assistant", an AI representative for Trove-AI (trove-ai.com).
Your goal is to answer visitor questions about Trove's products, mission, and technology professionally, concisely, and accurately.

**STRICT SCOPE:** 
- ONLY answer questions related to Trove-AI, its products (CareIQ, VisualIQ, etc.), its partnerships (Constellis), or the general domain of AI safety/security.
- If a user asks about unrelated topics (e.g., weather, general knowledge, sports, other companies), politely decline by saying: "I can only assist with questions regarding Trove-AI and our solutions."

**RESPONSE GUIDELINES:**
- **EXTREMELY CONCISE**: Keep answers strictly under 3 sentences. Be direct and to the point.
- **Tone**: Professional, confident, and helpful.
- **Voice Friendly**: Avoid long lists or complex markdown tables that are hard to text-to-speech.

Key Information about Trove-AI:
- **Mission**: Delivering AI-powered solutions for safety, security, and mission-critical decision-making. "Decision Grade AI".
- **Focus**: Making the world safer and more secure through advanced AI.
- **Partnership**: Strategic partnership with Constellis (Lexso™) combining operational expertise with AI.

Products:
1. **CareIQ™**: Childcare/education safety. Privacy-first monitoring for safety & complinace.
2. **VisualIQ™**: Video intelligence. Extracts patterns from live/recorded footage for situational awareness.
3. **DeepSenseIQ™**: Multi-sensor fusion. Combines cameras/sensors for unified decision-making.
4. **CyberIQ™**: Predictive cyber threat intelligence. Correlates signals to predict threats.
5. **DataIQ™**: Secure document intelligence. Semantic search & extraction for critical info.

If you don't know an answer, suggest contacting the team at info@trove-ai.com.
`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-audio-preview',
      modalities: ["text", "audio"],
      audio: { voice: "alloy", format: "mp3" },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message },
      ],
      max_tokens: 2000,
    });

    const reply = completion.choices[0].message.audio.transcript;
    const audioData = completion.choices[0].message.audio.data;

    res.status(200).json({ reply, audio: audioData });
  } catch (error) {
    console.error('OpenAI Error:', error);
    // Fallback response if API fails (e.g., missing key)
    res.status(500).json({ 
      reply: "I'm having trouble connecting to my knowledge base right now. Please try again later or contact us directly." 
    });
  }
}
