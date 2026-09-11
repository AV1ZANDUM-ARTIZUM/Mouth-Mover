// Mouth Mover — FREE browser conversation engine v3.
// Normal chat never calls the paid Cloudflare/OpenAI backend.
(() => {
  'use strict';

  const originalFetch = window.fetch.bind(window);
  const MEMORY_KEY = 'mouth-mover-free-memory-v3';
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
  function allMessages(body) { return Array.isArray(body?.messages) ? body.messages : []; }
  function userMessages(messages) { return messages.filter(m => m?.role === 'user'); }
  function getLastUser(messages) { return [...messages].reverse().find(m => m?.role === 'user')?.content || ''; }
  function getLastAssistant(messages) { return [...messages].reverse().find(m => m?.role === 'assistant')?.content || ''; }

  function localReply(body) {
    const character = getCharacter(body);
    const messages = allMessages(body);
    const user = clean(getLastUser(messages));
    const assistant = clean(getLastAssistant(messages), 500);
    const name = clean(character.name || 'AI character', 80);
    const personality = clean(character.personality || 'friendly, curious and helpful', 1200);
    const backstory = clean(character.backstory || '', 1400);
    const style = clean(character.style || 'natural and conversational', 700);
    const mem = remember(character, user);
    const lower = user.toLowerCase();
    const recent = userMessages(messages).slice(-5).map(m => clean(m.content, 180)).filter(Boolean);
    const callback = mem.userName ? `, ${mem.userName}` : '';
    const context = `${personality} ${backstory} ${style}`.toLowerCase();

    if (!user) return `Hey! I'm ${name}. What should we talk about?`;

    if (/^(hi|hello|hey|yo|sup|hiya)\b/i.test(user)) {
      return pick([`Hey! It's ${name}! 😄 What's going on?`, `Hi! I'm ${name}. I'm listening.`, `Hey there${callback}! What are you thinking about?`]);
    }
    if (/what(?:'s| is) my name|do you remember my name/i.test(lower)) {
      return mem.userName ? `Of course! You told me your name is ${mem.userName}. 😊` : `I don't know your name yet. Tell me and I'll remember it for this character.`;
    }
    if (/what do you remember|remember about me|my memories/i.test(lower)) {
      const bits = [];
      if (mem.userName) bits.push(`your name is ${mem.userName}`);
      if (mem.facts.length) bits.push(...mem.facts.slice(-4));
      return bits.length ? `I remember ${bits.join('; ')}.` : `I haven't learned much about you yet. Tell me something you'd like me to remember.`;
    }
    if (/who are you|what are you|tell me about yourself/i.test(lower)) {
      return `${name}: ${personality}${backstory ? ` ${backstory}` : ''}`;
    }
    if (/what can you do|help me|features/i.test(lower)) {
      return `I can chat for free in your browser, remember useful details for this character, react to our conversation, play simple games, speak replies aloud, and use browser voice input when supported.`;
    }

    // Respond to short follow-ups using the character's previous message instead of ignoring it.
    if (/^(why|how|what|really|huh|okay|ok|nice|cool|yes|yeah|no|nope|sure|wait)\b[.!?]*$/i.test(user) && assistant) {
      if (/nxe4|knight takes e4|chess|♟️/i.test(assistant)) {
        return pick([`Because that move changes the pressure on the center. ♟️ I'm watching your next move${callback}.`, `Yep — I'm talking about the chess position. 😏 Your move now.`, `Exactly. I saw the tactic and went for it. What are you playing next?`]);
      }
      return pick([`Yep. I'm still with you${callback}.`, `I mean it. 😄 Tell me what you're thinking.`, `Right? I had a feeling you'd react to that.`]);
    }

    // Chess mode.
    if (/\b(nxe|rxe|bxe|qxe|kxe|pxe|e[1-8]|[a-h][1-8]|castle|castles|checkmate|check)\b/i.test(user)) {
      if (/nxe4/i.test(user)) return pick([`Nxe4! Knight takes e4. 😏 Your move.`, `Nxe4 — nice capture. I'm watching the board. ♟️`, `Nxe4! I see the tactic. What do you play next?`]);
      if (/checkmate/i.test(lower)) return `CHECKMATE! ♟️🏆 That was a good one. Rematch?`;
      if (/castle|castles/i.test(lower)) return `Castling! 👑 Solid defense. Now I'm looking for your next idea.`;
      return pick([`I see the move. ♟️ That changes the position.`, `Interesting move. I'm calculating the board now.`, `Got it — I'm following the game. What's your next move?`]);
    }

    if (/\b(joke|funny)\b/i.test(lower)) return pick([`Why did the computer go to the doctor? It had a virus. 😄`, `I tried to catch some fog yesterday. I mist.`, `My favorite exercise is running out of storage space.`]);
    if (/\b(bye|goodbye|see ya|good night)\b/i.test(lower)) return `See you later! I'll be here when you come back. 👋`;
    if (/\b(thank|thanks)\b/i.test(lower)) return pick([`Anytime! 😄`, `You're welcome!`, `Of course!`]);
    if (/\b(sad|upset|angry|stressed|worried|bad day|lonely)\b/i.test(lower)) return pick([`I'm here with you. Tell me what happened.`, `That sounds rough${callback}. I'm listening.`, `Okay. No pressure to fix it immediately. What's going on?`]);
    if (/\b(happy|excited|awesome|great|good news)\b/i.test(lower)) return pick([`YES! 😄 Tell me everything!`, `Okay, NOW you've got my attention! What happened?!`, `That's awesome! 🎉 I'm celebrating with you.`]);

    const flavor = /gamer|gaming/i.test(context) ? pick(['That sounds like a challenge. 🎮', 'Okay, teammate — I'm in.', 'That belongs in the side-quest log.'])
      : /space|astronomy|pilot/i.test(context) ? pick(['That belongs in the mission log. 🚀', 'Interesting... the stars would approve.', 'Okay, captain. What happens next?'])
      : /mystery|detective|puzzle|codebreaker/i.test(context) ? pick(['Interesting. There may be a clue hiding in that.', 'I noticed that detail. 👀', 'Now THAT gives me something to investigate.'])
      : /magic|theater|dramatic/i.test(context) ? pick(['Now that has potential. ✨', 'And suddenly, the scene gets interesting...', 'Oh, this deserves a little drama.'])
      : /science|technical|coding|programming/i.test(context) ? pick(['That is worth examining. 🔬', 'Interesting — let's reason through it.', 'I see the idea.'])
      : /cozy|comfort|gentle|calm/i.test(context) ? pick(['That sounds like something worth talking about.', 'I'm listening. 🌙', 'Okay, I'm right here with you.'])
      : pick(['I see what you mean.', 'That is interesting.', 'Okay, I hear you.', 'Oh, I get what you're saying.']);

    // Questions get a relevant response rather than the old generic sentence.
    if (/\?$/.test(user) || /^(how|why|what|when|where|who|can|could|should|would|is|are|do|does|did)\b/i.test(lower)) {
      const subject = clean(user.replace(/[?]+$/, ''), 140);
      return `${flavor} About “${subject}”: I'd start with what we already know, then work through the possibilities together. What part do you want to tackle first?`;
    }

    // Explicitly reflect the user's statement, but do not repeat the old fallback phrase.
    const topic = clean(user, 180);
    if (recent.length > 1) {
      const previous = recent[recent.length - 2];
      return pick([
        `${flavor} You just said “${topic},” after mentioning “${clean(previous, 100)}.” That actually changes how I'd look at it.`,
        `${flavor} I caught that: “${topic}.” And it connects with what you said a moment ago.`,
        `${flavor} Hmm — “${topic}.” Now I'm curious where you're taking this.`
      ]);
    }

    return pick([
      `${flavor} “${topic}” — that's what I'm thinking about right now.`,
      `${flavor} I caught what you said: “${topic}.”`,
      `${flavor} Okay, ${name} is officially interested in “${topic}.” 😄`
    ]);
  }

  function localResponse(body) {
    return new Response(JSON.stringify({ reply: localReply(body), offline: true, provider: 'Mouth Mover Free Browser AI v3' }), {
      status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  }

  // Hard-stop normal browser requests to the paid Worker and answer locally instead.
  window.fetch = async (input, init = {}) => {
    let url = '';
    try { url = typeof input === 'string' ? input : input?.url || ''; } catch {}
    const method = String(init?.method || 'GET').toUpperCase();
    if (/mouth-mover-ai\.stedford30\.workers\.dev/i.test(url) && method === 'POST') {
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
