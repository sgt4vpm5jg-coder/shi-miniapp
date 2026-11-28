// ВРЕМЕННЫЙ стенд для проверки кабинета без входа: база в памяти вместо Supabase. Удалить после проверки.
window.LOG = [];
(() => {
  const IMG = "https://sgt4vpm5jg-coder.github.io/shi-miniapp/media/shop26b/";
  const DB = window.DB = {
    profiles: [{ id: "u1", role: "creator", name: "", handle: "maria.test", bio: "", avatar_url: null, published: false, onboarded: false }],
    collections: [], items: [],
  };
  const sortOf = (a, b) => (a.sort ?? 0) - (b.sort ?? 0) || String(a.created_at).localeCompare(String(b.created_at));
  const check = (t, r) => {
    if (t === "items") {
      if (r.title !== undefined && (!r.title || r.title.length > 120)) return "items_title_check";
      if (r.url !== undefined && !/^https?:\/\//i.test(r.url)) return "items_url_check";
      if (r.collection_id && !DB.collections.find((c) => c.id === r.collection_id)) return "collection does not belong to user";
    }
    if (t === "collections" && r.title !== undefined && (!r.title || r.title.length > 40)) return "collections_title_check";
    return null;
  };
  function run(st) {
    const T = DB[st.table], match = (r) => st.f.every(([c, v]) => r[c] === v);
    LOG.push(st.op + " " + st.table + " " + JSON.stringify(st.row || st.f));
    let data = null, error = null;
    if (st.op === "select") { const rows = T.filter(match).sort(sortOf).map((r) => ({ ...r })); data = st.single ? rows[0] || null : rows; }
    if (st.op === "insert") { const e = check(st.table, st.row); if (e) error = { message: e }; else { const r = { id: crypto.randomUUID(), created_at: new Date().toISOString(), sort: 0, ...st.row }; T.push(r); data = { ...r }; } }
    if (st.op === "update") { const e = check(st.table, st.row); if (e) error = { message: e }; else { const rows = T.filter(match); rows.forEach((r) => Object.assign(r, st.row)); data = st.single ? (rows[0] ? { ...rows[0] } : null) : rows; } }
    if (st.op === "delete") { const del = T.filter(match); DB[st.table] = T.filter((r) => !match(r)); if (st.table === "collections") DB.items.forEach((i) => { if (del.find((d) => d.id === i.collection_id)) i.collection_id = null; }); }
    return new Promise((ok) => setTimeout(() => ok({ data, error }), 120));
  }
  const q = (table) => {
    const st = { table, op: "select", row: null, f: [], single: false };
    const b = {
      select: () => b, insert: (r) => ((st.op = "insert"), (st.row = r), b), update: (r) => ((st.op = "update"), (st.row = r), b),
      delete: () => ((st.op = "delete"), b), eq: (c, v) => (st.f.push([c, v]), b), order: () => b,
      maybeSingle: () => ((st.single = true), b), single: () => ((st.single = true), b),
      then: (a, c) => run(st).then(a, c),
    };
    return b;
  };
  const sb = {
    auth: { getSession: async () => ({ data: { session: { user: { id: "u1" }, access_token: "not-a-real-token" } } }) },
    from: q,
    storage: { from: () => ({
      upload: async (path, blob) => { LOG.push("upload " + path + " " + blob.type + " " + blob.size); return { error: null }; },
      getPublicUrl: () => ({ data: { publicUrl: IMG + "anua_pdrn_kpop_set_p1.jpg" } }),
    }) },
  };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  window.TB = { sb, esc, SB_URL: "https://tscsjsenfsnafqyhmovv.supabase.co", SB_KEY: "sb_publishable_GPKiDn8pFgjeomVBOOnWjg_We6GsWIC", init() {}, logout() { LOG.push("logout"); } };
})();
