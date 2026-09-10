// Mouth Mover network fix + Chromebook-friendly diagnostics.
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
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function jsonpRequest(url, timeoutMs = 12000) {
    return new Promise((resolve, reject) => {
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
      window[callbackName] = data => finish(resolve, data);
      script.onerror = () => finish(reject, new Error('The browser could not load the Cloudflare Worker. This usually means the Worker URL is unreachable, disabled, or blocked by the network.'));
      script.src = `${url}${url.includes('?') ? '&' : '?'}callback=${encodeURIComponent(callbackName)}`;
      script.async = true;
      document.head.appendChild(script);
      setTimeout(() => finish(reject, new Error('The Worker did not respond within 12 seconds.')), timeoutMs);
    });
  }

  function showDiagnostics(message, ok = false) {
    let box = document.getElementById('mouth-mover-diagnostics');
    if (!box) {
      box = document.createElement('div');
      box.id = 'mouth-mover-diagnostics';
      box.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:2147483647;width:min(390px,calc(100vw - 28px));padding:16px;border:2px solid #555;border-radius:14px;background:#111;color:#fff;font:14px/1.45 system-ui,sans-serif;box-shadow:0 8px 30px #0008';
      document.body.appendChild(box);
    }
    box.innerHTML = `<div style="font-size:17px;font-weight:700;margin-bottom:8px">Mouth Mover connection test</div><div style="white-space:pre-wrap">${String(message).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</div><button id="mouth-mover-test" style="margin-top:12px;padding:9px 12px;border:0;border-radius:9px;cursor:pointer;font-weight:700">Test AI Worker again</button>`;
    box.querySelector('#mouth-mover-test').onclick = runHealthTest;
    box.style.borderColor = ok ? '#39d98a' : '#ff5c5c';
  }

  async function runHealthTest() {
    showDiagnostics('Testing the AI Worker…', true);
    try {
      const data = await jsonpRequest(BACKEND);
      if (!data?.ok) throw new Error(data?.error || 'The Worker responded, but did not report healthy status.');
      showDiagnostics(`WORKER REACHED ✓\n\nService: ${data.service || 'mouth-mover-ai'}\nVersion: ${data.version || 'unknown'}\nModel: ${data.model || 'unknown'}\nOpenAI key configured: ${data.openaiConfigured ? 'YES' : 'NO'}\n\nIf chat still fails, the Worker is reachable and we need to inspect the AI request itself.`, true);
    } catch (error) {
      showDiagnostics(`WORKER NOT REACHED ✕\n\n${error?.message || error}\n\nWorker URL:\n${BACKEND}\n\nThis test does not require DevTools or CORS.`, false);
    }
  }

  window.mouthMoverTestWorker = runHealthTest;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => runHealthTest(), { once: true });
  else runHealthTest();

  async function getFallback(rawBody) {
    const payload = encodeBase64Url(compactPayload(rawBody));
    return originalFetch(`${BACKEND}?payload=${encodeURIComponent(payload)}`, { method:'GET', mode:'cors', cache:'no-store', credentials:'omit' });
  }

  function jsonpFallback(rawBody) {
    const payload = encodeBase64Url(compactPayload(rawBody));
    return jsonpRequest(`${BACKEND}?payload=${encodeURIComponent(payload)}`).then(data => {
      if (data?.reply) return new Response(JSON.stringify({ reply:data.reply }), { status:200, headers:{'Content-Type':'application/json'} });
      return new Response(JSON.stringify({ error:data?.error || 'AI request failed.' }), { status:502, headers:{'Content-Type':'application/json'} });
    });
  }

  window.fetch = async (input, init = {}) => {
    let requestUrl = '';
    try { requestUrl = typeof input === 'string' ? input : input?.url || ''; } catch {}
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
      next.mode = 'cors'; next.cache = 'no-store'; next.credentials = 'omit';
      try {
        const response = await originalFetch(BACKEND, { ...next, body });
        if (response.ok) return response;
      } catch (error) { console.warn('Mouth Mover POST failed.', error); }
      try {
        const fallback = await getFallback(body);
        if (fallback.ok) return fallback;
      } catch (error) { console.warn('Mouth Mover GET fallback failed.', error); }
      try {
        return await jsonpFallback(body);
      } catch (error) {
        showDiagnostics(`CHAT CONNECTION FAILED ✕\n\n${error?.message || error}`, false);
        throw new Error('Mouth Mover could not reach the AI Worker.');
      }
    }
    return originalFetch(input, init);
  };
})();