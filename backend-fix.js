// Mouth Mover network fix.
// Prefer the normal POST request, but if the browser blocks or cannot establish
// the cross-origin POST, retry through the Worker's CORS-simple GET chat endpoint.
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
        return response;
      } catch (error) {
        console.warn('Mouth Mover POST failed; trying CORS-simple GET fallback.', error);
        try {
          return await getFallback(body);
        } catch (fallbackError) {
          console.warn('Mouth Mover GET fallback failed.', fallbackError);
          throw error;
        }
      }
    }

    return originalFetch(input, init);
  };
})();
