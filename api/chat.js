import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

async function detectLanguage(userMessage) {
  if (!openai) return 'en';

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [
        {
          role: 'system',
          content:
            "Detect the user's language and respond with the ISO 639-1 language code (e.g., en, es, fr, de). If unsure, respond with 'en'. Return only the code."
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
    });

    const code = completion.choices?.[0]?.message?.content?.trim().toLowerCase();
    if (code && /^[a-z]{2}$/.test(code)) return code;
  } catch (error) {
    console.error('Language Detection Error:', error);
  }

  return 'en';
}

async function localizeMessage(message, userMessage) {
  if (!openai) return message;

  try {
    const language = await detectLanguage(userMessage);
    if (language === 'en') return message;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            `Translate the assistant response into language code "${language}". Preserve product names (CareIQ, VisualIQ, DeepSenseIQ, CyberIQ, DataIQ, LEXSO, Trove) and any URLs or email addresses. Return only the translated text without quotes or extra commentary.`
        },
        {
          role: 'user',
          content: `User message: ${userMessage}\nAssistant response: ${message}`
        }
      ],
    });

    const translated = completion.choices?.[0]?.message?.content?.trim();
    return translated || message;
  } catch (error) {
    console.error('Localization Error:', error);
    return message;
  }
}

// --- INTENT NAVIGATION LOGIC ---
function getNavigationIntent(message) {
  const text = message.toLowerCase();

  const productIntents = [
    {
      pattern: /\bcare\s?iq\b/,
      message: 'CareIQ provides continuous, privacy-first monitoring for childcare and education safety.',
    },
    {
      pattern: /\bvisual\s?iq\b/,
      message: 'VisualIQ turns live and recorded video into actionable security and operational insight.',
    },
    {
      pattern: /\bdeep\s?sense\s?iq\b/,
      message: 'DeepSenseIQ fuses cameras, sensors, and systems into a unified operational picture.',
    },
    {
      pattern: /\bcyber\s?iq\b/,
      message: 'CyberIQ correlates signals across networks to surface threats earlier and reduce response time.',
    },
    {
      pattern: /\bdata\s?iq\b/,
      message: 'DataIQ delivers secure document intelligence with OCR, semantic search, and structured extraction.',
    },
  ];

  const patterns = {
    contact: /\b(contact|demo|pricing|price|cost|sales|partnership|partner|talk|speak|reach|connect|inquiry|quote|support|help|email|phone|call|meeting|schedule|book|info@trove-ai\.com)\b/,
    solutions: /\b(solutions?|products?|capabilit|ai\b|sensor|how (it|this) works?|feature|technology|platform|service|offering|tool|deep|visual|cyber|data|careiq|visualiq|deepsenseiq|cyberiq|dataiq)\b/,
    about: /\b(mission|background|company|team|who are you|who is trove|history|founder|leadership|values|about (trove|the company|the team|you|us))\b/,
    home: /\b(home|start|main page|overview|landing|welcome|what is trove|what is lexso|lexso)\b/,
  };

  if (patterns.contact.test(text)) {
    return {
      navigate_to: 'contact',
      message: 'We can connect you with our team for demos, pricing, or partnerships.'
    };
  }

  if (/\blexso\b/.test(text)) {
    return {
      navigate_to: 'home',
      message: 'LEXSO is our strategic partnership with Constellis, combining operational expertise with our AI platform.'
    };
  }

  const productMatch = productIntents.find((item) => item.pattern.test(text));
  if (productMatch) {
    return {
      navigate_to: 'solutions',
      message: `${productMatch.message} Taking you to the Solutions page.`
    };
  }

  if (patterns.solutions.test(text)) {
    return {
      navigate_to: 'solutions',
      message: 'We offer platforms like CareIQ, DeepSenseIQ, CyberIQ, and DataIQ for mission-critical operations.'
    };
  }
  if (patterns.about.test(text)) {
    return {
      navigate_to: 'about',
      message: 'Our mission is to deliver AI-powered solutions for safety, security, and mission-critical decision-making.'
    };
  }
  if (patterns.home.test(text)) {
    return {
      navigate_to: 'home',
      message: 'Here is a quick overview of Trove and LEXSO.'
    };
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const navIntent = getNavigationIntent(message);
  if (navIntent) {
    const localized = await localizeMessage(navIntent.message, message);
    return res.status(200).json({
      navigate_to: navIntent.navigate_to,
      message: localized,
    });
  }

  // Ambiguous intent: ask exactly one clarifying question (no navigation)
  const fallbackQuestion = "Do you want information about our company, our solutions, or to contact us?";
  const localizedQuestion = await localizeMessage(fallbackQuestion, message);
  return res.status(200).json({
    message: localizedQuestion
  });
}
