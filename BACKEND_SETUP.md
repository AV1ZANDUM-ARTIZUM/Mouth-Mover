# Mouth Mover AI backend

The GitHub Pages front end is static, so the OpenAI key must stay on a server. This repo now includes a Vercel-compatible serverless endpoint at `api/chat.js`.

## 1. Deploy the backend

1. Create/sign in to a Vercel account.
2. Import the `AV1ZANDUM-ARTIZUM/Mouth-Mover` GitHub repository.
3. Deploy the project with the repository root as the project root.
4. In the Vercel project, open **Settings → Environment Variables**.
5. Add:
   - `OPENAI_API_KEY` = your OpenAI API key
   - `OPENAI_MODEL` = `gpt-5.6-luna` (optional)
   - `ALLOWED_ORIGIN` = your exact GitHub Pages URL
6. Redeploy after adding the variables.

The backend URL will be:

`https://YOUR-VERCEL-DOMAIN.vercel.app/api/chat`

## 2. Connect Mouth Mover

Open Mouth Mover → **Settings** → paste the backend URL into **AI backend URL** → save.

Leave demo mode enabled while testing, or turn it off once the backend works.

## Security

Never put `OPENAI_API_KEY` in `app.js`, `index.html`, or any other browser-served file. The key belongs only in the Vercel environment variables.

The endpoint also limits the conversation sent to the model and uses `store: false` for the Responses API request.

## Local development

Install dependencies:

```bash
npm install
```

Then run the project with the Vercel CLI:

```bash
npx vercel dev
```

Create a local `.env` file from `.env.example` and add your key. Do not commit `.env`.
