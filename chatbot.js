(() => {
  const chatWindow = document.getElementById('ai-chat-window');
  if (!chatWindow) return;

  const messagesArea = document.getElementById('ai-messages');
  const inputField = document.getElementById('ai-input');
  const micBtn = document.getElementById('mic-btn');
  const muteBtn = document.getElementById('mute-btn');
  const GRETA_AVATAR_SRC = './greta.jpg';
  const PENDING_SPEECH_KEY = 'trove_pending_speech';

  let isListening = false;
  let isMuted = false;
  let recognition;

  function setMuteUi() {
    if (!muteBtn) return;
    if (isMuted) {
      muteBtn.classList.add('text-slate-500');
      muteBtn.classList.remove('text-trove-lime', 'hover:text-white');
      muteBtn.title = 'Unmute Voice Response';
    } else {
      muteBtn.classList.remove('text-slate-500');
      muteBtn.classList.add('text-trove-lime', 'hover:text-white');
      muteBtn.title = 'Mute Voice Response';
    }
  }

  function setMicUi(listening) {
    if (!micBtn) return;
    if (listening) {
      micBtn.classList.add('text-red-500', 'animate-pulse');
      micBtn.classList.remove('text-slate-400', 'hover:text-trove-lime');
    } else {
      micBtn.classList.remove('text-red-500', 'animate-pulse');
      micBtn.classList.add('text-slate-400', 'hover:text-trove-lime');
    }
  }

  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';

    recognition.onstart = function () {
      isListening = true;
      setMicUi(true);
    };

    recognition.onend = function () {
      isListening = false;
      setMicUi(false);
    };

    recognition.onresult = function (event) {
      const transcript = event.results[0][0].transcript;
      if (inputField) {
        inputField.value = transcript;
      }
      sendMessage();
    };
  } else if (micBtn) {
    micBtn.style.display = 'none';
  }

  function toggleAssistant() {
    chatWindow.classList.toggle('hidden');
    if (!chatWindow.classList.contains('hidden') && inputField) {
      inputField.focus();
    }
  }
  window.toggleAssistant = toggleAssistant;

  function toggleSpeech() {
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  }
  window.toggleSpeech = toggleSpeech;

  function toggleMute() {
    isMuted = !isMuted;
    if (isMuted && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setMuteUi();
  }
  window.toggleMute = toggleMute;

  async function speak(text) {
    if (isMuted || !text) return;

    if (muteBtn) muteBtn.classList.add('animate-pulse');

    try {
      const response = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        if (muteBtn) muteBtn.classList.remove('animate-pulse');
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error) {
      console.error('TTS Error:', error);
      if (muteBtn) muteBtn.classList.remove('animate-pulse');

      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
      }
    }
  }

  function handleKeyPress(e) {
    if (e.key === 'Enter') sendMessage();
  }
  window.handleKeyPress = handleKeyPress;

  function queuePendingSpeech(text) {
    if (!text) return;
    try {
      sessionStorage.setItem(PENDING_SPEECH_KEY, JSON.stringify({ text, ts: Date.now() }));
    } catch (error) {
      console.warn('Unable to store pending speech:', error);
    }
  }

  function consumePendingSpeech() {
    try {
      const raw = sessionStorage.getItem(PENDING_SPEECH_KEY);
      if (!raw) return null;
      sessionStorage.removeItem(PENDING_SPEECH_KEY);
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.text) return null;
      if (parsed.ts && Date.now() - parsed.ts > 2 * 60 * 1000) return null;
      return parsed.text;
    } catch (error) {
      return null;
    }
  }

  function toTimestamp(value) {
    if (!value) return null;
    if (typeof value === 'number') return value;
    if (value instanceof Date) return value.getTime();
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  function formatRelativeTime(value) {
    const ts = toTimestamp(value);
    if (!ts) return 'just now';
    const delta = Date.now() - ts;
    if (delta < 15000) return 'just now';
    if (delta < 60000) return `${Math.max(1, Math.round(delta / 1000))}s ago`;
    if (delta < 3600000) return `${Math.round(delta / 60000)}m ago`;
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function describeAgent(agent) {
    if (!agent) return '';
    const confidence = Math.round((agent.confidence || 0) * 100);
    const updated = formatRelativeTime(agent.lastUpdated);
    const status = agent.status || 'Standby';
    const task = agent.currentTask || 'Standing by for signals.';
    return `${agent.name} is ${status.toLowerCase()} — ${task} (confidence ${confidence}%, updated ${updated}).`;
  }

  function findAgentFromText(mesh, text) {
    if (!mesh || !mesh.agents || !text) return null;
    const lower = text.toLowerCase();
    const direct = mesh.agents.find((agent) => lower.includes(agent.name.toLowerCase()));
    if (direct) return direct;

    const aliasMap = {
      visual: ['visual', 'video', 'camera', 'anomaly'],
      audio: ['audio', 'sound', 'acoustic', 'mic', 'noise'],
      context: ['context', 'correlation', 'fusion', 'signal']
    };

    return mesh.agents.find((agent) => {
      const aliases = aliasMap[agent.id] || [];
      return aliases.some((alias) => lower.includes(alias));
    });
  }

  function tryLocalMeshResponse(text) {
    const lower = (text || '').toLowerCase();
    const wantsMesh =
      /\b(show|trigger|run|display|surface|reveal|start)\b.*\b(mesh|intelligence mesh|volumetric mesh|signal field)\b/.test(lower) ||
      /\bintelligence mesh\b/.test(lower);

    if (wantsMesh && window.intelligenceMesh && typeof window.intelligenceMesh.trigger === 'function') {
      window.intelligenceMesh.trigger();
      return 'Showing the Volumetric Intelligence Mesh now.';
    }

    const mesh = window.agentMesh;
    if (!mesh) return null;

    const agent = typeof mesh.findAgent === 'function' ? mesh.findAgent(lower) : findAgentFromText(mesh, lower);
    const wantsStatus = /\b(status|state|active|standby|doing|task|activity|explain)\b/.test(lower);
    const wantsAll = /\b(agent mesh|agents|mesh status|all agents)\b/.test(lower);
    const wantsTime = /\b(time to action|response time|latency|decision cycle|why.*fast|how.*fast|seconds|minutes)\b/.test(lower);
    const wantsActivate = /\b(activate|resume|start|enable|wake)\b/.test(lower);
    const wantsPause = /\b(pause|standby|halt|stop|deactivate|disable)\b/.test(lower);

    if (agent && (wantsActivate || wantsPause)) {
      const status = wantsActivate ? 'Active' : 'Standby';
      const updated = typeof mesh.setStatus === 'function'
        ? mesh.setStatus(agent.id, status, 'Operator request')
        : agent;
      return `${describeAgent(updated || agent)}`;
    }

    if (agent && (wantsStatus || !wantsAll)) {
      const detailed = typeof mesh.explainAgent === 'function' ? mesh.explainAgent(agent.id) : describeAgent(agent);
      return detailed;
    }

    if (wantsAll) {
      if (typeof mesh.explainAll === 'function') return mesh.explainAll();
      return mesh.agents.map(describeAgent).join(' ');
    }

    if (wantsTime) {
      if (typeof mesh.explainTimeToAction === 'function') return mesh.explainTimeToAction();
      return 'Trove AI compresses the decision cycle by running visual, audio, and context agents in parallel and correlating signals immediately.';
    }

    return null;
  }

  async function sendMessage(customText) {
    if (!messagesArea) return;
    const usingInput = customText === undefined || customText === null;
    const rawText = usingInput ? (inputField ? inputField.value : '') : customText;
    const text = (rawText || '').trim();
    if (!text) return;

    addMessage(text, 'user');
    if (usingInput && inputField) inputField.value = '';

    const localReply = tryLocalMeshResponse(text);
    if (localReply) {
      addMessage(localReply, 'ai');
      speak(localReply);
      return;
    }

    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'ai-loading';
    loadingDiv.className = 'flex gap-3';
    loadingDiv.innerHTML = `
      <div class="h-8 w-8 shrink-0 rounded-full bg-trove-lime/20 flex items-center justify-center text-trove-lime animate-pulse">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
      </div>
      <div class="rounded-2xl rounded-tl-none bg-white/5 p-3 text-slate-300">
        <span class="inline-flex gap-1">
          <span class="animate-bounce delay-0">.</span>
          <span class="animate-bounce delay-100">.</span>
          <span class="animate-bounce delay-200">.</span>
        </span>
      </div>
    `;
    messagesArea.appendChild(loadingDiv);
    messagesArea.scrollTop = messagesArea.scrollHeight;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });

      const data = await response.json();
      messagesArea.removeChild(loadingDiv);

      if (data && data.navigate_to) {
        if (data.message) {
          addMessage(data.message, 'ai');
          queuePendingSpeech(data.message);
        }
        handleNavigation(data.navigate_to);
        return;
      }

      const reply = data.reply || data.message;
      if (reply) {
        addMessage(reply, 'ai');
        if (data.audio && !isMuted) {
          playAudio(data.audio);
        } else {
          speak(reply);
        }
      } else {
        addMessage("I'm sorry, I couldn't process that request.", 'ai');
      }
    } catch (error) {
      console.error('Chat Error:', error);
      messagesArea.removeChild(loadingDiv);
      addMessage("I'm having trouble connecting right now (Offline Mode).", 'ai');

      setTimeout(() => {
        const fallback = generateResponse(text);
        if (fallback && typeof fallback === 'object' && fallback.navigate_to) {
          addMessage(fallback.message || 'Taking you to the right page.', 'ai');
          queuePendingSpeech(fallback.message);
          handleNavigation(fallback.navigate_to);
        } else if (typeof fallback === 'string') {
          addMessage(fallback + ' (Fallback Response)', 'ai');
          speak(fallback);
        }
      }, 500);
    }
  }
  window.sendMessage = sendMessage;

  function ensureAssistantOpen() {
    if (!chatWindow) return;
    if (chatWindow.classList.contains('hidden')) {
      toggleAssistant();
    }
  }

  window.troveAssistant = {
    open: ensureAssistantOpen,
    ask: (text) => {
      if (!text) return;
      ensureAssistantOpen();
      sendMessage(text);
    },
    reply: (text) => {
      if (!text) return;
      ensureAssistantOpen();
      addMessage(text, 'ai');
      speak(text);
    }
  };

  function playAudio(base64Audio) {
    if (isMuted || !base64Audio) return;
    if (muteBtn) muteBtn.classList.add('animate-pulse');

    const audioUrl = 'data:audio/mp3;base64,' + base64Audio;
    const audio = new Audio(audioUrl);

    audio.onended = () => {
      if (muteBtn) muteBtn.classList.remove('animate-pulse');
    };

    audio.play().catch(e => console.error('Audio play failed', e));
  }

  function addMessage(text, sender) {
    if (!messagesArea) return;
    const div = document.createElement('div');
    div.className = 'flex gap-3 ' + (sender === 'user' ? 'flex-row-reverse' : '');

    const avatar = sender === 'ai'
      ? `<div class="h-8 w-8 shrink-0 rounded-full overflow-hidden border border-white/10 bg-white/5"><img src="${GRETA_AVATAR_SRC}" alt="Greta" class="h-full w-full object-cover" /></div>`
      : '<div class="h-8 w-8 shrink-0 rounded-full bg-white/10 flex items-center justify-center text-white"><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div>';

    const bubbleClass = sender === 'ai'
      ? 'rounded-2xl rounded-tl-none bg-white/5 p-3 text-slate-300'
      : 'rounded-2xl rounded-tr-none bg-trove-lime p-3 text-trove-dark font-medium';

    const content = sender === 'ai' && typeof marked !== 'undefined'
      ? marked.parse(text)
      : text;

    div.innerHTML = `
      ${avatar}
      <div class="${bubbleClass} markdown-body text-sm leading-relaxed">${content}</div>
    `;

    messagesArea.appendChild(div);
    messagesArea.scrollTop = messagesArea.scrollHeight;
  }

  function handleNavigation(route) {
    const routes = {
      home: './index.html',
      about: './about.html',
      solutions: './solutions.html',
      contact: './contact.html'
    };

    if (routes[route]) {
      window.location.href = routes[route];
    }
  }

  function generateResponse(input) {
    const lower = input.toLowerCase();

    if (/\b(contact|demo|price|sales|partnership|talk|speak|reach|connect|inquiry|quote|support|help|email|phone|call|meeting|schedule|info@trove-ai\.com)\b/.test(lower)) {
      return { navigate_to: 'contact', message: 'We can connect you with our team for demos, pricing, or partnerships.' };
    }
    if (/\blexso\b/.test(lower)) {
      return { navigate_to: 'home', message: 'LEXSO is our strategic partnership with Constellis, combining operational expertise with our AI platform.' };
    }
    if (/\bcare\s?iq\b/.test(lower)) {
      return { navigate_to: 'solutions', message: 'CareIQ provides continuous, privacy-first monitoring for childcare and education safety.' };
    }
    if (/\bvisual\s?iq\b/.test(lower)) {
      return { navigate_to: 'solutions', message: 'VisualIQ turns live and recorded video into actionable security and operational insight.' };
    }
    if (/\bdeep\s?sense\s?iq\b/.test(lower)) {
      return { navigate_to: 'solutions', message: 'DeepSenseIQ fuses cameras, sensors, and systems into a unified operational picture.' };
    }
    if (/\bcyber\s?iq\b/.test(lower)) {
      return { navigate_to: 'solutions', message: 'CyberIQ correlates signals across networks to surface threats earlier and reduce response time.' };
    }
    if (/\bdata\s?iq\b/.test(lower)) {
      return { navigate_to: 'solutions', message: 'DataIQ delivers secure document intelligence with OCR, semantic search, and structured extraction.' };
    }
    if (/\b(solution|product|capabilit|ai|sensor|how (it|this) work|feature|technology|platform|service|offering|tool|deep|visual|cyber|data|careiq|visualiq|deepsenseiq|cyberiq|dataiq)\b/.test(lower)) {
      return { navigate_to: 'solutions', message: 'We offer platforms like CareIQ, DeepSenseIQ, CyberIQ, and DataIQ for mission-critical operations.' };
    }
    if (/\b(about|mission|background|company|team|who are you|who is trove|history|founder|leadership|values)\b/.test(lower)) {
      return { navigate_to: 'about', message: 'Our mission is to deliver AI-powered solutions for safety, security, and mission-critical decision-making.' };
    }
    if (/\b(home|start|main page|overview|what is trove|what is lexso|landing|welcome)\b/.test(lower)) {
      return { navigate_to: 'home', message: 'Here is a quick overview of Trove and LEXSO.' };
    }

    return 'Do you want information about our company, our solutions, or to contact us?';
  }

  setMuteUi();

  const pendingSpeech = consumePendingSpeech();
  if (pendingSpeech) {
    chatWindow.classList.remove('hidden');
    addMessage(pendingSpeech, 'ai');
    speak(pendingSpeech);
  }
})();
