// Mouth Mover network fix: avoid the browser CORS preflight by using a CORS-simple request.
// The Worker still parses the JSON body normally.
(() => {
  const BACKEND = 'https://mouth-mover-ai.stedford30.workers.dev';
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url;
    if (url === BACKEND && init?.method === 'POST') {
      const next = { ...init, headers: { ...(init.headers || {}) } };
      // application/json triggers an OPTIONS preflight. text/plain does not.
      next.headers['Content-Type'] = 'text/plain;charset=UTF-8';
      return originalFetch(input, next);
    }
    return originalFetch(input, init);
  };
})();
