# Mouth Mover — AI Characters

A browser-based AI character chat app inspired by character-chat platforms. Characters have a personality, backstory, speaking style, persistent local conversation memory, browser voice, and a visual speaking animation.

## Included now

- Character discovery/search/categories
- Built-in starter AI characters
- Character creator with avatar, personality, backstory, greeting, and speaking style
- Persistent chat history in `localStorage`
- Secure server-side AI backend in `api/chat.js`
- Demo AI fallback so the site works without an API
- Browser text-to-speech
- Speaking animation while voice plays
- Responsive desktop/mobile UI
- GitHub Pages-ready static files
- Vercel-ready backend deployment

## Real AI backend

GitHub Pages is static hosting, so a private AI API key must not be placed in browser code. This repo now includes a Vercel-compatible serverless endpoint at `api/chat.js`.

See **[BACKEND_SETUP.md](BACKEND_SETUP.md)** for deployment instructions.

The browser sends character information and recent conversation history to the backend. The backend uses the server-side `OPENAI_API_KEY` and returns:

```json
{"reply":"Hello!"}
```

Never commit `.env` or put an API key in `app.js`, `index.html`, or another browser-served file.

## GitHub Pages

The repository root contains `index.html`, `styles.css`, and `app.js`, so it is ready to publish as a static Pages site. GitHub Pages publishes HTML/CSS/JavaScript directly from a repository.

## Project files

- `index.html` — app layout
- `styles.css` — responsive styling
- `app.js` — character system, chat, memory, voice, creator, and backend adapter
- `api/chat.js` — secure server-side AI endpoint
- `package.json` — backend dependency configuration
- `vercel.json` — serverless function configuration
- `.env.example` — safe environment-variable template
- `BACKEND_SETUP.md` — backend deployment guide
- `.nojekyll` — plain static-site support
- `mouth-mover-starter new.zip` — original packaged starter
- `mouth-mover-v3.zip` — original packaged v3 build
