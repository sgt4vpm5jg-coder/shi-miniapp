// Webhook бота @shi_media_bot: приветствие на /start (обложка SHI + кнопки разделов), на остальное короткий ответ.
// Токен из секрета SHI_BOT_TOKEN. Запросы от Telegram проверяются по заголовку secret_token.
const TOKEN = Deno.env.get("SHI_BOT_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const APP = "https://sgt4vpm5jg-coder.github.io/shi-miniapp/";
// 26.11: обложка с цветком по её макету вместо кадра с девушкой
const COVER = APP + "media/bot/shi_bot_banner_1280x720.jpg";

async function secret(): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("shi:" + TOKEN));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 48);
}
async function tg(method: string, body: unknown) {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  return await r.json();
}
async function settings(): Promise<Record<string, string>> {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/settings?select=key,value`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
    const j = await r.json();
    const o: Record<string, string> = {};
    for (const x of j || []) o[x.key] = x.value;
    return o;
  } catch { return {}; }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
  if (!TOKEN) return json({ ok: false, error: "SHI_BOT_TOKEN is not set" }, 500);

  if (req.method === "GET" && url.searchParams.get("setup") === "1") {
    const hook = `${SUPABASE_URL}/functions/v1/shi-bot`;
    const r = await tg("setWebhook", { url: hook, secret_token: await secret(), allowed_updates: ["message"], drop_pending_updates: true });
    const c = await tg("setMyCommands", { commands: [{ command: "start", description: "Открыть SHI" }] });
    const me = await tg("getMe", {});
    return json({ ok: r.ok, description: r.description, commands: c.ok, bot: me?.result?.username });
  }
  if (req.method !== "POST") return new Response("ok");
  if (req.headers.get("x-telegram-bot-api-secret-token") !== (await secret())) return new Response("forbidden", { status: 403 });

  const update = await req.json().catch(() => null);
  const m = update?.message;
  if (!m?.chat?.id) return new Response("ok");
  const text = String(m.text || "").trim();
  const s = await settings();
  const contact = (s.contact_username || "zakaz_sb").replace(/^@/, "");
  const insta = s.instagram_url || "https://instagram.com/shi.with.me";
  const app = (sec?: string) => ({ url: sec ? `${APP}?s=${sec}` : APP });

  if (text.startsWith("/start")) {
    const kb = { inline_keyboard: [
      [{ text: "✦ Открыть SHI", web_app: app() }],
      [{ text: "SHI SHOP", web_app: app("shop") }, { text: "SHI BUYER", web_app: app("buyer") }],
      [{ text: "SHI PARTNERS", web_app: app("partners") }, { text: "Instagram", url: insta }],
    ] };
    const caption = "<b>SHI</b> · <i>independent beauty media</i>\nМедиа, косметика и байер в одном приложении.";
    const r = await tg("sendPhoto", { chat_id: m.chat.id, photo: COVER, caption, parse_mode: "HTML", reply_markup: kb });
    if (!r.ok) await tg("sendMessage", { chat_id: m.chat.id, text: caption, parse_mode: "HTML", reply_markup: kb });
  } else {
    await tg("sendMessage", {
      chat_id: m.chat.id, parse_mode: "HTML",
      text: `Откройте приложение <b>SHI</b> кнопкой ниже.\nПо вопросам пишите @${contact}.`,
      reply_markup: { inline_keyboard: [[{ text: "✦ Открыть SHI", web_app: app() }]] },
    });
  }
  return new Response("ok");
});
