# Mouth Mover — AI Characters

A browser-based AI character chat app inspired by character-chat platforms. Characters have a personality, backstory, speaking style, persistent local conversation memory, browser voice, and a visual speaking animation.

## Included now

- Character discovery/search/categories
- Built-in starter AI characters
- Character creator with avatar, personality, backstory, greeting, and speaking style
- Persistent chat history in `localStorage`
- Configurable AI backend (`POST /api/chat`)
- Demo AI fallback so the site works without an API
- Browser text-to-speech
- Speaking animation while voice plays
- Responsive desktop/mobile UI
- GitHub Pages-ready static files

## Real AI backend

GitHub Pages can host the front end, but it cannot safely hold a private AI API key. Set **Settings → Backend URL** to a server you control. The server should accept:

```json
{
  "character": {"id":"nova","name":"Nova","personality":"...","backstory":"...","style":"..."},
  "messages": [{"role":"assistant","content":"Hey!"},{"role":"user","content":"Hello"}]
}
```

and return:

```json
{"reply":"Hello!"}
```

Keep any provider API key on that backend, never in `app.js` or another GitHub Pages file.

## GitHub Pages

The repository root contains `index.html`, `styles.css`, and `app.js`, so it is ready to publish as a static Pages site. GitHub Pages publishes HTML/CSS/JavaScript directly from a repository.

## Project files

- `index.html` — app layout
- `styles.css` — responsive styling
- `app.js` — character system, chat, memory, voice, creator, and backend adapter
- `.nojekyll` — disables default Jekyll processing for this plain static site
- `mouth-mover-starter new.zip` — original packaged starter
- `mouth-mover-v3.zip` — original packaged v3 build
