/* Mouth Mover — FREE browser conversation engine v5 */
(function () {
  'use strict';
  const KEY = 'mouth-mover-free-memory-v5';
  const HOST = 'mouth-mover-ai.stedford30.workers.dev';

  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(d)); } catch (_) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };

  function character() {
    const list = window.characters || window.defaultCharacters || [];
    const id = localStorage.getItem('mouth-mover-character') || localStorage.getItem('selectedCharacter');
    return list.find(x => x && x.id === id) || window.currentCharacter || list[0] || {};
  }

  function roleOf(m) { return String(m?.role || m?.sender || '').toLowerCase(); }
  function textOf(m) { return String(m?.content ?? m?.text ?? m?.message ?? '').replace(/\s+/g, ' ').trim(); }

  function userMessages(messages) {
    return Array.isArray(messages) ? messages.filter(m => {
      const r = roleOf(m);
      return r === 'user' || r === 'human';
    }).map(textOf).filter(Boolean) : [];
  }

  function assistantMessages(messages) {
    return Array.isArray(messages) ? messages.filter(m => {
      const r = roleOf(m);
      return r === 'assistant' || r === 'character' || r === 'bot';
    }).map(textOf).filter(Boolean) : [];
  }

  function getMemory() { return read(KEY, { name: '', facts: [], topics: [], turns: 0 }); }
  function saveMemory(text) {
    const m = getMemory();
    m.turns = Number(m.turns || 0) + 1;
    const n = text.match(/(?:my name is|i'm|i am)\s+([A-Za-z][A-Za-z0-9_-]{1,24})/i);
    if (n) m.name = n[1];
    if (text && !m.topics.includes(text)) m.topics.push(text);
    m.topics = m.topics.slice(-25);
    write(KEY, m);
    return m;
  }

  function reply(messages) {
    const c = character();
    const us = userMessages(messages);
    const as = assistantMessages(messages);
    const text = us.length ? us[us.length - 1] : 'Hello!';
    const prevUser = us.length > 1 ? us[us.length - 2] : '';
    const prevAssistant = as.length ? as[as.length - 1] : '';
    const m = saveMemory(text);
    const name = m.name ? ` ${m.name}` : '';
    const who = c.name || 'Character';
    const p = String(c.personality || '').toLowerCase();
    const low = text.toLowerCase();

    // Handle natural conversation instead of appending the same question every turn.
    if (/^(hi|hello|hey|yo|sup|hiya|heya|good morning|good afternoon|good evening)[!. ]*$/i.test(text))
      return c.greeting || `Hey${name}! I'm ${who}. What's going on?`;
    if (/what('?s| is) your name|who are you/i.test(text))
      return `I'm ${who}! ${c.tagline || 'I’m glad you’re here.'}`;
    if (/who am i|do you remember me/i.test(text))
      return m.name ? `You're ${m.name} — I remember that. 😄` : `I don't know your name yet, but I'm listening.`;
    if (/tell me a joke|make me laugh|joke/i.test(text))
      return p.includes('dramatic') ? `Very well. Why did the hero bring a ladder? Because the plot needed a higher level. 😏` : `Okay, here's one: Why did the computer get cold? It left its Windows open. 😄`;

    // Questions get an answer-shaped response rather than a generic "what next?" prompt.
    if (/^why\b/i.test(text)) return `Because there’s usually more going on underneath the obvious answer. In this case, I’d look at what caused it first.`;
    if (/^how\b/i.test(text)) return `I'd break it into smaller steps and tackle the first one together. What you’re asking sounds doable.`;
    if (/^(are|is|do|does|can|could|would|will|did|have|has|should)\b/i.test(text) && /\?\s*$/.test(text))
      return `I'd say yes — with a little context. I’m following what you mean, and we can work it out from there.`;

    // React to common conversational signals.
    if (/^(thanks|thank you|thx|ty)[!. ]*$/i.test(text)) return `Anytime${name}! 😄`;
    if (/^(sorry|my bad|oops)[!. ]*$/i.test(text)) return `You're fine${name}. No big deal.`;
    if (/^(wow|whoa|woah|omg|oh wow)[!. ]*$/i.test(text)) return p.includes('dramatic') ? `Indeed! And I assure you, the drama has only begun. ✨` : `Right?! I wasn't expecting that either. 😄`;
    if (/^(okay|ok|alright|sure|cool|nice|awesome)[!. ]*$/i.test(text)) return `Yeah! I'm with you${name}. Let's keep going.`;

    // Character-specific reactions make the free engine feel less robotic.
    let opener;
    if (p.includes('dramatic')) opener = ['Oh, now THAT is interesting.', 'Well... you have my attention.', 'Now we are getting somewhere.'][m.turns % 3];
    else if (p.includes('playful') || p.includes('funny') || p.includes('cheerful')) opener = ['Ooh, I like that!', 'Okay, now I’m interested! 😄', 'Ha! I can work with that.'][m.turns % 3];
    else if (p.includes('calm') || p.includes('patient') || p.includes('gentle')) opener = ['I hear you.', 'That makes sense.', 'I’m with you.'][m.turns % 3];
    else opener = ['Interesting.', 'I hear you.', 'Okay, I’m following.'][m.turns % 3];

    // If the user continues a topic, acknowledge continuity instead of pretending this is a new chat.
    if (prevUser && (low.includes('also') || low.includes('but') || low.includes('because') || low.includes('actually') || low.includes('then') || low.includes('and '))) {
      return `${opener} That connects with what you said before. I think you’re building on the same idea, and I’m following along${name}.`;
    }
    if (prevAssistant && /^(really|seriously|you think so|do you think so|why though|how so)[?! ]*$/i.test(text)) {
      return `${opener} Yeah, I do. I meant what I said — and I can explain my reasoning if you want.`;
    }

    const clean = text.length > 220 ? text.slice(0, 217) + '…' : text;
    return `${opener} “${clean}”${name}. I’m following you — and I have a thought about that.`;
  }

  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    try {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      if (url.includes(HOST)) {
        const method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
        let body = {};
        try { body = JSON.parse((init && init.body) || '{}'); } catch (_) {}
        const messages = body.messages || body.input || [];
        const answer = reply(Array.isArray(messages) ? messages : []);
        return Promise.resolve(new Response(JSON.stringify({ ok: true, reply: answer, text: answer, free: true }), {
          status: 200, headers: { 'Content-Type': 'application/json' }
        }));
      }
    } catch (_) {}
    return originalFetch.apply(this, arguments);
  };

  window.MouthMoverFreeAI = { reply, userMessages };
  document.documentElement.dataset.mouthMoverFreeAI = 'v5';
})();
