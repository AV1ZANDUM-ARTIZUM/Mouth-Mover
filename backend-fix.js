/* Mouth Mover — FREE browser chat bridge v4
   Important: character metadata (personality/backstory/style) is NEVER treated as user input.
*/
(function () {
  'use strict';

  const FREE_MEMORY_KEY = 'mouth-mover-free-memory-v4';
  const WORKER_HOST = 'mouth-mover-ai.stedford30.workers.dev';

  function safeJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch (_) { return fallback; }
  }
  function saveJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  function selectedCharacter() {
    const chars = window.characters || window.defaultCharacters || [];
    const id = localStorage.getItem('mouth-mover-character') || localStorage.getItem('selectedCharacter');
    return chars.find(c => c && c.id === id) || window.currentCharacter || chars[0] || {};
  }

  function getUserText(messages) {
    if (!Array.isArray(messages)) return '';
    // Only accept explicit user-role messages. Never inspect personality/style/backstory fields.
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (!m || typeof m !== 'object') continue;
      const role = String(m.role || m.sender || '').toLowerCase();
      if (role === 'user' || role === 'human') {
        return String(m.content || m.text || m.message || '').trim();
      }
    }
    return '';
  }

  function getPreviousAssistant(messages) {
    if (!Array.isArray(messages)) return '';
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (!m || typeof m !== 'object') continue;
      const role = String(m.role || m.sender || '').toLowerCase();
      if (role === 'assistant' || role === 'character' || role === 'bot') {
        return String(m.content || m.text || m.message || '').trim();
      }
    }
    return '';
  }

  function memory() {
    return safeJSON(FREE_MEMORY_KEY, { name: '', facts: [], topics: [], turns: 0 });
  }

  function remember(text) {
    const m = memory();
    m.turns = (m.turns || 0) + 1;
    const name = text.match(/(?:my name is|i'm|i am)\s+([A-Za-z][A-Za-z0-9_-]{1,24})/i);
    if (name) m.name = name[1];
    const clean = text.replace(/\s+/g, ' ').trim();
    if (clean && !m.topics.includes(clean)) m.topics.push(clean);
    if (m.topics.length > 30) m.topics = m.topics.slice(-30);
    saveJSON(FREE_MEMORY_KEY, m);
    return m;
  }

  function replyFor(messages) {
    const c = selectedCharacter();
    const userText = getUserText(messages);
    const previous = getPreviousAssistant(messages);
    const text = userText || 'Hello!';
    const lower = text.toLowerCase();
    const m = remember(text);
    const name = m.name ? ` ${m.name}` : '';
    const characterName = c.name || 'Character';
    const personality = String(c.personality || '').toLowerCase();

    // Never echo character metadata as if it came from the user.
    if (/^(hi|hello|hey|yo|sup|good morning|good afternoon|good evening)[!. ]*$/i.test(text)) {
      return c.greeting || `Hey${name}! I'm ${characterName}. What's up?`;
    }
    if (/^(why|how|what|really|okay|ok|nice|cool|huh|and\?|then\?|so\?|wow)[?!\. ]*$/i.test(text) && previous) {
      return `${characterName}: Yeah — I mean what I said. Tell me what part you want to dig into${name}.`;
    }
    if (/what('?s| is) your name|who are you/i.test(text)) {
      return `I'm ${characterName}! ${c.tagline || 'Nice to meet you.'}`;
    }
    if (/what do you like|favorite|favourite/i.test(text)) {
      if (personality.includes('fire')) return 'I like adventure, a good challenge, and anything that keeps the flames interesting. 🔥';
      if (personality.includes('gaming')) return 'Games, obviously. Especially the kind where we can laugh when everything goes horribly wrong. 🎮';
      return `${characterName} likes things that fit the character. Ask me something specific and I'll give you a real answer.`;
    }
    if (/tell me a joke|make me laugh|joke/i.test(text)) {
      return `${characterName}: Why did the computer go to the doctor? It had a bad byte. 😄`;
    }
    if (/who am i|do you remember me/i.test(text)) {
      return m.name ? `You're ${m.name}. And yes, I remember that name. 😄` : `I don't know your name yet — but I'm listening.`;
    }

    const short = text.length > 180 ? text.slice(0, 177) + '…' : text;
    const flavors = personality.includes('dramatic')
      ? [`Oh, now THAT is interesting.`, `Well... you've got my attention.`, `Now we're getting somewhere.`]
      : personality.includes('cheerful') || personality.includes('playful')
      ? [`Ooh, interesting!`, `Okay, I'm listening!`, `Ha! I like where this is going.`]
      : personality.includes('calm') || personality.includes('patient')
      ? [`I hear you.`, `That makes sense.`, `I'm listening.`]
      : [`I hear you.`, `Interesting.`, `Okay, I'm with you.`];
    const flavor = flavors[m.turns % flavors.length];
    return `${flavor} You said, “${short}”${name}. What do you want to do with that?`;
  }

  // Intercept ALL Worker requests, including GET/JSONP, so the exhausted OpenAI account
  // can never produce the old 502 during normal free chat.
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    try {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      if (url.includes(WORKER_HOST)) {
        const method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
        if (method === 'POST') {
          let body = {};
          try { body = JSON.parse((init && init.body) || '{}'); } catch (_) {}
          const messages = body.messages || body.input || [];
          const text = replyFor(Array.isArray(messages) ? messages : []);
          return Promise.resolve(new Response(JSON.stringify({ ok: true, reply: text, text }), {
            status: 200, headers: { 'Content-Type': 'application/json' }
          }));
        }
        const text = replyFor([]);
        return Promise.resolve(new Response(JSON.stringify({ ok: true, reply: text, text }), {
          status: 200, headers: { 'Content-Type': 'application/json' }
        }));
      }
    } catch (_) {}
    return originalFetch.apply(this, arguments);
  };

  window.MouthMoverFreeAI = { replyFor, getUserText };
  document.documentElement.dataset.mouthMoverFreeAI = 'v4';
})();
