// TASTE BY, закрытый тест: регистрация без письма-подтверждения.
// Проверяет пароль теста (public.gate_ok), создаёт пользователя с подтверждённой почтой и профиль.
// Перед запуском заменить на обычную регистрацию с письмом и капчей.
const URL_ = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ORIGINS = ["https://sgt4vpm5jg-coder.github.io", "https://tasteby.ru", "https://www.tasteby.ru"];

function cors(req: Request) {
  const o = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ORIGINS.includes(o) ? o : ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
    "Vary": "Origin",
  };
}
const H = (req: Request) => ({ ...cors(req), "content-type": "application/json" });
const fail = (req: Request, error: string, status = 400) => new Response(JSON.stringify({ ok: false, error }), { status, headers: H(req) });
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "content-type": "application/json" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return fail(req, "method", 405);
  const b = await req.json().catch(() => null);
  if (!b) return fail(req, "Неверный запрос");
  const email = String(b.email ?? "").trim().toLowerCase();
  const password = String(b.password ?? "");
  const name = String(b.name ?? "").trim();
  const role = String(b.role ?? "");
  const handle = b.handle ? String(b.handle).trim().toLowerCase() : null;
  const gate = String(b.gate ?? "");

  // Пароль закрытого теста
  const g = await fetch(`${URL_}/rest/v1/rpc/gate_ok`, { method: "POST", headers: admin, body: JSON.stringify({ p: gate }) });
  if (!g.ok || (await g.json()) !== true) return fail(req, "Нужен пароль теста", 403);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) return fail(req, "Проверьте email");
  if (password.length < 8 || password.length > 72) return fail(req, "Пароль от 8 символов");
  if (!name || name.length > 80) return fail(req, "Укажите имя");
  if (!["shopper", "creator", "brand"].includes(role)) return fail(req, "Выберите, кто вы");
  if (role === "creator") {
    if (!handle || !/^[a-z0-9][a-z0-9_.]{2,29}$/.test(handle)) return fail(req, "Адрес витрины: 3–30 латинских букв или цифр");
    const ex = await fetch(`${URL_}/rest/v1/profiles?select=id&handle=eq.${encodeURIComponent(handle)}`, { headers: admin });
    if ((await ex.json()).length) return fail(req, "Этот адрес витрины уже занят");
  }
  if (b.consent !== true) return fail(req, "Нужно согласие с политикой");

  const u = await fetch(`${URL_}/auth/v1/admin/users`, {
    method: "POST", headers: admin,
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name, role } }),
  });
  const user = await u.json();
  if (!u.ok) {
    const msg = String(user?.msg || user?.message || user?.error_code || "");
    if (/already|exists|registered/i.test(msg)) return fail(req, "Этот email уже зарегистрирован, войдите");
    return fail(req, "Не получилось создать аккаунт", 500);
  }
  const p = await fetch(`${URL_}/rest/v1/profiles`, {
    method: "POST", headers: { ...admin, Prefer: "return=minimal" },
    body: JSON.stringify({ id: user.id, role, name, handle: role === "creator" ? handle : null }),
  });
  if (!p.ok) {
    await fetch(`${URL_}/auth/v1/admin/users/${user.id}`, { method: "DELETE", headers: admin });
    return fail(req, "Не получилось сохранить профиль", 500);
  }
  return new Response(JSON.stringify({ ok: true }), { headers: H(req) });
});
