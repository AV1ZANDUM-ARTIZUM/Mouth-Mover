// Mouth Mover — FREE browser AI engine.
// No OpenAI credits, API calls, or paid backend required for chat.
(() => {
  'use strict';

  const originalFetch = window.fetch.bind(window);
  const MEMORY_KEY = 'mouth-mover-free-memory-v1';
  const SETTINGS_KEY = 'mouth-mover-v1';

  const clean = (v, max = 2400) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, max);
  const loadMemory = () => { try { return JSON.parse(localStorage.getItem(MEMORY_KEY) || '{}'); } catch { return {}; } };
  const saveMemory = m => { try { localStorage.setItem(MEMORY_KEY, JSON.stringify(m)); } catch {} };

  function getCharacter(body) {
    return body?.character || {};
  }

  function getLastUser(messages) {
    return [...(Array.isArray(messages) ? messages : [])].reverse().find(m => m?.role === 'user')?.content || '';
  }

  function remember(character, text) {
    const id = clean(character.id || character.name || 'default', 100);
    const all = loadMemory();
    const mem = all[id] || { facts: [], topics: [], name: character.name || 'Character' };
    const t = clean(text, 600);

    const nameMatch = t.match(/\b(?:my name is|i am|i'm|call me)\s+([A-Za-z][A-Za-z0-9 _'-]{1,30})/i);
    if (nameMatch) mem.userName = nameMatch[1].trim();
    if (/\bmy favorite\b/i.test(t) || /\bi like\b/i.test(t) || /\bi love\b/i.test(t)) {
      mem.facts.push(t);
    }
    if (t.length > 12) mem.topics.push(t.slice(0, 180));
    mem.facts = [...new Set(mem.facts)].slice(-12);
    mem.topics = [...new Set(mem.topics)].slice(-12);
    all[id] = mem;
    saveMemory(all);
    return mem;
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function localReply(body) {
    const character = getCharacter(body);
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const user = clean(getLastUser(messages));
    const name = clean(character.name || 'AI character', 80);
    const personality = clean(character.personality || 'friendly, curious and helpful', 1200);
    const backstory = clean(character.backstory || '', 1400);
    const style = clean(character.style || 'natural and conversational', 700);
    const mem = remember(character, user);
    const lower = user.toLowerCase();

    if (!user) return `Hey! I'm ${name}. What should we talk about?`;
    if (/^(hi|hello|hey|yo|sup|hiya)\b/i.test(user)) {
      return pick([`Hey! It's ${name}! 😄 What are we getting into?`, `Hi! I'm ${name}. I'm ready for an adventure.`, `Hey there! Tell me what's on your mind.`]);
    }
    if (/what(?:'s| is) my name|do you remember my name/i.test(lower)) {
      return mem.userName ? `Of course! You told me your name is ${mem.userName}. 😊` : `I don't know your name yet. Tell me and I'll remember it for this character.`;
    }
    if (/what do you remember|remember about me|my memories/i.test(lower)) {
      const bits = [];
      if (mem.userName) bits.push(`your name is ${mem.userName}`);
      if (mem.facts.length) bits.push(...mem.facts.slice(-3));
      return bits.length ? `I remember ${bits.join('; ')}.` : `I haven't learned much about you yet. Tell me something you'd like me to remember!`;
    }
    if (/who are you|what are you|tell me about yourself/i.test(lower)) {
      return `${name}: ${personality}${backstory ? ` ${backstory}` : ''} My speaking style is ${style}.`;
    }
    if (/what can you do|help me|features/i.test(lower)) {
      return `I can chat with you for free in your browser, remember useful things for this character, speak replies aloud, and listen to your voice when your browser supports it. Try asking me anything!`;
    }
    if (/\b(joke|funny)\b/i.test(lower)) {
      return pick([`Why did the computer go to the doctor? It had a virus. 😄`, `I tried to catch some fog yesterday. I mist.`, `My favorite exercise is running… out of storage space.`]);
    }
    if (/\b(bye|goodbye|see ya|good night)\b/i.test(lower)) return `See you later! I'll be right here when you come back. 👋`;
    if (/\b(thank|thanks)\b/i.test(lower)) return pick([`Anytime! 😄`, `You're welcome!`, `Of course! That's what I'm here for.`]);
    if (/\b(sad|upset|angry|stressed|worried|bad day|lonely)\b/i.test(lower)) return `I'm here with you. You don't have to solve everything at once. Want to tell me what happened?`;
    if (/\b(happy|excited|awesome|great|good news)\b/i.test(lower)) return `YES! 😄 I can feel the excitement. Tell me everything!`;
    if (/\?$/.test(user) || /^(how|why|what|when|where|who|can|could|should|would|is|are|do|does|did)\b/i.test(lower)) {
      return `${pick(['Good question!', 'Interesting one!', 'Let me think about that for a second.'])} Based on what you've told me, I'd approach it step by step. ${name} would say: start with the simplest explanation, test it, and then build from there. If you give me a little more detail, I can make the answer more specific.`;
    }

    const recent = messages.filter(m => m?.role === 'user').slice(-4).map(m => clean(m.content, 120)).filter(Boolean);
    const callback = mem.userName ? `, ${mem.userName}` : '';
    return pick([
      `I'm listening${callback}. ${pick(['Tell me more about that.', 'What happened next?', 'What part matters most to you?', 'What would you like to do with that idea?'])}`,
      `That sounds interesting. ${name} is curious about one thing: what do you want to happen next?`,
      `Okay, I'm following. You said: “${clean(user, 180)}” — let's build on that.`,
      recent.length > 1 ? `We've been talking about ${clean(recent[0], 80)} and now this. I think there's a connection worth exploring.` : `Got it! I'm keeping that in mind for our conversation.`
    ]);
  }

  function localResponse(body) {
    return new Response(JSON.stringify({ reply: localReply(body), offline: true, provider: 'Mouth Mover Free Browser AI' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  }

  // Intercept the app's normal POST before it can contact the paid Worker.
  window.fetch = async (input, init = {}) => {
    let url = '';
    try { url = typeof input === 'string' ? input : input?.url || ''; } catch {}
    const method = String(init?.method || 'GET').toUpperCase();
    if (method === 'POST' && /mouth-mover-ai\.stedford30\.workers\.dev/i.test(url)) {
      try { return localResponse(JSON.parse(String(init.body || '{}'))); }
      catch { return new Response(JSON.stringify({ error: 'Invalid chat request.' }), { status: 400, headers: { 'Content-Type': 'application/json' } }); }
    }
    return originalFetch(input, init);
  };

  function findAvatar() {
    return document.querySelector('#chat-character-card .portrait, #chat-character-card .avatar, .chat-character .portrait, .chat-header .portrait, #chat-character-card .avatar-fallback');
  }

  function addFreeUI() {
    if (!document.body || document.getElementById('mouth-mover-free-tools')) return;
    const style = document.createElement('style');
    style.id = 'mouth-mover-free-style';
    style.textContent = `
      #mouth-mover-free-tools{position:fixed;left:14px;bottom:14px;z-index:2147483000;display:flex;align-items:center;gap:7px;padding:8px 10px;border-radius:14px;background:rgba(17,24,39,.94);color:#fff;box-shadow:0 8px 30px #0005;font:12px system-ui,sans-serif}
      #mouth-mover-free-tools button{border:0;border-radius:9px;padding:7px 9px;background:#fff;color:#111;cursor:pointer;font-weight:700}
      #mouth-mover-free-tools .free-badge{font-weight:800}
      .mouth-mover-speaking{animation:mouthMoverTalk .16s ease-in-out infinite alternate;filter:drop-shadow(0 0 9px #fff7)}
      @keyframes mouthMoverTalk{from{transform:translateY(0) scale(1)}to{transform:translateY(-2px) scale(1.035)}}
    `;
    document.head.appendChild(style);
    const box = document.createElement('div'); box.id = 'mouth-mover-free-tools';
    box.innerHTML = `<span class="free-badge">⚡ FREE AI</span><button id="mm-listen">🎙️ Talk</button><button id="mm-speak">🔊 Speak</button>`;
    document.body.appendChild(box);

    const listen = box.querySelector('#mm-listen');
    const speak = box.querySelector('#mm-speak');
    const input = () => document.querySelector('#message-input');
    let recognition;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      recognition = new SR(); recognition.lang = navigator.language || 'en-US'; recognition.interimResults = false; recognition.continuous = false;
      recognition.onstart = () => { listen.textContent = '⏹️ Listening'; };
      recognition.onend = () => { listen.textContent = '🎙️ Talk'; };
      recognition.onerror = () => { listen.textContent = '🎙️ Talk'; };
      recognition.onresult = e => { const text = e.results?.[0]?.[0]?.transcript || ''; const el = input(); if (el && text) { el.value = text; el.dispatchEvent(new Event('input', { bubbles:true })); el.focus(); } };
      listen.onclick = () => { try { recognition.start(); } catch { try { recognition.stop(); } catch {} } };
    } else {
      listen.title = 'Voice input is not supported by this browser'; listen.onclick = () => alert('Voice input is not supported by this browser. Try Chrome or Edge.');
    }

    speak.onclick = () => {
      const msgs = document.querySelectorAll('#messages .message');
      const last = [...msgs].reverse().find(x => x.querySelector('.message-content, p, .bubble'));
      const text = clean(last?.innerText || '', 1500);
      if (!text || !('speechSynthesis' in window)) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); u.rate = .98; u.pitch = 1;
      const avatar = findAvatar();
      u.onstart = () => avatar?.classList.add('mouth-mover-speaking');
      u.onend = u.onerror = () => avatar?.classList.remove('mouth-mover-speaking');
      speechSynthesis.speak(u);
    };

    document.addEventListener('click', e => {
      const stop = e.target.closest('[data-action="stop-speaking"]');
      if (stop && 'speechSynthesis' in window) { speechSynthesis.cancel(); findAvatar()?.classList.remove('mouth-mover-speaking'); }
    });
  }

  function setFreeStatus() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      const state = raw ? JSON.parse(raw) : {};
      state.settings = state.settings || {};
      state.settings.apiUrl = '';
      state.settings.demoMode = true;
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(state));
    } catch {}
  }

  setFreeStatus();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addFreeUI, { once:true });
  else addFreeUI();
  new MutationObserver(addFreeUI).observe(document.documentElement, { childList:true, subtree:true });

  window.mouthMoverFreeAI = { reply: localReply, clearMemory: () => localStorage.removeItem(MEMORY_KEY) };
})();
