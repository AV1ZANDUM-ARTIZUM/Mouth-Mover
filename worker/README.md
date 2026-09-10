# Mouth Mover AI backend (Cloudflare Worker)

This Worker is the secure backend for the Mouth Mover GitHub Pages app. GitHub Pages stays static; the Worker holds the OpenAI API key as a Cloudflare Secret.

## Deploy

1. Create/sign in to a Cloudflare account.
2. In **Workers & Pages**, choose **Create application → Import a repository** and connect this GitHub repository, or deploy the `worker` folder with Wrangler.
3. Set the Worker root/build directory to `worker` if the dashboard asks for a path.
4. Deploy the Worker. Cloudflare provides a `https://<worker-name>.<subdomain>.workers.dev` URL.
5. In the Worker dashboard, open **Settings → Variables and Secrets → Add → Secret**.
6. Create the secret named `OPENAI_API_KEY` and paste the key there. **Do not put the key in this repository.**
7. Keep `OPENAI_MODEL` and `ALLOWED_ORIGIN` as normal configuration values. `ALLOWED_ORIGIN` should match the published GitHub Pages URL exactly.
8. In Mouth Mover, open **Settings → AI connection**, paste the Worker URL followed by `/` if needed, and save it. The app expects the Worker itself to be the `/api/chat` endpoint, so use the Worker URL directly.
9. Turn off demo mode when the real AI connection is working.

## Security

The browser sends character settings and chat history to this Worker. The browser never receives `OPENAI_API_KEY`. The Worker sends the request to OpenAI server-to-server and returns only the character reply.

Never commit `.dev.vars`, `.env`, or an API key to GitHub. Use Cloudflare Worker Secrets for the key.
