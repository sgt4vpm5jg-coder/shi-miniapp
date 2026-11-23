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
      <nav><a href="./#examples">Примеры</a><a href="./#how">Как работает</a><a href="partners.html">Брендам и магазинам</a></nav>
      <span class="test-badge">Тест</span>
      <a class="txt-link hdr-login" data-auth href="login.html">Войти</a>
      <button class="burger" aria-label="Открыть меню"><span></span></button></div>`;
    document.body.prepend(h);
    const m = document.createElement("div");
    m.className = "menu";
    // Меню по её макету 23.11 15:02: разделы раскрываются
    m.innerHTML = `<div class="shade"></div><aside class="panel m2" aria-label="Меню">
      <div class="m-top"><a href="./" aria-label="На главную">${LOGO}</a><button class="x" aria-label="Закрыть">×</button></div>
      <details><summary>Для авторов</summary><div class="m-b">
        <p>Вас часто спрашивают, что за помада на вас или где вы нашли ту самую сумку? Соберите свои рекомендации в подборки и делитесь одной ссылкой на свою страницу.</p>
        <a class="btn fill big" href="signup.html" data-reg>Создать страницу</a>
        <a class="btn big" href="./#examples">Посмотреть примеры страниц</a></div></details>
      <details><summary>Для читателей</summary><div class="m-b">
        <p>Откройте страницу автора, чей вкус вам близок. Посмотрите его подборки, найдите вещь, которую заметили у него, или откройте для себя что-то новое.</p>
        <a class="btn fill big" href="demo.html">Смотреть подборки</a></div></details>
      <details><summary>Для брендов и магазинов</summary><div class="m-b">
        <p>Если вы хотите обсудить сотрудничество с TASTE by или предложить продукт для знакомства авторам, напишите нам и расскажите о себе.</p>
        <a class="btn fill big" href="partners.html#apply">Связаться с нами</a></div></details>
      <details><summary>О TASTE by</summary><div class="m-b">
        <p>Ваша личная страница с рекомендациями. Здесь можно собрать любимые средства, вещи и находки, которыми хочется поделиться, а ещё — посмотреть, что выбирают люди, чей вкус вам близок.</p></div></details>
      <a class="m-contact" href="partners.html#apply">Связаться с нами</a>
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
      <div><h6>Покупателям</h6><a href="./#examples">Примеры страниц</a><a href="demo.html">Демо</a><a href="signup.html?role=shopper">Создать аккаунт</a></div>
      <div><h6>Партнёрам</h6><a href="partners.html#authors">Авторам</a><a href="partners.html#brands">Брендам</a><a href="partners.html#apply">Заявка</a></div>
      <div><h6>Общее</h6><a href="./#how">Как работает TASTE by</a><a href="privacy.html">Политика конфиденциальности</a><a href="login.html">Войти</a></div>
      <div class="fine"><span>© ${new Date().getFullYear()} TASTE BY</span><span>Закрытый тест. Сайт не индексируется.</span></div></div>`;
    document.body.appendChild(f);
  }
  // Если вошли, вместо «Создать аккаунт» кнопка «Кабинет»
  async function authUi() {
    const { data } = await sb.auth.getSession();
    if (!data.session) return;
    document.querySelectorAll("[data-auth]").forEach((a) => { a.textContent = "Кабинет"; a.href = "account.html"; a.classList.add("in"); });
    document.querySelectorAll("[data-reg]").forEach((a) => a.remove());
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
