const VERSION = "2026-09-10-jsonp-fallback";
const ALLOWED_METHODS = "GET, POST, OPTIONS";
const ALLOWED_HEADERS = "Content-Type, Accept";

function isAllowedOrigin(origin, allowedOrigin) {
  if (!origin || allowedOrigin === "*") return true;
  if (origin === allowedOrigin) return true;
  try {
    const url = new URL(origin);
    const allowed = new URL(allowedOrigin);
    return url.protocol === "https:" && url.hostname === allowed.hostname;
  } catch {
    return false;
  }
}

function corsHeaders(origin, allowedOrigin) {
  const wildcard = allowedOrigin === "*";
  return {
    "Access-Control-Allow-Origin": wildcard ? "*" : (origin || allowedOrigin),
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Max-Age": "86400",
    "Vary": wildcard ? "Accept-Encoding" : "Origin",
    "X-Mouth-Mover-Version": VERSION,
  };
}

function json(data, status, origin, allowedOrigin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(origin, allowedOrigin),
    },
  });
}

function jsonp(data, status, callback) {
  const safeCallback = /^[A-Za-z_$][0-9A-Za-z_$]*(?:\.[A-Za-z_$][0-9A-Za-z_$]*){0,4}$/.test(callback || "")
    ? callback
    : null;
  if (!safeCallback) return json({ error: "Invalid callback." }, 400, "", "*");
  const body = `${safeCallback}(${JSON.stringify(data)});`;
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Content-Type-Options": "nosniff",
      "X-Mouth-Mover-Version": VERSION,
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

function decodePayload(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function makeReply(body, env) {
  const character = body?.character || {};
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const safeMessages = messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-18)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

  if (!safeMessages.length) return { error: "At least one message is required.", status: 400 };
  if (!env.OPENAI_API_KEY) return { error: "OPENAI_API_KEY is not configured on the server.", status: 500 };

  const model = env.OPENAI_MODEL || "gpt-5.6-luna";
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
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

    if (!response.ok) {
      const detail = await response.text();
      let message = `OpenAI returned HTTP ${response.status}.`;
      try {
        const parsed = JSON.parse(detail);
        message = parsed?.error?.message || message;
      } catch {}
      console.error("OpenAI API error", response.status, detail.slice(0, 2000));
      return { error: message, status: 502 };
    }

    const data = await response.json();
    const reply = typeof data.output_text === "string" ? data.output_text.trim() : "";
    if (!reply) return { error: "The AI service returned no text.", status: 502 };
    return { reply, status: 200 };
  } catch (error) {
    console.error("OpenAI request error", error);
    return { error: "The AI service could not be reached.", status: 502 };
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = env.ALLOWED_ORIGIN || "*";

    if (request.method === "OPTIONS") {
      if (!isAllowedOrigin(origin, allowedOrigin)) return json({ error: "Origin not allowed" }, 403, origin, allowedOrigin);
      return new Response(null, { status: 204, headers: corsHeaders(origin, allowedOrigin) });
    }

    if (!isAllowedOrigin(origin, allowedOrigin)) return json({ error: "Origin not allowed" }, 403, origin, allowedOrigin);

    if (request.method === "GET") {
      const url = new URL(request.url);
      const payload = url.searchParams.get("payload");
      const callback = url.searchParams.get("callback");
      if (!payload) {
        const data = {
          ok: true,
          service: "mouth-mover-ai",
          version: VERSION,
          openaiConfigured: Boolean(env.OPENAI_API_KEY),
          model: env.OPENAI_MODEL || "gpt-5.6-luna",
        };
        return callback ? jsonp(data, 200, callback) : json(data, 200, origin, allowedOrigin);
      }
      try {
        const body = decodePayload(payload);
        const result = await makeReply(body, env);
        const data = result.reply ? { reply: result.reply } : { error: result.error };
        return callback ? jsonp(data, result.status, callback) : json(data, result.status, origin, allowedOrigin);
      } catch (error) {
        console.error("GET chat payload error", error);
        const data = { error: "Invalid chat payload." };
        return callback ? jsonp(data, 400, callback) : json(data, 400, origin, allowedOrigin);
      }
    }

    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, origin, allowedOrigin);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400, origin, allowedOrigin);
    }

    const result = await makeReply(body, env);
    return json(result.reply ? { reply: result.reply } : { error: result.error }, result.status, origin, allowedOrigin);
  },
};