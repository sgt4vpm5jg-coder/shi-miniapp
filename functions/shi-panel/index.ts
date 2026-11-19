// Бот @shi_panel_bot: панель кнопок под новыми постами каналов SHI | РЕАКЦИЯ и SHI SHOP.
// Кнопки ведут в разделы мини-приложения SHI (@shi_media_bot). Пост с ✨, альбом или пост со своими кнопками не трогаем.
// Токен из секрета SHI_PANEL_TOKEN. Запросы от Telegram проверяются по заголовку secret_token.
const TOKEN = Deno.env.get("SHI_PANEL_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const CHANNEL = -1001441967671; // SHI | РЕАКЦИЯ
const APP = "https://t.me/shi_media_bot?startapp";
const SHOP = -1003855705601; // SHI SHOP: под новыми постами та же панель категорий, что под карточками
const SHOP_PANEL = {
  inline_keyboard: [
    [{ text: "Бренды", url: "https://t.me/shi_shopping/48" }, { text: "Макияж", url: "https://t.me/shi_shopping/4" }],
    [{ text: "Уход", url: "https://t.me/shi_shopping/45" }, { text: "Тело", url: "https://t.me/shi_shopping/46" }, { text: "Парфюмерия", url: "https://t.me/shi_shopping/47" }],
    [{ text: "ПИШИ SHI ↗", url: "https://t.me/shiwithme" }],
  ],
};
const FIX_POSTS = [1544]; // посты, на которых панель уже стоит и её нужно обновить
const PANEL = {
  inline_keyboard: [
    [{ text: "SHI SHOP ↗", url: APP + "=shop" }, { text: "SHI BUYER ↗", url: APP + "=buyer" }],
    [{ text: "SHI СОТРУДНИЧЕСТВО ↗", url: APP + "=partners" }],
    [{ text: "О НАС ↗", url: APP }, { text: "SHI НА СВЯЗИ ↗", url: "https://t.me/shiwithme" }],
  ],
};

async function secret(): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("panel:" + TOKEN));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 48);
}
async function tg(method: string, body: unknown) {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  return await r.json();
}
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (!TOKEN) return json({ ok: false, error: "SHI_PANEL_TOKEN is not set" }, 500);

  if (req.method === "GET" && url.searchParams.get("setup") === "1") {
    const hook = `${SUPABASE_URL}/functions/v1/shi-panel`;
    const who = await tg("getMe", {});
    // Защита: вебхук ставим только боту панели, чтобы не перебить @shi_media_bot чужим токеном
    if (who?.result?.username !== "shi_panel_bot") return json({ ok: false, error: "wrong token", bot: who?.result?.username || null }, 400);
    const before = await tg("getWebhookInfo", {});
    const r = await tg("setWebhook", { url: hook, secret_token: await secret(), allowed_updates: ["channel_post"] });
    const me = await tg("getMe", {});
    return json({ ok: r.ok, description: r.description, bot: me?.result?.username, previous_webhook: before?.result?.url || "(none)" });
  }
  if (req.method === "GET" && url.searchParams.get("fix") === "1") {
    const who = await tg("getMe", {});
    if (who?.result?.username !== "shi_panel_bot") return json({ ok: false, error: "wrong token", bot: who?.result?.username || null }, 400);
    const out: Record<string, unknown> = {};
    for (const id of FIX_POSTS) {
      const r = await tg("editMessageReplyMarkup", { chat_id: CHANNEL, message_id: id, reply_markup: PANEL });
      out[id] = r.ok ? "ok" : r.description;
    }
    return json(out);
  }
  if (req.method !== "POST") return new Response("ok");
  if (req.headers.get("x-telegram-bot-api-secret-token") !== (await secret())) return new Response("forbidden", { status: 403 });

  const update = await req.json().catch(() => null);
  const p = update?.channel_post;
  const chat = p?.chat?.id;
  if (!p || (chat !== CHANNEL && chat !== SHOP)) return new Response("ok");
  const text = String(p.text || p.caption || "");
  if (p.media_group_id || p.reply_markup || text.includes("✨")) return new Response("ok");
  await tg("editMessageReplyMarkup", { chat_id: chat, message_id: p.message_id, reply_markup: chat === SHOP ? SHOP_PANEL : PANEL });
  return new Response("ok");
});
