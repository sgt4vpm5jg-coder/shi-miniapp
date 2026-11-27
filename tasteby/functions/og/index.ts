// TASTE BY: по ссылке на товар подтягивает название, магазин и фото.
// Фото копируется в хранилище tb-media в папку автора, чтобы не зависеть от сайта магазина.
// Защита: только http/https, без внутренних адресов, тайм-аут, ограничение размера, только вошедшие авторы.
const URL_ = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ORIGINS = ["https://sgt4vpm5jg-coder.github.io", "https://tasteby.ru", "https://www.tasteby.ru", "https://taste.by", "https://www.taste.by"];
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

function cors(req: Request) {
  const o = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ORIGINS.includes(o) ? o : ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
    "Vary": "Origin",
  };
}
const json = (req: Request, o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors(req), "content-type": "application/json" } });

// Внутренние и служебные адреса не открываем
function badHost(h: string): boolean {
  h = h.toLowerCase().replace(/^\[|\]$/g, "");
  if (!h || h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".lan")) return true;
  if (h.includes(":")) return true; // IPv6 литералы не принимаем
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m) {
    const [a, b] = [+m[1], +m[2]];
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224) return true;
  }
  if (/^\d+$/.test(h) || /^0x/i.test(h)) return true;
  return false;
}
function checkUrl(u: string): URL | null {
  try {
    const x = new URL(u);
    if (!["http:", "https:"].includes(x.protocol) || x.username || x.password || badHost(x.hostname)) return null;
    if (x.port && !["80", "443"].includes(x.port)) return null;
    return x;
  } catch { return null; }
}
async function resolvesPublic(host: string): Promise<boolean> {
  try {
    const ips = await Deno.resolveDns(host, "A");
    return ips.length > 0 && ips.every((ip) => !badHost(ip));
  } catch { return true; } // если DNS недоступен в среде, полагаемся на проверку имени
}
// Запрос с ручными переадресациями (каждая проверяется), тайм-аутом и лимитом размера
async function safeFetch(start: string, accept: string, maxBytes: number): Promise<{ url: URL; type: string; body: Uint8Array } | null> {
  let cur = checkUrl(start);
  for (let hop = 0; cur && hop < 4; hop++) {
    if (!(await resolvesPublic(cur.hostname))) return null;
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 7000);
    let r: Response;
    try {
      r = await fetch(cur.href, { redirect: "manual", signal: ctl.signal, headers: { "user-agent": UA, accept, "accept-language": "ru,en;q=0.8" } });
    } catch { clearTimeout(t); return null; }
    if (r.status >= 300 && r.status < 400) {
      const loc = r.headers.get("location"); clearTimeout(t);
      await r.body?.cancel();
      if (!loc) return null;
      cur = checkUrl(new URL(loc, cur).href);
      continue;
    }
    if (!r.ok || !r.body) { clearTimeout(t); await r.body?.cancel(); return null; }
    const reader = r.body.getReader();
    const chunks: Uint8Array[] = []; let n = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        n += value.length;
        if (n > maxBytes) { await reader.cancel(); break; }
        chunks.push(value);
      }
    } catch { /* обрыв: берём, что успели */ } finally { clearTimeout(t); }
    const body = new Uint8Array(Math.min(n, maxBytes)); let o = 0;
    for (const c of chunks) { const take = Math.min(c.length, body.length - o); body.set(c.subarray(0, take), o); o += take; if (o >= body.length) break; }
    return { url: cur, type: (r.headers.get("content-type") || "").toLowerCase(), body };
  }
  return null;
}
const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d)).replace(/\s+/g, " ").trim();
function meta(html: string, keys: string[]): string {
  for (const k of keys) {
    const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${k}["'][^>]*content=["']([^"']+)["']`, "i");
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${k}["']`, "i");
    const m = html.match(re1) || html.match(re2);
    if (m) return decode(m[1]);
  }
  return "";
}
function shopName(host: string): string {
  const h = host.replace(/^www\./, "").replace(/^m\./, "");
  const known: Record<string, string> = { "goldapple.ru": "Золотое Яблоко", "letu.ru": "Л'Этуаль", "ozon.ru": "Ozon", "wildberries.ru": "Wildberries", "market.yandex.ru": "Яндекс Маркет", "lamoda.ru": "Lamoda", "randewoo.ru": "Randewoo", "sephora.com": "Sephora", "tsum.ru": "ЦУМ", "iledebeaute.ru": "Иль де Ботэ" };
  return known[h] || h.split(".").slice(0, -1).join(".") || h;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { ok: false, error: "method" }, 405);
  // Только вошедший пользователь
  const auth = req.headers.get("authorization") || "";
  const ur = await fetch(`${URL_}/auth/v1/user`, { headers: { apikey: SERVICE, authorization: auth } });
  if (!ur.ok) return json(req, { ok: false, error: "Войдите в кабинет" }, 401);
  const user = await ur.json();
  const b = await req.json().catch(() => null);
  const link = checkUrl(String(b?.url ?? "").trim());
  if (!link) return json(req, { ok: false, error: "Проверьте ссылку: нужна полная ссылка на товар" });

  const page = await safeFetch(link.href, "text/html,application/xhtml+xml", 900_000);
  const out: Record<string, string> = { shop: shopName(link.hostname), title: "", image: "", photo_url: "" };
  if (page && page.type.includes("html")) {
    const html = new TextDecoder().decode(page.body);
    out.title = meta(html, ["og:title", "twitter:title"]) || decode((html.match(/<title[^>]*>([^<]{1,300})<\/title>/i) || [])[1] || "");
    const site = meta(html, ["og:site_name"]);
    if (site && site.length <= 40) out.shop = site;
    const img = meta(html, ["og:image:secure_url", "og:image", "twitter:image", "twitter:image:src"]);
    if (img) { try { out.image = new URL(img, page.url).href; } catch { /* нет фото */ } }
  }
  out.title = out.title.slice(0, 120);
  // Фото копируем в папку автора
  if (out.image) {
    const pic = await safeFetch(out.image, "image/avif,image/webp,image/jpeg,image/png,image/*", 5_000_000);
    const ext = pic?.type.includes("png") ? "png" : pic?.type.includes("webp") ? "webp" : pic?.type.includes("jpeg") || pic?.type.includes("jpg") ? "jpg" : "";
    if (pic && ext && pic.body.length > 1000) {
      const path = `${user.id}/og-${crypto.randomUUID()}.${ext}`;
      const up = await fetch(`${URL_}/storage/v1/object/tb-media/${path}`, {
        method: "POST", headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, "content-type": `image/${ext === "jpg" ? "jpeg" : ext}`, "x-upsert": "false" }, body: pic.body,
      });
      if (up.ok) out.photo_url = `${URL_}/storage/v1/object/public/tb-media/${path}`;
    }
  }
  return json(req, { ok: true, ...out, found: !!(out.title || out.photo_url) });
});
