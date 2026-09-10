# Mouth Mover — AI Characters

A browser-based AI character chat app inspired by character-chat platforms. Characters have a personality, backstory, speaking style, persistent local conversation memory, browser voice, and a visual speaking animation.

## Included now

- Character discovery/search/categories
- Built-in starter AI characters
- Character creator with avatar, personality, backstory, greeting, and speaking style
- Persistent chat history in `localStorage`
- Secure server-side AI backends
- Cloudflare Worker backend included for organizations that block Vercel
- Demo AI fallback so the site works without an API
- Browser text-to-speech
- Speaking animation while voice plays
- Responsive desktop/mobile UI
- GitHub Pages-ready static files

## Real AI without exposing the API key

GitHub Pages is static hosting, so a private AI API key must never be placed in browser code. GitHub Pages publishes the HTML/CSS/JavaScript files directly, while the real AI request must go through a server-side backend. citeturn0search0turn0search3

This repository includes a **Cloudflare Worker** in `worker/` that keeps `OPENAI_API_KEY` in a Cloudflare Secret. Cloudflare documents Worker Secrets specifically for sensitive values such as API keys, and the secret is available to the Worker without being exposed to the browser. citeturn1search0turn1search3

See **[worker/README.md](worker/README.md)** for deployment instructions.

The browser sends character information and recent conversation history to the backend. The backend calls OpenAI server-to-server and returns:

```json
{"reply":"Hello!"}
```

Never commit `.env`, `.dev.vars`, or an API key. Never put an API key in `app.js`, `index.html`, or another browser-served file.

## GitHub Pages

The repository root contains `index.html`, `styles.css`, and `app.js`, so it is ready to publish as a static Pages site. Set GitHub Pages to **Deploy from a branch → main → /(root)**. GitHub documents branch/folder publishing for existing repositories. citeturn0search5

A fresh commit is included after Pages configuration so GitHub has a new publishing-source push to process.

## Project files

- `index.html` — app layout
- `styles.css` — responsive styling
- `app.js` — character system, chat, memory, voice, creator, and backend adapter
- `worker/index.js` — secure Cloudflare Worker AI endpoint
- `worker/wrangler.jsonc` — Worker configuration
- `worker/README.md` — Cloudflare deployment and secret setup
- `worker/.gitignore` — prevents local secret files from being committed
- `api/chat.js` — previous Vercel-compatible backend
- `package.json` — backend dependency configuration
- `vercel.json` — previous Vercel function configuration
- `.env.example` — safe environment-variable template
- `BACKEND_SETUP.md` — previous Vercel deployment guide
- `.nojekyll` — plain static-site support
- `mouth-mover-starter new.zip` — original packaged starter
- `mouth-mover-v3.zip` — original packaged v3 build
