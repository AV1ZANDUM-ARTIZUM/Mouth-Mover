const ALLOWED_METHODS = "POST, OPTIONS";

function isAllowedOrigin(origin, allowedOrigin) {
  if (!origin) return true;
  if (allowedOrigin === "*") return true;
  if (origin === allowedOrigin) return true;
  try {
    const url = new URL(origin);
    const allowed = new URL(allowedOrigin);
    // GitHub Pages can use the same hostname with different paths/environments.
    if (url.protocol === "https:" && url.hostname === allowed.hostname) return true;
  } catch {}
  return false;
}

function corsHeaders(origin, allowedOrigin) {
  const allowOrigin = isAllowedOrigin(origin, allowedOrigin) ? (origin || allowedOrigin) : allowedOrigin;
  return {
    "Access-Control-Allow-Origin": allowOrigin || "*",
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(data, status, origin, allowedOrigin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin, allowedOrigin),
    },
  });
}

function characterInstructions(character) {
  const name = String(character?.name || "AI character").slice(0, 80);
  const personality = String(character?.personality || "friendly and conversational").slice(0, 1500);
  const backstory = String(character?.backstory || "").slice(0, 2500);
  const style = String(character?.style || "natural and conversational").slice(0, 800);

  return [
    `You are ${name}, an AI character in Mouth Mover.`,
    `Personality: ${personality}`,
    `Backstory: ${backstory}`,
    `Speaking style: ${style}`,
    "Stay in character while remaining helpful and safe.",
    "Do not claim to be a real person or to have real-world experiences.",
    "Keep replies reasonably concise for a chat interface unless the user asks for detail.",
  ].join("\n");
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = env.ALLOWED_ORIGIN || "*";

    if (request.method === "OPTIONS") {
      if (!isAllowedOrigin(origin, allowedOrigin)) {
        return json({ error: "Origin not allowed", origin }, 403, origin, allowedOrigin);
      }
      return new Response(null, { status: 204, headers: corsHeaders(origin, allowedOrigin) });
    }

    if (request.method === "GET") {
      return json({ ok: true, service: "mouth-mover-ai" }, 200, origin, allowedOrigin);
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, origin, allowedOrigin);
    }

    if (!isAllowedOrigin(origin, allowedOrigin)) {
      return json({ error: "Origin not allowed", origin }, 403, origin, allowedOrigin);
    }

    if (!env.OPENAI_API_KEY) {
      return json({ error: "OPENAI_API_KEY is not configured on the server." }, 500, origin, allowedOrigin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400, origin, allowedOrigin);
    }

    const character = body?.character || {};
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const safeMessages = messages
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-18)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

    if (!safeMessages.length) {
      return json({ error: "At least one message is required." }, 400, origin, allowedOrigin);
    }

    const model = env.OPENAI_MODEL || "gpt-5.6-luna";
    let response;
    try {
      response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          instructions: characterInstructions(character),
          input: safeMessages,
          store: false,
        }),
      });
    } catch (error) {
      console.error("OpenAI network error", error);
      return json({ error: "The AI service could not be reached." }, 502, origin, allowedOrigin);
    }

    if (!response.ok) {
      const detail = await response.text();
      console.error("OpenAI API error", response.status, detail.slice(0, 1000));
      return json({ error: "The AI service returned an error.", status: response.status }, 502, origin, allowedOrigin);
    }

    const data = await response.json();
    const reply = typeof data.output_text === "string" ? data.output_text.trim() : "";

    if (!reply) {
      return json({ error: "The AI service returned no text." }, 502, origin, allowedOrigin);
    }

    return json({ reply }, 200, origin, allowedOrigin);
  },
};
