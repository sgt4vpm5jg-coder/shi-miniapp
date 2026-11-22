// TASTE BY — общий скрипт: пароль теста, шапка, меню, подвал, вход.
const TB = (() => {
  const SB_URL = "https://tscsjsenfsnafqyhmovv.supabase.co";
  const SB_KEY = "sb_publishable_GPKiDn8pFgjeomVBOOnWjg_We6GsWIC";
  const GATE_KEY = "tb_gate";
  const sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, storageKey: "tb_auth" } });
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} },
  };
  const ROLE = { shopper: "Покупатель", creator: "Автор", brand: "Бренд" };
  const LOGO = '<span class="logo"><b>taste</b><i>by</i></span>';

  // Пароль закрытого теста
  async function gateOk(p) {
    const { data, error } = await sb.rpc("gate_ok", { p });
    return !error && data === true;
  }
  function showGate() {
    document.documentElement.classList.add("gated");
    const g = document.createElement("div");
    g.className = "gate";
    g.innerHTML = `<form autocomplete="off">${LOGO}<p>Закрытый тест. Введите пароль, который вам прислали.</p>
      <input type="password" name="p" placeholder="Пароль" required autofocus>
      <div class="msg" role="alert"></div>
      <button class="btn fill wide" type="submit">Войти</button></form>`;
    document.body.appendChild(g);
    const f = $("form", g), m = $(".msg", g);
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const p = f.p.value.trim(), b = $("button", f);
      b.disabled = true; m.className = "msg";
      if (await gateOk(p)) { store.set(GATE_KEY, p); g.remove(); document.documentElement.classList.remove("gated"); }
      else { m.className = "msg err"; m.textContent = "Пароль не подошёл"; b.disabled = false; }
    });
  }
  async function gate() {
    const saved = store.get(GATE_KEY);
    if (!saved) return showGate();
    if (!(await gateOk(saved))) { store.del(GATE_KEY); showGate(); }
  }

  // Шапка, меню, подвал
  function header(opts = {}) {
    const h = document.createElement("header");
    h.className = "hdr" + (opts.dark ? " on-dark" : "");
    h.innerHTML = `<div class="wrap">
      <a href="./" aria-label="TASTE BY, на главную">${LOGO}</a>
      <nav><a href="./#curators">Авторы</a><a href="./#how">Как это работает</a><a href="partners.html">Для партнёров</a></nav>
      <span class="test-badge">Тест</span>
      <a class="btn" data-auth href="signup.html">Создать аккаунт</a>
      <button class="burger" aria-label="Меню"><span></span></button></div>`;
    document.body.prepend(h);
    const m = document.createElement("div");
    m.className = "menu";
    m.innerHTML = `<div class="shade"></div><aside class="panel" aria-label="Меню">
      <button class="x" aria-label="Закрыть">×</button>
      <h6>Авторам</h6>
      <a class="it" href="partners.html#authors">Как это работает</a>
      <a class="it" href="partners.html#authors">Своя витрина</a>
      <a class="it" href="partners.html#authors">Партнёрские ссылки<small>скоро</small></a>
      <a class="it" href="signup.html?role=creator">Стать автором</a>
      <h6>Брендам</h6>
      <a class="it" href="partners.html#brands">Сотрудничество</a>
      <a class="it" href="partners.html#apply">Оставить заявку</a>
      <h6>Покупателям</h6>
      <a class="it" href="./#curators">Авторы</a>
      <a class="it" href="./#cats">Категории</a>
      <a class="it" href="signup.html?role=shopper">Создать аккаунт</a>
      <h6>Общее</h6>
      <a class="it" href="./#about">О проекте</a>
      <a class="it" href="privacy.html">Политика конфиденциальности</a>
      <div class="acts" data-menu-acts><a class="btn fill" href="signup.html">Создать аккаунт</a><a class="btn" href="login.html">Войти</a></div>
    </aside>`;
    document.body.appendChild(m);
    const open = () => { m.classList.add("open"); document.body.style.overflow = "hidden"; };
    const close = () => { m.classList.remove("open"); document.body.style.overflow = ""; };
    $(".burger", h).onclick = open;
    $(".x", m).onclick = close; $(".shade", m).onclick = close;
    m.addEventListener("click", (e) => { if (e.target.closest("a")) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  }
  function footer() {
    const f = document.createElement("footer");
    f.innerHTML = `<div class="wrap">
      <div>${LOGO}<p style="color:var(--muted);margin-top:14px;max-width:30ch">Рекомендации людей, чьему вкусу вы доверяете.</p></div>
      <div><h6>Покупателям</h6><a href="./#curators">Авторы</a><a href="./#cats">Категории</a><a href="signup.html?role=shopper">Создать аккаунт</a></div>
      <div><h6>Партнёрам</h6><a href="partners.html#authors">Авторам</a><a href="partners.html#brands">Брендам</a><a href="partners.html#apply">Заявка</a></div>
      <div><h6>Общее</h6><a href="./#about">О проекте</a><a href="privacy.html">Политика конфиденциальности</a><a href="login.html">Войти</a></div>
      <div class="fine"><span>© ${new Date().getFullYear()} TASTE BY</span><span>Закрытый тест. Сайт не индексируется.</span></div></div>`;
    document.body.appendChild(f);
  }
  // Если вошли, вместо «Создать аккаунт» кнопка «Кабинет»
  async function authUi() {
    const { data } = await sb.auth.getSession();
    if (!data.session) return;
    document.querySelectorAll("[data-auth]").forEach((a) => { a.textContent = "Кабинет"; a.href = "account.html"; });
    const acts = document.querySelector("[data-menu-acts]");
    if (acts) acts.innerHTML = `<a class="btn fill" href="account.html">Кабинет</a><button class="btn" data-logout>Выйти</button>`;
    document.querySelectorAll("[data-logout]").forEach((b) => (b.onclick = logout));
  }
  async function logout() { await sb.auth.signOut(); location.href = "./"; }
  function msg(el, text, ok) { el.className = "msg " + (ok ? "ok" : "err"); el.textContent = text; }

  function init(opts = {}) {
    gate();
    header(opts);
    if (!opts.noFooter) footer();
    authUi();
  }
  return { sb, SB_URL, SB_KEY, init, esc, msg, logout, store, GATE_KEY, ROLE, $ };
})();
