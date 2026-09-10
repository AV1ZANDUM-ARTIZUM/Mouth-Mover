// Mouth Mover network fix.
// Cloudflare Worker chat calls use a CORS-simple POST so the browser does not
// need a preflight. The URL comparison is normalized so a trailing slash or
// equivalent URL cannot bypass the fix.
(() => {
  const BACKEND = 'https://mouth-mover-ai.stedford30.workers.dev';
  const BACKEND_URL = new URL(BACKEND);
  const originalFetch = window.fetch.bind(window);

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
      const next = { ...init };
      const headers = new Headers(init.headers || {});
      // text/plain is a CORS-safelisted content type. The body is still JSON,
      // and Cloudflare Workers can parse it with request.json().
      headers.set('Content-Type', 'text/plain;charset=UTF-8');
      headers.delete('Accept');
      next.headers = headers;
      next.mode = 'cors';
      next.cache = 'no-store';
      next.credentials = 'omit';

      // Always send the canonical Worker URL.
      const body = next.body;
      try {
        return await originalFetch(BACKEND, { ...next, body });
      } catch (error) {
        console.warn('Mouth Mover Cloudflare Worker fetch failed:', error);
        throw error;
      }
    }

    return originalFetch(input, init);
  };
})();
