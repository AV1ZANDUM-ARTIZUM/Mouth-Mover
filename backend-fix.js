// Mouth Mover — FREE browser conversation engine v2.
// No OpenAI credits, API calls, or paid backend required for chat.
(() => {
  'use strict';

  const originalFetch = window.fetch.bind(window);
  const MEMORY_KEY = 'mouth-mover-free-memory-v2';
  const SETTINGS_KEY = 'mouth-mover-v1';
  const clean = (v, max = 2400) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, max);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const loadMemory = () => { try { return JSON.parse(localStorage.getItem(MEMORY_KEY) || '{}'); } catch { return {}; } };
  const saveMemory = m => { try { localStorage.setItem(MEMORY_KEY, JSON.stringify(m)); } catch {} };

  function memoryFor(character) {
    const all = loadMemory();
    const id = clean(character.id || character.name || 'default', 100);
    const mem = all[id] || { facts: [], topics: [], turns: 0, name: character.name || 'Character' };
    all[id] = mem;
    return { all, id, mem };
  }

  function remember(character, text) {
    const { all, id, mem } = memoryFor(character);
    const t = clean(text, 600);
    mem.turns++;
    const nameMatch = t.match(/\b(?:my name is|i am|i'm|call me)\s+([A-Za-z][A-Za-z0-9 _'-]{1,30})/i);
    if (nameMatch) mem.userName = nameMatch[1].trim();
    if (/\bmy favorite\b|\bi like\b|\bi love\b|\bi hate\b|\bi dislike\b/i.test(t)) mem.facts.push(t);
    if (t.length > 12) mem.topics.push(t.slice(0, 180));
    mem.facts = [...new Set(mem.facts)].slice(-20);
    mem.topics = [...new Set(mem.topics)].slice(-20);
    all[id] = mem;
    saveMemory(all);
    return mem;
  }

  function getCharacter(body) { return body?.character || {}; }
  function userMessages(messages) { return (Array.isArray(messages) ? messages : []).filter(m => m?.role === 'user'); }
  function getLastUser(messages) { return [...(Array.isArray(messages) ? messages : [])].reverse().find(m => m?.role === 'user')?.content || ''; }

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
    const recent = userMessages(messages).slice(-5).map(m => clean(m.content, 180)).filter(Boolean);
    const callback = mem.userName ? `, ${mem.userName}` : '';

    if (!user) return `Hey! I'm ${name}. What should we talk about?`;

    // Natural conversational callbacks.
    if (/^(hi|hello|hey|yo|sup|hiya)\b/i.test(user)) {
      return pick([`Hey! It's ${name}! 😄 What are we getting into?`, `Hi! I'm ${name}. I'm ready for an adventure.`, `Hey there${callback}! Tell me what's on your mind.`]);
    }
    if (/what(?:'s| is) my name|do you remember my name/i.test(lower)) {
      return mem.userName ? `Of course! You told me your name is ${mem.userName}. 😊` : `I don't know your name yet. Tell me and I'll remember it for this character.`;
    }
    if (/what do you remember|remember about me|my memories/i.test(lower)) {
      const bits = [];
      if (mem.userName) bits.push(`your name is ${mem.userName}`);
      if (mem.facts.length) bits.push(...mem.facts.slice(-4));
      return bits.length ? `I remember ${bits.join('; ')}.` : `I haven't learned much about you yet. Tell me something you'd like me to remember!`;
    }
    if (/who are you|what are you|tell me about yourself/i.test(lower)) {
      return `${name}: ${personality}${backstory ? ` ${backstory}` : ''} My speaking style is ${style}.`;
    }
    if (/what can you do|help me|features/i.test(lower)) {
      return `I can chat with you for free in your browser, remember useful things for this character, react to the conversation, play simple games, speak replies aloud, and listen when your browser supports voice input.`;
    }

    // Chess/game mode: characters can recognize common notation such as Rook's “Nxe4”.
    if (/\b(nxe|rxe|bxe|qxe|kxe|pxe|e[1-8]|[a-h][1-8]|castle|castles|checkmate|check)\b/i.test(user)) {
      if (/nxe4/i.test(user)) return pick([`Nxe4. 😏 Nice capture. Your move.`, `Nxe4! Knight takes e4. I thought you'd notice that. ♟️`, `Nxe4 — exactly. I'm watching the board. What do you play next?`]);
      if (/checkmate/i.test(lower)) return `CHECKMATE! ♟️🏆 Okay, that was a good one. Want a rematch?`;
      if (/castle|castles/i.test(lower)) return `Castling! Good defensive thinking. 👑 Now I'm looking for your next idea.`;
      return pick([`Interesting move. ♟️ I'm thinking about the position...`, `I see it. Your move changes the whole board.`, `Okay, I'm following the game. What happens next?`]);
    }

    if (/\b(joke|funny)\b/i.test(lower)) return pick([`Why did the computer go to the doctor? It had a virus. 😄`, `I tried to catch some fog yesterday. I mist.`, `My favorite exercise is running… out of storage space.`]);
    if (/\b(bye|goodbye|see ya|good night)\b/i.test(lower)) return `See you later! I'll be right here when you come back. 👋`;
    if (/\b(thank|thanks)\b/i.test(lower)) return pick([`Anytime! 😄`, `You're welcome!`, `Of course! That's what I'm here for.`]);
    if (/\b(sad|upset|angry|stressed|worried|bad day|lonely)\b/i.test(lower)) return pick([`I'm here with you. You don't have to solve everything at once. Want to tell me what happened?`, `That sounds rough. I'm listening${callback}.`, `Okay. No pressure to fix it immediately. Tell me what's going on.`]);
    if (/\b(happy|excited|awesome|great|good news)\b/i.test(lower)) return pick([`YES! 😄 I can feel the excitement. Tell me everything!`, `Okay, NOW you've got my attention! What happened?!`, `That's awesome! I'm celebrating with you. 🎉`]);

    // Character-specific flavor from the personality/style text.
    const flavor = /gamer|gaming/i.test(`${personality} ${style}`) ? pick(['That sounds like a challenge. 🎮', 'Okay, teammate—I'm in.', 'We are absolutely turning this into a side quest.'])
      : /space|astronomy|pilot/i.test(`${personality} ${backstory} ${style}`) ? pick(['That belongs in the mission log. 🚀', 'Interesting... the stars would approve.', 'Okay, captain. What is our next move?'])
      : /mystery|detective|puzzle|codebreaker/i.test(`${personality} ${backstory} ${style}`) ? pick(['Interesting. There may be a clue hiding in that.', 'I noticed that detail. 👀', 'Now THAT gives me something to investigate.'])
      : /magic|theater|dramatic/i.test(`${personality} ${style}`) ? pick(['Now that has potential. ✨', 'And suddenly, the scene becomes interesting...', 'Oh, this deserves a little drama.'])
      : pick(['Tell me more.', 'I’m listening.', 'Okay, I’m following.', 'That is interesting.']);

    if (/\?$/.test(user) || /^(how|why|what|when|where|who|can|could|should|would|is|are|do|does|did)\b/i.test(lower)) {
      return `${flavor} ${pick(['I’d approach it step by step.', 'Let’s break it into smaller pieces.', 'The simplest way to think about it is to start with what we already know.'])} If you give me another detail, I can keep the conversation going from there.`;
    }

    if (recent.length > 1) {
      const previous = recent[recent.length - 2];
      return pick([
        `${flavor} You just mentioned “${clean(user, 150)},” and I’m connecting it with what you said before: “${clean(previous, 100)}.”`,
        `Okay, I'm following${callback}. You said “${clean(user, 150)}.” What happens next?`,
        `I remember where we were going with this. ${flavor} Keep going!`
      ]);
    }

    return pick([
      `${flavor} ${pick(['What do you want to do next?', 'What part matters most to you?', 'What happened next?', 'Where should we take this conversation?'])}`,
      `Okay, I'm following${callback}. You said: “${clean(user, 180)}” — let's build on that.`,
      `Got it${callback}! I'm keeping that in mind for our conversation.`
    ]);
  }

  function localResponse(body) {
    return new Response(JSON.stringify({ reply: localReply(body), offline: true, provider: 'Mouth Mover Free Browser AI v2' }), {
      status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
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

  function findAvatar() { return document.querySelector('#chat-character-card .portrait, #chat-character-card .avatar, .chat-character .portrait, .chat-header .portrait, #chat-character-card .avatar-fallback'); }

  function addFreeUI() {
    if (!document.body || document.getElementById('mouth-mover-free-tools')) return;
    const style = document.createElement('style');
    style.id = 'mouth-mover-free-style';
    style.textContent = `#mouth-mover-free-tools{position:fixed;left:14px;bottom:14px;z-index:2147483000;display:flex;align-items:center;gap:7px;padding:8px 10px;border-radius:14px;background:rgba(17,24,39,.94);color:#fff;box-shadow:0 8px 30px #0005;font:12px system-ui,sans-serif}#mouth-mover-free-tools button{border:0;border-radius:9px;padding:7px 9px;background:#fff;color:#111;cursor:pointer;font-weight:700}#mouth-mover-free-tools .free-badge{font-weight:800}.mouth-mover-speaking{animation:mouthMoverTalk .16s ease-in-out infinite alternate;filter:drop-shadow(0 0 9px #fff7)}@keyframes mouthMoverTalk{from{transform:translateY(0) scale(1)}to{transform:translateY(-2px) scale(1.035)}}`;
    document.head.appendChild(style);
    const box = document.createElement('div'); box.id = 'mouth-mover-free-tools';
    box.innerHTML = `<span class="free-badge">⚡ FREE AI</span><button id="mm-listen">🎙️ Talk</button><button id="mm-speak">🔊 Speak</button>`;
    document.body.appendChild(box);

    const listen = box.querySelector('#mm-listen');
    const speak = box.querySelector('#mm-speak');
    const input = () => document.querySelector('#message-input');
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const recognition = new SR(); recognition.lang = navigator.language || 'en-US'; recognition.interimResults = false; recognition.continuous = false;
      recognition.onstart = () => { listen.textContent = '⏹️ Listening'; };
      recognition.onend = () => { listen.textContent = '🎙️ Talk'; };
      recognition.onerror = () => { listen.textContent = '🎙️ Talk'; };
      recognition.onresult = e => { const text = e.results?.[0]?.[0]?.transcript || ''; const el = input(); if (el && text) { el.value = text; el.dispatchEvent(new Event('input', { bubbles:true })); el.focus(); } };
      listen.onclick = () => { try { recognition.start(); } catch { try { recognition.stop(); } catch {} } };
    } else listen.onclick = () => alert('Voice input is not supported by this browser. Try Chrome or Edge.');

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
  }

  function setFreeStatus() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY); const state = raw ? JSON.parse(raw) : {};
      state.settings = state.settings || {}; state.settings.apiUrl = ''; state.settings.demoMode = true;
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(state));
    } catch {}
  }

  setFreeStatus();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addFreeUI, { once:true }); else addFreeUI();
  new MutationObserver(addFreeUI).observe(document.documentElement, { childList:true, subtree:true });

  window.mouthMoverFreeAI = { reply: localReply, clearMemory: () => localStorage.removeItem(MEMORY_KEY) };
})();
