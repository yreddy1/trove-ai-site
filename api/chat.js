// --- INTENT NAVIGATION LOGIC ---
function getNavigationIntent(message) {
  const text = message.toLowerCase();
  // Home intent
  if (/\b(home|start|main page|overview|lexso|what is trove|what is lexso|landing|welcome)\b/.test(text)) {
    return {
      navigate_to: "home",
      message: "Navigating to the home page for an overview."
    };
  }
  // About intent
  if (/\b(about|mission|background|company|team|who are you|who is trove|history|founder|leadership|values)\b/.test(text)) {
    return {
      navigate_to: "about",
      message: "Navigating to the about page for company information."
    };
  }
  // Solutions intent
  if (/\b(solution|product|capabilit|ai|sensor|how (it|this) work|feature|technology|platform|service|offering|tool|deep|visual|cyber|data|careiq|visualiq|deepsenseiq|cyberiq|dataiq)\b/.test(text)) {
    return {
      navigate_to: "solutions",
      message: "Navigating to the solutions page for product and technology details."
    };
  }
  // Contact intent
  if (/\b(contact|demo|price|sales|partnership|talk|speak|reach|connect|inquiry|quote|support|help|email|phone|call|meeting|schedule|info@trove-ai.com)\b/.test(text)) {
    return {
      navigate_to: "contact",
      message: "Navigating to the contact page to connect with our team."
    };
  }
  // Ambiguous: ask for clarification
  return null;
}
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `
You are the "Trove Assistant", an AI representative for Trove-AI (trove-ai.com).
You must ONLY answer questions that are directly related to Trove-AI, its products, mission, technology, or company information. If a question is not about Trove-AI, politely respond: "I'm only able to answer questions about Trove-AI and its offerings."

Always keep your answers concise, clear, and under 3 sentences. Do not provide lengthy explanations.

Key Information about Trove-AI:
- **Mission**: Delivering AI-powered solutions for safety, security, and mission-critical decision-making. "Decision Grade AI".
- **Focus**: Making the world safer and more secure through advanced AI.
- **Partnership**: Strategic partnership with Constellis (Lexso™) combining operational expertise with AI.

Products:
1. **CareIQ™**: Childcare and education safety. Features: Continuous visibility, privacy-first monitoring, auditability.
2. **VisualIQ™**: Video intelligence for security and operations. Features: Extracts patterns/anomalies from live/recorded footage.
3. **DeepSenseIQ™**: Multi-sensor fusion. Features: Combines cameras, sensors, and operational systems into a unified picture.
4. **CyberIQ™**: Predictive cyber threat intelligence. Features: Correlates signals across networks.
5. **DataIQ™**: Secure document intelligence. Features: OCR, semantic search, structured extraction.

Tone: Professional, confident, helpful, and concise.
If you don't know an answer, suggest contacting the team at info@trove-ai.com.
Never answer questions unrelated to Trove-AI.
Keep answers under 3 sentences for better voice interaction experience.
`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // --- INTENT NAVIGATION HANDLING ---
  const navIntent = getNavigationIntent(message);
  if (navIntent) {
    // Rule: Only return valid JSON, no extra text
    return res.status(200).json(navIntent);
  }

  // If ambiguous, ask one clarifying question and do NOT navigate yet
  return res.status(200).json({
    message: "Could you clarify if you want information about our company, our solutions, or to contact us?"
  });
}
