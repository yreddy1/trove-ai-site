// --- INTENT NAVIGATION LOGIC ---
function getNavigationIntent(message) {
  const text = message.toLowerCase();

  const patterns = {
    contact: /\b(contact|demo|pricing|price|cost|sales|partnership|partner|talk|speak|reach|connect|inquiry|quote|support|help|email|phone|call|meeting|schedule|book|info@trove-ai\.com)\b/,
    solutions: /\b(solutions?|products?|capabilit|ai\b|sensor|how (it|this) works?|feature|technology|platform|service|offering|tool|deep|visual|cyber|data|careiq|visualiq|deepsenseiq|cyberiq|dataiq)\b/,
    about: /\b(mission|background|company|team|who are you|who is trove|history|founder|leadership|values|about (trove|the company|the team|you|us))\b/,
    home: /\b(home|start|main page|overview|landing|welcome|what is trove|what is lexso|lexso)\b/,
  };

  const matches = Object.entries(patterns)
    .filter(([, pattern]) => pattern.test(text))
    .map(([key]) => key);

  if (matches.length === 0) return null;

  if (matches.includes('contact')) {
    return { navigate_to: 'contact', message: 'Navigating to the contact page to connect with our team.' };
  }
  if (matches.includes('solutions')) {
    return { navigate_to: 'solutions', message: 'Navigating to the solutions page for product and technology details.' };
  }
  if (matches.includes('about')) {
    return { navigate_to: 'about', message: 'Navigating to the about page for company information.' };
  }
  if (matches.includes('home')) {
    return { navigate_to: 'home', message: 'Navigating to the home page for an overview.' };
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
