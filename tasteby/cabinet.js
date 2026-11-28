// TASTE BY: кабинет автора (этап 2). Мастер из 3 шагов с живым превью, профиль, подборки, находки, публикация.
TB.init({ noFooter: true });
(() => {
  const sb = TB.sb, esc = TB.esc, $ = (s, el = document) => el.querySelector(s);
  const S = { user: null, p: null, cols: [], items: [], tab: "items", filter: "all", step: 1, draft: null };
  const main = $("#main"), prevBox = $("#prevBox"), prev = $("#prev"), sheet = $("#sheet"), toastEl = $("#toast");
  const pageUrl = () => new URL("page.html?u=" + S.p.handle, location.href).href;

  function toast(t, bad) { toastEl.textContent = t; toastEl.className = "toast on" + (bad ? " bad" : ""); clearTimeout(toast.t); toast.t = setTimeout(() => (toastEl.className = "toast"), 2600); }
  const fail = (e) => { console.error(e); toast(e?.message && !/^[A-Z_]+$/.test(e.message) ? "Не сохранилось: " + e.message : "Не сохранилось, попробуйте ещё раз", true); };

  // Живое превью: данные кабинета плюс несохранённый черновик
  function preview() {
    if (!S.p) return;
    prevBox.hidden = false;
    const d = { handle: S.p.handle, name: S.p.name, bio: S.p.bio, avatar_url: S.p.avatar_url, collections: S.cols, items: S.items.slice() };
    if (S.draft) {
      const x = S.draft;
      const col = x.collection_id || (x.newCol ? "draft-col" : null);
      if (x.newCol && !S.cols.find((c) => c.id === "draft-col")) d.collections = [...S.cols, { id: "draft-col", title: x.newCol }];
      const it = { id: x.id || "draft", collection_id: col, title: x.title || "Название товара", url: x.url || "#", shop: x.shop || "", photo_url: x.photo_url || "", comment: x.comment || "" };
      const i = d.items.findIndex((y) => y.id === x.id);
      if (i >= 0) d.items[i] = it; else d.items.unshift(it);
    }
    TBPage.render(prev, d, { preview: true });
  }

  // Фото: уменьшаем до 1200 px и кладём в свою папку
  async function upload(file) {
    if (!file || !/^image\//.test(file.type)) throw new Error("Нужна картинка");
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.86));
    const path = `${S.user.id}/${crypto.randomUUID()}.jpg`;
    const { error } = await sb.storage.from("tb-media").upload(path, blob, { contentType: "image/jpeg", upsert: false });
    if (error) throw error;
    return sb.storage.from("tb-media").getPublicUrl(path).data.publicUrl;
  }
  async function og(url) {
    const { data: s } = await sb.auth.getSession();
    const r = await fetch(TB.SB_URL + "/functions/v1/og", { method: "POST", headers: { "content-type": "application/json", apikey: TB.SB_KEY, authorization: "Bearer " + s.session.access_token }, body: JSON.stringify({ url }) });
    return r.json().catch(() => ({ ok: false }));
  }
  const domainShop = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };

  async function load() {
    const { data: s } = await sb.auth.getSession();
    if (!s.session) return location.replace("login.html");
    S.user = s.session.user;
    const { data: p, error } = await sb.from("profiles").select("id,role,name,handle,bio,avatar_url,published,onboarded").eq("id", S.user.id).maybeSingle();
    if (error || !p) { main.innerHTML = `<h1>Кабинет</h1><p class="lead">Не получилось загрузить профиль. Обновите страницу.</p>`; return; }
    if (p.role !== "creator" || !p.handle) return location.replace("account.html");
    S.p = p;
    const [c, i] = await Promise.all([
      sb.from("collections").select("id,title,sort").order("sort").order("created_at"),
      sb.from("items").select("id,collection_id,title,url,shop,photo_url,comment,sort").order("sort").order("created_at"),
    ]);
    S.cols = c.data || []; S.items = i.data || [];
    p.onboarded ? draw() : wizard();
  }

  // ---------- Мастер: 3 шага ----------
  function wizard() {
    const steps = `<ol class="wz-steps">${["Имя и фото", "Первая находка", "Готово"].map((t, i) => `<li class="${i + 1 === S.step ? "on" : i + 1 < S.step ? "done" : ""}"><b>${i + 1}</b>${t}</li>`).join("")}</ol>`;
    if (S.step === 1) {
      main.innerHTML = `${steps}<h1>Как вас зовут?</h1><p class="lead">Это увидят на вашей странице. Всё можно поменять потом.</p>
        <form id="f1">${avatarField()}
        <label class="field"><span>Имя</span><input name="name" maxlength="80" required value="${esc(S.p.name)}"></label>
        <label class="field"><span>Пара слов о себе</span><textarea name="bio" maxlength="300" placeholder="Например: визажист, люблю уход и нишевые ароматы">${esc(S.p.bio)}</textarea><small class="cnt"></small></label>
        <button class="btn fill wide">Дальше</button></form>`;
      const f = $("#f1");
      bindAvatar(f); counter(f.bio);
      f.oninput = () => { S.p.name = f.name.value; S.p.bio = f.bio.value; preview(); };
      f.onsubmit = async (e) => {
        e.preventDefault();
        if (!f.name.value.trim()) return toast("Укажите имя", true);
        if (S.avBusy) return toast("Фото ещё загружается, секунду", true);
        const b = $("button.fill", f); b.disabled = true;
        const { error } = await sb.from("profiles").update({ name: f.name.value.trim(), bio: f.bio.value.trim(), avatar_url: S.p.avatar_url }).eq("id", S.p.id);
        b.disabled = false;
        if (error) return fail(error);
        S.step = 2; wizard();
      };
    } else if (S.step === 2) {
      S.draft = S.draft || { url: "", title: "", shop: "", photo_url: "", comment: "", newCol: S.cols[0] ? "" : "Мои находки", collection_id: S.cols[0]?.id || null };
      main.innerHTML = `${steps}<h1>Добавьте первую находку</h1><p class="lead">Вставьте ссылку на товар, мы подтянем название и фото.</p>
        <form id="f2">${itemFields(S.draft)}
        <button class="btn fill wide">Добавить на страницу</button>
        <p class="alt"><a href="#" data-skip>Пропустить</a></p></form>`;
      bindItem($("#f2"), async () => { if (await saveDraft()) { S.step = 3; wizard(); } });
      $("[data-skip]").onclick = (e) => { e.preventDefault(); S.draft = null; S.step = 3; wizard(); };
    } else {
      main.innerHTML = `${steps}<h1>Страница готова</h1><p class="lead">Ваш адрес: <b>tasteby.ru/${esc(S.p.handle)}</b>. Опубликуйте, чтобы её видели по ссылке, или сначала добавьте ещё находок.</p>
        <button class="btn fill wide" data-pub>Опубликовать</button>
        <p style="margin-top:12px"><button class="btn wide" data-later>Сначала доделаю</button></p>`;
      const finish = async (pub) => {
        if (pub && !S.items.length) { S.step = 2; wizard(); return toast("Сначала добавьте хотя бы одну находку", true); }
        const { error } = await sb.from("profiles").update({ onboarded: true, ...(pub ? { published: true } : {}) }).eq("id", S.p.id);
        if (error) return fail(error);
        S.p.onboarded = true; if (pub) S.p.published = true;
        toast(pub ? "Страница опубликована" : "Сохранено");
        draw();
      };
      $("[data-pub]").onclick = () => finish(true);
      $("[data-later]").onclick = () => finish(false);
    }
    preview();
  }

  // ---------- Поля ----------
  function avatarField() {
    return `<div class="av-field"><button type="button" class="av-pick" style="${esc(TBPage.bg(S.p.avatar_url))}">${S.p.avatar_url ? "" : esc(TBPage.initials(S.p.name))}</button>
      <div><b>Фото</b><span>Квадратное, лицо по центру</span><button type="button" class="txt" data-av>${S.p.avatar_url ? "Заменить" : "Загрузить"}</button>${S.p.avatar_url ? ` · <button type="button" class="txt" data-avdel>Убрать</button>` : ""}</div>
      <input type="file" accept="image/*" hidden data-avfile></div>`;
  }
  function bindAvatar(f) {
    const inp = $("[data-avfile]", f);
    const pick = () => inp.click();
    $(".av-pick", f).onclick = pick; $("[data-av]", f).onclick = pick;
    const del = $("[data-avdel]", f);
    if (del) del.onclick = () => { S.p.avatar_url = null; refreshAvatar(f); preview(); };
    inp.onchange = async () => {
      S.avBusy = true;
      try { toast("Загружаю фото…"); S.p.avatar_url = await upload(inp.files[0]); refreshAvatar(f); preview(); toast("Фото загружено"); }
      catch (e) { fail(e); } finally { S.avBusy = false; }
    };
  }
  function refreshAvatar(f) { const box = $(".av-field", f); box.outerHTML = avatarField(); bindAvatar(f); }
  function counter(t) { const c = t.parentElement.querySelector(".cnt"); const u = () => (c.textContent = `${t.value.length} / ${t.maxLength}`); t.addEventListener("input", u); u(); }

  function colOptions(x) {
    return `<option value="">Без подборки</option>${S.cols.map((c) => `<option value="${c.id}" ${x.collection_id === c.id ? "selected" : ""}>${esc(c.title)}</option>`).join("")}<option value="__new" ${x.newCol ? "selected" : ""}>+ Новая подборка</option>`;
  }
  function itemFields(x) {
    return `<label class="field"><span>Ссылка на товар</span><div class="pre url"><input name="url" type="url" inputmode="url" placeholder="https://" value="${esc(x.url)}" required><button type="button" class="btn fill sm" data-og>Подтянуть</button></div><small class="hint" data-oghint>Название и фото подставятся сами. Если магазин не отдаёт их, заполните вручную.</small></label>
      <div class="it-photo"><div class="ph" data-ph style="${esc(TBPage.bg(x.photo_url))}">${x.photo_url ? "" : "Фото"}</div>
        <div><button type="button" class="btn sm" data-pfile>${x.photo_url ? "Заменить фото" : "Загрузить фото"}</button><input type="file" accept="image/*" hidden data-pinput><small class="hint">Лучше на белом фоне, товар целиком</small></div></div>
      <label class="field"><span>Название</span><input name="title" maxlength="120" value="${esc(x.title)}" required></label>
      <label class="field"><span>Магазин</span><input name="shop" maxlength="80" value="${esc(x.shop)}" placeholder="Например, Золотое Яблоко"></label>
      <label class="field"><span>Ваш комментарий</span><textarea name="comment" maxlength="500" placeholder="Почему советуете, кому подойдёт">${esc(x.comment)}</textarea><small class="cnt"></small></label>
      <label class="field"><span>Подборка</span><select name="col">${colOptions(x)}</select></label>
      <label class="field" data-newcol ${x.newCol ? "" : "hidden"}><span>Название новой подборки</span><input name="newCol" maxlength="40" value="${esc(x.newCol || "")}" placeholder="Например, Уход"></label>`;
  }
  // Привязка формы находки к черновику S.draft
  function bindItem(f, onSave) {
    const x = S.draft;
    counter(f.comment);
    const sync = () => {
      x.url = f.url.value.trim(); x.title = f.title.value; x.shop = f.shop.value; x.comment = f.comment.value;
      const v = f.col.value; x.collection_id = v && v !== "__new" ? v : null;
      x.newCol = v === "__new" ? (f.newCol.value || "") : "";
      $("[data-newcol]", f).hidden = v !== "__new";
      preview();
    };
    f.addEventListener("input", sync); f.col.onchange = () => { if (f.col.value === "__new" && !f.newCol.value) f.newCol.value = "Новая подборка"; sync(); };
    const ogBtn = $("[data-og]", f), hint = $("[data-oghint]", f);
    ogBtn.onclick = async () => {
      sync();
      if (!/^https?:\/\/.+\..+/i.test(x.url)) return toast("Вставьте полную ссылку, начиная с https://", true);
      ogBtn.disabled = true; ogBtn.textContent = "Ищу…"; x.busy = true;
      const r = await og(x.url).catch(() => ({ ok: false }));
      ogBtn.disabled = false; ogBtn.textContent = "Подтянуть"; x.busy = false;
      if (S.draft !== x) return; // форму уже закрыли
      if (!r.ok) return toast(r.error || "Не получилось открыть ссылку", true);
      if (r.title && !f.title.value) f.title.value = r.title;
      if (r.shop && !f.shop.value) f.shop.value = r.shop;
      if (r.photo_url) { x.photo_url = r.photo_url; setPhoto(f); }
      hint.textContent = r.found ? "Готово. Проверьте название, его можно сократить." : "Магазин не отдал данные, заполните название и фото вручную.";
      if (!f.shop.value) f.shop.value = domainShop(x.url);
      sync();
    };
    const pin = $("[data-pinput]", f);
    $("[data-pfile]", f).onclick = () => pin.click();
    pin.onchange = async () => {
      x.busy = true;
      try { toast("Загружаю фото…"); const u = await upload(pin.files[0]); if (S.draft !== x) return; x.photo_url = u; setPhoto(f); preview(); toast("Фото загружено"); }
      catch (e) { fail(e); } finally { x.busy = false; }
    };
    f.onsubmit = async (e) => {
      e.preventDefault(); sync();
      if (x.busy) return toast("Фото ещё загружается, секунду", true);
      if (!/^https?:\/\/.+\..+/i.test(x.url)) return toast("Проверьте ссылку", true);
      if (!x.title.trim()) return toast("Укажите название", true);
      if (f.col.value === "__new" && !x.newCol.trim()) return toast("Назовите подборку", true);
      const b = $("button.fill.wide", f); b.disabled = true;
      await onSave(); b.disabled = false;
    };
  }
  function setPhoto(f) { const ph = $("[data-ph]", f); ph.setAttribute("style", TBPage.bg(S.draft.photo_url)); ph.textContent = ""; $("[data-pfile]", f).textContent = "Заменить фото"; }

  // Сохранить черновик находки (новую или изменённую)
  async function saveDraft() {
    const x = S.draft;
    try {
      let colId = x.collection_id;
      const same = x.newCol && S.cols.find((c) => c.title === x.newCol.trim().slice(0, 40));
      if (same) colId = same.id;
      else if (x.newCol && x.newCol.trim()) {
        const { data, error } = await sb.from("collections").insert({ user_id: S.user.id, title: x.newCol.trim().slice(0, 40), sort: (S.cols.at(-1)?.sort ?? 0) + 10 }).select("id,title,sort").single();
        if (error) throw error;
        S.cols.push(data); colId = data.id;
      }
      const row = { collection_id: colId, title: x.title.trim().slice(0, 120), url: x.url, shop: (x.shop || domainShop(x.url)).trim().slice(0, 80), photo_url: x.photo_url || null, comment: x.comment.trim().slice(0, 500) };
      if (x.id) {
        const { data, error } = await sb.from("items").update(row).eq("id", x.id).select("id,collection_id,title,url,shop,photo_url,comment,sort").single();
        if (error) throw error;
        S.items[S.items.findIndex((i) => i.id === x.id)] = data;
      } else {
        const sort = (S.items[0]?.sort ?? 10) - 10; // новые сверху
        const { data, error } = await sb.from("items").insert({ ...row, user_id: S.user.id, sort }).select("id,collection_id,title,url,shop,photo_url,comment,sort").single();
        if (error) throw error;
        S.items.unshift(data);
      }
      S.draft = null; toast("Сохранено"); return true;
    } catch (e) { fail(e); return false; }
  }

  // ---------- Кабинет ----------
  function draw() {
    const p = S.p;
    main.innerHTML = `
      <div class="cab-head"><h1>Кабинет</h1>
        <div class="cab-addr"><span class="st ${p.published ? "on" : ""}">${p.published ? "Опубликована" : "Черновик"}</span><b>tasteby.ru/${esc(p.handle)}</b></div>
        <div class="cab-acts"><a class="btn sm" href="page.html?u=${esc(p.handle)}" target="_blank" rel="noopener">Открыть страницу</a>
          <button class="btn sm" data-copy>Скопировать ссылку</button>
          <button class="btn sm ${p.published ? "" : "fill"}" data-pub>${p.published ? "Скрыть страницу" : "Опубликовать"}</button></div></div>
      <div class="cab-tabs" role="tablist">${[["items", "Находки"], ["cols", "Подборки"], ["profile", "Профиль"]].map(([k, t]) => `<button role="tab" class="${S.tab === k ? "on" : ""}" data-tab="${k}">${t}</button>`).join("")}</div>
      <div id="tab"></div>
      <p class="cab-out"><button class="txt" data-logout>Выйти</button></p>`;
    main.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => { if (S.pOrig) { Object.assign(S.p, S.pOrig); S.pOrig = null; } S.tab = b.dataset.tab; draw(); }));
    $("[data-logout]", main).onclick = TB.logout;
    $("[data-copy]", main).onclick = async (e) => { try { await navigator.clipboard.writeText(pageUrl()); toast("Ссылка скопирована"); } catch { toast("Не получилось скопировать", true); } };
    $("[data-pub]", main).onclick = async () => {
      const v = !p.published;
      if (v && !S.items.length) return toast("Сначала добавьте хотя бы одну находку", true);
      const { error } = await sb.from("profiles").update({ published: v }).eq("id", p.id);
      if (error) return fail(error);
      p.published = v; toast(v ? "Страница опубликована" : "Страница скрыта"); draw();
    };
    ({ items: tabItems, cols: tabCols, profile: tabProfile })[S.tab]();
    preview();
  }

  function tabItems() {
    const t = $("#tab");
    const list = S.items.filter((i) => S.filter === "all" || (S.filter === "none" ? !i.collection_id : i.collection_id === S.filter));
    const chips = [{ id: "all", title: "Все" }, ...S.cols, ...(S.items.some((i) => !i.collection_id) ? [{ id: "none", title: "Без подборки" }] : [])];
    t.innerHTML = `<button class="btn fill wide" data-add>+ Добавить находку</button>
      ${S.cols.length ? `<div class="chips2 cab-chips">${chips.map((c) => `<button class="${S.filter === c.id ? "on" : ""}" data-f="${c.id}">${esc(c.title)}</button>`).join("")}</div>` : ""}
      ${list.length ? `<ul class="rows">${list.map((i, k) => `<li data-id="${i.id}">
          <div class="th" style="${esc(TBPage.bg(i.photo_url))}"></div>
          <div class="tx"><b>${esc(i.title)}</b><small>${esc(i.shop)}${i.collection_id ? " · " + esc(S.cols.find((c) => c.id === i.collection_id)?.title || "") : ""}</small></div>
          <div class="ac"><button aria-label="Выше" data-up ${k ? "" : "disabled"}>↑</button><button aria-label="Ниже" data-down ${k < list.length - 1 ? "" : "disabled"}>↓</button><button data-edit>Изменить</button><button class="del" data-del>Удалить</button></div></li>`).join("")}</ul>`
        : `<p class="empty">${S.items.length ? "В этой подборке пока пусто." : "Пока нет находок. Добавьте первую: ссылка, фото и пара слов от вас."}</p>`}`;
    $("[data-add]", t).onclick = () => editItem(null);
    t.querySelectorAll("[data-f]").forEach((b) => (b.onclick = () => { S.filter = b.dataset.f; draw(); }));
    t.querySelectorAll(".rows li").forEach((li) => {
      const id = li.dataset.id, idx = list.findIndex((i) => i.id === id);
      $("[data-edit]", li).onclick = () => editItem(id);
      $("[data-up]", li).onclick = () => move(S.items, "items", list[idx], list[idx - 1]);
      $("[data-down]", li).onclick = () => move(S.items, "items", list[idx], list[idx + 1]);
      const del = $("[data-del]", li);
      del.onclick = async () => {
        if (!del.classList.contains("sure")) { del.classList.add("sure"); del.textContent = "Точно?"; return setTimeout(() => { del.classList.remove("sure"); del.textContent = "Удалить"; }, 3000); }
        const { error } = await sb.from("items").delete().eq("id", id);
        if (error) return fail(error);
        S.items = S.items.filter((i) => i.id !== id); toast("Удалено"); draw();
      };
    });
  }
  // Поменять местами две строки по порядку
  async function move(arr, table, a, b) {
    if (!a || !b) return;
    const all = arr.some((r, i) => arr.findIndex((y) => y.sort === r.sort) !== i); // есть одинаковые: пронумеруем заново
    if (all) arr.forEach((r, i) => (r.sort = i * 10));
    [a.sort, b.sort] = [b.sort, a.sort];
    arr.sort((x, y) => x.sort - y.sort);
    draw();
    const rows = all ? arr : [a, b];
    const res = await Promise.all(rows.map((r) => sb.from(table).update({ sort: r.sort }).eq("id", r.id)));
    const bad = res.find((r) => r.error);
    if (bad) fail(bad.error);
  }

  function editItem(id) {
    const it = id ? S.items.find((i) => i.id === id) : null;
    S.draft = it ? { ...it, newCol: "" } : { url: "", title: "", shop: "", photo_url: "", comment: "", collection_id: S.filter !== "all" && S.filter !== "none" ? S.filter : (S.cols[0]?.id || null), newCol: S.cols.length ? "" : "Мои находки" };
    openSheet(`<h2>${it ? "Изменить находку" : "Новая находка"}</h2><form id="fi">${itemFields(S.draft)}<button class="btn fill wide">Сохранить</button></form>`);
    bindItem($("#fi"), async () => { if (await saveDraft()) { closeSheet(); draw(); } });
    preview();
  }
  function openSheet(html) {
    $(".sheet-b", sheet).innerHTML = `<button class="x" data-close aria-label="Закрыть">×</button>${html}`;
    sheet.hidden = false; document.body.style.overflow = "hidden";
    sheet.querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => { closeSheet(); preview(); }));
  }
  function closeSheet() { sheet.hidden = true; document.body.style.overflow = ""; S.draft = null; }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !sheet.hidden) { closeSheet(); preview(); } });

  function tabCols() {
    const t = $("#tab");
    t.innerHTML = `<p class="hint" style="margin:0 0 14px">Подборки на вашей странице идут в этом порядке. Если удалить подборку, находки останутся, просто без подборки.</p>
      <ul class="rows cols">${S.cols.map((c, k) => `<li data-id="${c.id}"><input value="${esc(c.title)}" maxlength="40" aria-label="Название подборки">
        <small>${S.items.filter((i) => i.collection_id === c.id).length}</small>
        <div class="ac"><button data-up ${k ? "" : "disabled"} aria-label="Выше">↑</button><button data-down ${k < S.cols.length - 1 ? "" : "disabled"} aria-label="Ниже">↓</button><button class="del" data-del>Удалить</button></div></li>`).join("")}</ul>
      <form class="add-col" id="fc"><input name="t" maxlength="40" placeholder="Новая подборка, например «Уход»" required><button class="btn fill">Добавить</button></form>`;
    t.querySelectorAll(".rows li").forEach((li) => {
      const id = li.dataset.id, k = S.cols.findIndex((c) => c.id === id), c = S.cols[k];
      const inp = $("input", li);
      const save = async () => {
        const v = inp.value.trim();
        if (!v) { inp.value = c.title; return; }
        if (v === c.title) return;
        const { error } = await sb.from("collections").update({ title: v }).eq("id", id);
        if (error) { inp.value = c.title; return fail(error); }
        c.title = v; toast("Сохранено"); preview();
      };
      inp.onblur = save; inp.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); inp.blur(); } };
      $("[data-up]", li).onclick = () => move(S.cols, "collections", c, S.cols[k - 1]);
      $("[data-down]", li).onclick = () => move(S.cols, "collections", c, S.cols[k + 1]);
      const del = $("[data-del]", li);
      del.onclick = async () => {
        if (!del.classList.contains("sure")) { del.classList.add("sure"); del.textContent = "Точно?"; return setTimeout(() => { del.classList.remove("sure"); del.textContent = "Удалить"; }, 3000); }
        const { error } = await sb.from("collections").delete().eq("id", id);
        if (error) return fail(error);
        S.cols = S.cols.filter((x) => x.id !== id); S.items.forEach((i) => { if (i.collection_id === id) i.collection_id = null; });
        if (S.filter === id) S.filter = "all";
        toast("Подборка удалена"); draw();
      };
    });
    $("#fc").onsubmit = async (e) => {
      e.preventDefault();
      const v = e.target.t.value.trim(); if (!v) return;
      const { data, error } = await sb.from("collections").insert({ user_id: S.user.id, title: v, sort: (S.cols.at(-1)?.sort ?? 0) + 10 }).select("id,title,sort").single();
      if (error) return fail(error);
      S.cols.push(data); toast("Подборка добавлена"); draw();
    };
  }

  function tabProfile() {
    const t = $("#tab");
    t.innerHTML = `<form id="fp">${avatarField()}
      <label class="field"><span>Имя</span><input name="name" maxlength="80" required value="${esc(S.p.name)}"></label>
      <label class="field"><span>Пара слов о себе</span><textarea name="bio" maxlength="300">${esc(S.p.bio)}</textarea><small class="cnt"></small></label>
      <label class="field"><span>Адрес страницы</span><input value="tasteby.ru/${esc(S.p.handle)}" disabled><small class="hint">Адрес не меняется, чтобы ссылки у подписчиков всегда работали.</small></label>
      <button class="btn fill wide">Сохранить</button></form>`;
    const f = $("#fp"); bindAvatar(f); counter(f.bio);
    const orig = S.pOrig = S.pOrig || { name: S.p.name, bio: S.p.bio, avatar_url: S.p.avatar_url };
    f.oninput = () => { S.p.name = f.name.value; S.p.bio = f.bio.value; preview(); };
    f.onsubmit = async (e) => {
      e.preventDefault();
      if (!f.name.value.trim()) return toast("Укажите имя", true);
      if (S.avBusy) return toast("Фото ещё загружается, секунду", true);
      const { error } = await sb.from("profiles").update({ name: f.name.value.trim(), bio: f.bio.value.trim(), avatar_url: S.p.avatar_url }).eq("id", S.p.id);
      if (error) { Object.assign(S.p, orig); return fail(error); }
      S.p.name = f.name.value.trim(); S.p.bio = f.bio.value.trim(); S.pOrig = null; toast("Сохранено"); draw();
    };
  }

  load();
})();
