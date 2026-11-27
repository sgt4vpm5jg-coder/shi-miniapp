// TASTE BY: отрисовка страницы автора (общая для page.html и живого превью в кабинете)
const TBPage = (() => {
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = (u) => (/^https?:\/\//i.test(u || "") ? u : "#");
  const initials = (n) => String(n || "").trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase() || "T";

  // d = { handle, name, bio, avatar_url, collections:[{id,title}], items:[{id,collection_id,title,url,shop,photo_url,comment}] }
  function render(root, d, opt = {}) {
    let col = opt.col || "all";
    const cols = (d.collections || []).filter((c) => (d.items || []).some((i) => i.collection_id === c.id));
    const loose = (d.items || []).some((i) => !i.collection_id || !cols.find((c) => c.id === i.collection_id));
    const addr = "tasteby.ru/" + (d.handle || "");
    root.innerHTML = `
      <section class="d-top">
        ${d.avatar_url ? `<div class="d-av img" style="background-image:url('${esc(d.avatar_url)}')"></div>` : `<div class="d-av">${esc(initials(d.name))}</div>`}
        <small class="d-by">taste by</small>
        <h1>${esc(d.name || "Ваше имя")}</h1>
        ${d.bio ? `<p>${esc(d.bio)}</p>` : ""}
        <button class="d-addr" data-share>${esc(addr)} <span>Поделиться</span></button>
      </section>
      ${cols.length ? `<div class="chips2 d-cols" data-cols></div>` : ""}
      <div class="d-grid" data-grid></div>`;
    const grid = root.querySelector("[data-grid]");
    const chips = root.querySelector("[data-cols]");
    const draw = () => {
      if (chips) {
        const list = [{ id: "all", title: "Все" }, ...cols, ...(loose && cols.length ? [{ id: "none", title: "Другое" }] : [])];
        chips.innerHTML = list.map((c) => `<button class="${c.id === col ? "on" : ""}" data-c="${esc(c.id)}">${esc(c.title)}</button>`).join("");
      }
      const items = (d.items || []).filter((i) => col === "all" || (col === "none" ? (!i.collection_id || !cols.find((c) => c.id === i.collection_id)) : i.collection_id === col));
      grid.innerHTML = items.length ? items.map((x) => `<div class="d-it">
          <a class="ph" href="${esc(safeUrl(x.url))}" target="_blank" rel="noopener nofollow" style="${x.photo_url ? `background-image:url('${esc(x.photo_url)}')` : ""}" aria-label="${esc(x.title)}">${x.photo_url ? "" : `<i>${esc((x.shop || "taste by").slice(0, 18))}</i>`}</a>
          <b>${esc(x.title)}</b><span class="shop">${esc(x.shop)}</span>
          ${x.comment ? `<p class="cm">${esc(x.comment)}</p>` : ""}
          <a class="go" href="${esc(safeUrl(x.url))}" target="_blank" rel="noopener nofollow">На сайт ↗</a></div>`).join("")
        : `<p class="d-empty">${opt.preview ? "Здесь появятся ваши находки" : "Пока здесь пусто"}</p>`;
      if (opt.preview) grid.querySelectorAll("a").forEach((a) => a.addEventListener("click", (e) => e.preventDefault()));
    };
    chips?.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; col = b.dataset.c; draw(); });
    root.querySelector("[data-share]").onclick = async (e) => {
      const s = e.currentTarget.querySelector("span");
      if (opt.preview) { s.textContent = "Это превью"; return setTimeout(() => (s.textContent = "Поделиться"), 1500); }
      const url = opt.shareUrl || location.href;
      try {
        if (navigator.share && matchMedia("(pointer:coarse)").matches) await navigator.share({ title: d.name + " — TASTE by", url });
        else { await navigator.clipboard.writeText(url); s.textContent = "Ссылка скопирована"; }
      } catch { s.textContent = "Скопируйте адрес из строки браузера"; }
      setTimeout(() => (s.textContent = "Поделиться"), 2500);
    };
    draw();
  }
  return { render, esc, initials };
})();
