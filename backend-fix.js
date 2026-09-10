// Mouth Mover network fix.
// Force the Cloudflare Worker request to be a CORS-simple POST so the browser
// does not need an OPTIONS preflight, and add a clear diagnostic if the Worker
// itself cannot be reached.
(() => {
  const BACKEND = 'https://mouth-mover-ai.stedford30.workers.dev';
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url;

    if (url === BACKEND && String(init?.method || 'GET').toUpperCase() === 'POST') {
      const next = { ...init };
      const headers = new Headers(init.headers || {});
      headers.set('Content-Type', 'text/plain;charset=UTF-8');
      headers.delete('Accept');
      next.headers = headers;
      next.mode = 'cors';
      next.cache = 'no-store';
      next.credentials = 'omit';

      try {
        const response = await originalFetch(input, next);
        return response;
      } catch (error) {
        const diagnostic = new Error(
          'Mouth Mover could not connect to the Cloudflare AI Worker. ' +
          'The Worker URL is reachable in a browser, but the chat request was blocked or unreachable.'
        );
        diagnostic.cause = error;
        throw diagnostic;
      }
    }

    return originalFetch(input, init);
  };
})();
