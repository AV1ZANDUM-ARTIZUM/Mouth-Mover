// Mouth Mover network fix.
// Try normal POST, then CORS GET, then a JSONP script request that does not depend on CORS.
(() => {
  const BACKEND = 'https://mouth-mover-ai.stedford30.workers.dev';
  const BACKEND_URL = new URL(BACKEND);
  const originalFetch = window.fetch.bind(window);

  function compactPayload(rawBody) {
    const body = JSON.parse(String(rawBody || '{}'));
    const character = body.character || {};
    const messages = Array.isArray(body.messages) ? body.messages : [];
    return {
      character: {
        id: String(character.id || '').slice(0, 80),
        name: String(character.name || 'AI character').slice(0, 80),
        personality: String(character.personality || '').slice(0, 1000),
        backstory: String(character.backstory || '').slice(0, 1200),
        style: String(character.style || '').slice(0, 600)
      },
      messages: messages.slice(-8).map(m => ({
        role: m?.role === 'assistant' ? 'assistant' : 'user',
        content: String(m?.content || '').slice(0, 1400)
      }))
    };
  }

  function encodeBase64Url(value) {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  async function getFallback(rawBody) {
    const compact = compactPayload(rawBody);
    const payload = encodeBase64Url(compact);
    const url = `${BACKEND}?payload=${encodeURIComponent(payload)}`;
    return originalFetch(url, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      credentials: 'omit'
    });
  }

  function jsonpFallback(rawBody) {
    return new Promise((resolve, reject) => {
      const compact = compactPayload(rawBody);
      const payload = encodeBase64Url(compact);
      const callbackName = `__mouthMover_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script = document.createElement('script');
      let settled = false;
      const cleanup = () => {
        delete window[callbackName];
        script.remove();
      };
      const finish = (fn, value) => {
        if (settled) return;
        settled = true;
        cleanup();
        fn(value);
      };
      window[callbackName] = data => {
        if (data?.reply) {
          finish(resolve, new Response(JSON.stringify({ reply: data.reply }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }));
        } else {
          finish(resolve, new Response(JSON.stringify({ error: data?.error || 'AI request failed.' }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' }
          }));
        }
      };
      script.onerror = () => finish(reject, new Error('JSONP request failed.'));
      script.src = `${BACKEND}?payload=${encodeURIComponent(payload)}&callback=${encodeURIComponent(callbackName)}`;
      script.async = true;
      document.head.appendChild(script);
      setTimeout(() => finish(reject, new Error('JSONP request timed out.')), 30000);
    });
  }

  window.fetch = async (input, init = {}) => {
    let requestUrl = '';
    try {
      requestUrl = typeof input === 'string' ? input : input?.url || '';
    } catch {}

    let isBackend = false;
    try {
      const u = new URL(requestUrl, window.location.href);
      isBackend = u.origin === BACKEND_URL.origin && u.pathname.replace(/\/+$/, '') === BACKEND_URL.pathname.replace(/\/+$/, '');
    } catch {}

    if (isBackend && String(init?.method || 'GET').toUpperCase() === 'POST') {
      const body = init.body;
      const next = { ...init };
      const headers = new Headers(init.headers || {});
      headers.set('Content-Type', 'text/plain;charset=UTF-8');
      headers.delete('Accept');
      next.headers = headers;
      next.mode = 'cors';
      next.cache = 'no-store';
      next.credentials = 'omit';

      try {
        const response = await originalFetch(BACKEND, { ...next, body });
        if (response.ok) return response;
        console.warn(`Mouth Mover POST returned HTTP ${response.status}; trying GET fallback.`);
      } catch (error) {
        console.warn('Mouth Mover POST failed; trying CORS-simple GET fallback.', error);
      }

      try {
        const fallback = await getFallback(body);
        if (fallback.ok) return fallback;
        console.warn(`Mouth Mover GET fallback returned HTTP ${fallback.status}; trying JSONP.`);
      } catch (fallbackError) {
        console.warn('Mouth Mover GET fallback failed; trying JSONP.', fallbackError);
      }

      try {
        return await jsonpFallback(body);
      } catch (jsonpError) {
        console.error('Mouth Mover JSONP fallback failed.', jsonpError);
        throw new Error('Mouth Mover could not reach the AI Worker.');
      }
    }

    return originalFetch(input, init);
  };
})();