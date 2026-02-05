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
      message: 'We can connect you with our team for demos, pricing, or partnerships. Taking you to the Contact page.'
    };
  }

  if (/\blexso\b/.test(text)) {
    return {
      navigate_to: 'home',
      message: 'LEXSO is our strategic partnership with Constellis, combining operational expertise with our AI platform. Taking you to the Home page.'
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
      message: 'We offer platforms like CareIQ, DeepSenseIQ, CyberIQ, and DataIQ for mission-critical operations. Taking you to the Solutions page.'
    };
  }
  if (patterns.about.test(text)) {
    return {
      navigate_to: 'about',
      message: 'Our mission is to deliver AI-powered solutions for safety, security, and mission-critical decision-making. Taking you to the About page.'
    };
  }
  if (patterns.home.test(text)) {
    return {
      navigate_to: 'home',
      message: 'Here is a quick overview of Trove and LEXSO. Taking you to the Home page.'
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
    return res.status(200).json(navIntent);
  }

  // Ambiguous intent: ask exactly one clarifying question (no navigation)
  return res.status(200).json({
    message: "Do you want information about our company, our solutions, or to contact us?"
  });
}
