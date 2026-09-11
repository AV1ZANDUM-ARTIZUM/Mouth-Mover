const VERSION = "2026-09-11-free-worker";
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
  const safeCallback = /^[A-Za-z_$][0-9A-Za-z_$]*(?:\.[A-Za-z_$][0-9A-Za-z_$]*){0,4}$/.test(callback || "") ? callback : null;
  if (!safeCallback) return json({ error: "Invalid callback." }, 400, "", "*");
  return new Response(`${safeCallback}(${JSON.stringify(data)});`, {
    status,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Content-Type-Options": "nosniff",
      "X-Mouth-Mover-Version": VERSION,
    },
  });
}

function decodePayload(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function freeReply(body) {
  const character = body?.character || {};
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const last = [...messages].reverse().find(m => m?.role === "user" && typeof m.content === "string");
  const text = String(last?.content || "").replace(/\s+/g, " ").trim().slice(0, 300);
  const name = String(character.name || "AI character").slice(0, 80);
  const personality = String(character.personality || "friendly, curious and helpful").slice(0, 180);

  if (!text) return { reply: `Hey! I'm ${name}. What should we talk about?` };
  const lower = text.toLowerCase();
  if (/^(hi|hello|hey|yo|sup|hiya)\b/.test(lower)) return { reply: `Hey! It's ${name}! 😄 What's going on?` };
  if (/what(?:'s| is) my name|do you remember my name/.test(lower)) return { reply: "I can remember details during this conversation, but I don't know your name yet unless you told me here." };
  if (/who are you|what are you/.test(lower)) return { reply: `I'm ${name}. ${personality}` };
  if (/\b(joke|funny)\b/.test(lower)) return { reply: "Why did the computer go to the doctor? It had a virus. 😄" };
  if (/\b(thank|thanks)\b/.test(lower)) return { reply: "Anytime! 😄" };
  if (/\b(bye|goodbye|see ya)\b/.test(lower)) return { reply: "See you later! 👋" };
  if (/\b(nxe4)\b/i.test(text)) return { reply: "Nxe4! Knight takes e4. 😏 Your move. ♟️" };
  if (/\?$/.test(text)) return { reply: `Good question, ${name} would say. About “${text.replace(/\?+$/, "")}": let's work through it together. What part should we tackle first?` };
  return { reply: `I caught what you said: “${text}.” ${personality} What happens next?` };
}

function chatResponse(body) {
  const result = freeReply(body);
  return { ...result, offline: true, provider: "Mouth Mover Free Worker AI" };
}

async function handleChat(request, body, env) {
  const result = chatResponse(body);
  return result;
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
      const aiTest = url.searchParams.get("test") === "ai";

      if (!payload && aiTest) {
        const data = {
          ok: true,
          ai: false,
          free: true,
          provider: "Mouth Mover Free Worker AI",
          model: "browser-free",
          version: VERSION,
        };
        return callback ? jsonp(data, 200, callback) : json(data, 200, origin, allowedOrigin);
      }

      if (!payload) {
        const data = {
          ok: true,
          service: "mouth-mover-ai",
          version: VERSION,
          free: true,
          openaiConfigured: false,
          model: "browser-free",
        };
        return callback ? jsonp(data, 200, callback) : json(data, 200, origin, allowedOrigin);
      }

      try {
        const body = decodePayload(payload);
        const data = chatResponse(body);
        return callback ? jsonp(data, 200, callback) : json(data, 200, origin, allowedOrigin);
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

    return json(chatResponse(body), 200, origin, allowedOrigin);
  },
};