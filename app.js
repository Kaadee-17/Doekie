// Doekie – fase 1, met films en series. Eén bestand met alle schermen.
(() => {
  "use strict";

  const cfg = window.DOEKIE_CONFIG || {};
  const app = document.getElementById("app");
  const tabbar = document.getElementById("tabbar");
  const sheetRoot = document.getElementById("sheet-root");
  const IMG = "https://image.tmdb.org/t/p/";
  const EXTRA = ["Bioscoop", "Dvd / Blu-ray", "Anders"];
  const COLORS = ["#9B5CF6", "#2CB5A0", "#E5484D", "#3E9BF0", "#F5A524", "#35D47A", "#5B6CFF"];

  if (!cfg.supabaseUrl || cfg.supabaseUrl.includes("JOUW-PROJECT") || !window.supabase) {
    app.innerHTML = `<div class="center"><div class="logo">doekie<span>.</span></div>
      <p class="muted">Vul eerst je Supabase-gegevens in het bestand <b>config.js</b> in.</p></div>`;
    return;
  }

  // Een foutmelding van Google of Supabase in het adres bewaren, voordat we het adres opschonen.
  const urlParams = new URLSearchParams(location.hash.slice(1) + "&" + location.search.slice(1));
  const urlError = urlParams.get("error_description");

  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
  const FN = cfg.supabaseUrl.replace(/\/$/, "") + "/functions/v1/tmdb";
  const S = { session: null, me: null, providers: null, cache: new Map(), routeId: 0, ontdekMine: false, searchT: null, log: null, authMode: inviteParam() ? "signup" : "login", authError: urlError ? "Inloggen lukte niet: " + urlError : null };
  function inviteParam() { return new URLSearchParams(location.search).get("uitnodiging"); }

  // ---------- Hulpjes ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const today = () => new Date().toLocaleDateString("sv-SE");
  const yearOf = (d) => (d || "").slice(0, 4);
  const starText = (r) => { r = Number(r) || 0; return r ? "★".repeat(Math.floor(r)) + (r % 1 ? "½" : "") : ""; };
  const fmtDay = (d) => new Date(d + "T12:00").toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
  const ago = (iso) => {
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 60) return `${Math.max(1, m)} min`;
    if (m < 1440) return `${Math.round(m / 60)} u`;
    const d = Math.round(m / 1440);
    return d === 1 ? "gisteren" : `${d} dagen`;
  };
  const colorFor = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return COLORS[h % COLORS.length]; };
  const avatar = (p, big) => {
    const name = p?.display_name || p?.username || "?";
    return `<span class="avatar${big ? " big" : ""}" style="background:${colorFor(p?.username || name)}">${esc(name[0].toUpperCase())}</span>`;
  };
  const poster = (path, size = "w342") =>
    path ? `<img class="poster-img" src="${IMG}${size}${esc(path)}" alt="" loading="lazy">` : `<div class="poster-ph"></div>`;
  const icon = {
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true" style="stroke-width:2.6"><path d="M12 5v14M5 12h14"/></svg>',
    users: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.9.7 3.1 2.4 3.5 5.2"/></svg>',
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.2-6.5 8-6.5s7 2.5 8 6.5"/></svg>',
    back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    play: '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" fill="#08090C"/></svg>',
    google: '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.5l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.4 13.8a6 6 0 0 1 0-3.6V7.6H3.1a10 10 0 0 0 0 8.8z"/><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.6l3.3 2.6C7.2 7.8 9.4 6 12 6z"/></svg>',
    gear: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>'
  };
  function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 2400);
  }
  function fail(e, msg) { console.error(e); toast(msg || "Er ging iets mis. Probeer het opnieuw."); }

  // ---------- TMDB via de Supabase-functie ----------
  function tmdb(path, params = {}) {
    const q = new URLSearchParams({ path, ...params });
    const key = q.toString();
    if (S.cache.has(key)) return S.cache.get(key);
    const p = fetch(`${FN}?${key}`).then((r) => { if (!r.ok) throw new Error("TMDB " + r.status); return r.json(); });
    S.cache.set(key, p);
    p.catch(() => S.cache.delete(key));
    return p;
  }
  async function nlProviders() {
    if (!S.providers) {
      const [a, b] = await Promise.all([
        tmdb("watch/providers/movie", { watch_region: "NL" }),
        tmdb("watch/providers/tv", { watch_region: "NL" }).catch(() => ({ results: [] }))
      ]);
      const map = new Map();
      for (const p of [...(a.results || []), ...(b.results || [])]) if (!map.has(p.provider_id)) map.set(p.provider_id, p);
      S.providers = [...map.values()].sort((x, y) => (x.display_priorities?.NL ?? 999) - (y.display_priorities?.NL ?? 999));
    }
    return S.providers;
  }
  const myServices = () => S.me?.services || [];

  // Films en series
  const typeOf = (x) => (x?.media_type === "tv" ? "tv" : "movie");
  const titleOf = (m) => m?.title || m?.name || "";
  const dateOf = (m) => m?.release_date || m?.first_air_date || "";
  const linkTo = (type, id) => `#${type === "tv" ? "serie" : "film"}/${id}`;
  const tvTag = (type) => (type === "tv" ? '<span style="display:inline-block;font-family:Inter,sans-serif;font-size:11px;font-weight:700;color:var(--green-light);background:var(--green-soft);padding:1px 7px;border-radius:999px;margin-left:6px;vertical-align:middle">Serie</span>' : "");
  const onlyTitles = (list) => (list || []).filter((m) => m.media_type === "movie" || m.media_type === "tv");

  // ---------- Opstarten en inloggen ----------
  const inviteFromUrl = new URLSearchParams(location.search).get("uitnodiging");
  if (inviteFromUrl) { try { localStorage.setItem("doekie-invite", inviteFromUrl.toLowerCase()); } catch (_) {} }

  sb.auth.onAuthStateChange((event, session) => {
    const prev = S.session?.user?.id;
    S.session = session;
    if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") return;
    if (event === "SIGNED_IN" && S.me && prev === session?.user?.id) return;
    setTimeout(boot, 0);
  });

  async function boot() {
    if (location.hash.includes("access_token") || location.hash.includes("error=")) history.replaceState(null, "", location.pathname);
    if (!S.session) { S.me = null; tabbar.hidden = true; return viewLogin(); }
    if (!S.me || S.me.id !== S.session.user.id) {
      const { data, error } = await sb.from("profiles").select("*").eq("id", S.session.user.id).maybeSingle();
      if (error) return fail(error, "Je profiel kon niet laden.");
      S.me = data;
    }
    if (!S.me) { tabbar.hidden = true; return viewOnboarding(); }
    await acceptInvite();
    route();
  }

  async function acceptInvite() {
    let inv = null;
    try { inv = localStorage.getItem("doekie-invite"); localStorage.removeItem("doekie-invite"); } catch (_) {}
    if (!inv || inv === S.me.username) return;
    const { data: p } = await sb.from("profiles").select("id, username").eq("username", inv).maybeSingle();
    if (!p) return;
    await sb.from("follows").upsert({ follower: S.me.id, followee: p.id }, { onConflict: "follower,followee", ignoreDuplicates: true });
    toast(`Je volgt nu @${p.username}`);
  }

  async function viewLogin() {
    let posters = [];
    try { posters = (await tmdb("trending/movie/week")).results.filter((m) => m.poster_path).slice(0, 8); } catch (_) {}
    const col = (list) => `<div class="wall-col">${list.map((m) => poster(m.poster_path)).join("")}</div>`;
    const signup = S.authMode === "signup";
    app.innerHTML = `
      <div class="login">
        <div class="wall">
          <div class="wall-grid">${col(posters.slice(0, 2))}${col(posters.slice(2, 5))}${col(posters.slice(5, 8))}</div>
          <div class="wall-fade"></div>
        </div>
        <div class="login-body">
          <div class="logo">doekie<span>.</span></div>
          <p class="soft" style="margin:0;font-size:17px">Zie wat je vrienden kijken.<br>Weet meteen waar het staat.</p>
        </div>
        <form class="login-form" id="login-form">
          <div class="seg" role="tablist" aria-label="Inloggen of account maken" style="grid-template-columns:repeat(2,minmax(0,1fr));margin:0 0 6px">
            <button type="button" role="tab" data-act="auth-mode" data-m="login" aria-selected="${!signup}">Inloggen</button>
            <button type="button" role="tab" data-act="auth-mode" data-m="signup" aria-selected="${signup}">Account maken</button>
          </div>
          <label class="label" for="email">E-mailadres</label>
          <input class="input" id="email" type="email" autocomplete="email" placeholder="jij@voorbeeld.nl" value="${esc(S.lastEmail || "")}" required>
          <label class="label" for="password">Wachtwoord</label>
          <input class="input" id="password" type="password" autocomplete="${signup ? "new-password" : "current-password"}" minlength="8" placeholder="${signup ? "Minstens 8 tekens" : "Je wachtwoord"}" required>
          <button class="btn primary block" id="login-btn" type="submit">${signup ? "Account maken" : "Inloggen"}</button>
          ${cfg.google ? `<button class="btn block" type="button" data-act="google">${icon.google} Doorgaan met Google</button>` : ""}
          <p class="muted" style="margin:2px 0 0;text-align:center;font-size:12px">Gratis · Je ziet meteen wat je vrienden kijken</p>
        </form>
      </div>`;
    if (S.authError) { toast(S.authError); S.authError = null; }
  }

  function authMessage(err) {
    const code = err?.code || "", msg = (err?.message || "").toLowerCase();
    if (err?.status === 429 || code.includes("rate_limit")) return "Even te veel pogingen. Probeer het over een paar minuten.";
    if (code === "invalid_credentials" || msg.includes("invalid login")) return "E-mailadres of wachtwoord klopt niet.";
    if (code === "user_already_exists" || msg.includes("already registered")) return "Dit e-mailadres heeft al een account. Kies Inloggen.";
    if (code === "weak_password" || msg.includes("password should")) return "Kies een langer of sterker wachtwoord.";
    if (code === "email_not_confirmed" || msg.includes("not confirmed")) return "Je e-mailadres is nog niet bevestigd.";
    if (msg.includes("provider is not enabled")) return "Inloggen met Google is nog niet ingesteld.";
    return "Dat lukte niet. Probeer het opnieuw.";
  }

  function viewOnboarding() {
    app.innerHTML = `
      <div class="center" style="align-items:stretch;text-align:left">
        <div class="logo" style="font-size:48px">doekie<span>.</span></div>
        <h1 class="h1">Kies je gebruikersnaam</h1>
        <p class="muted" style="margin:0">Hiermee vinden je vrienden je. 3 tot 20 tekens: kleine letters, cijfers en _.</p>
        <form id="onboard-form" class="stack">
          <label class="label" for="username">Gebruikersnaam</label>
          <input class="input" id="username" required pattern="[a-z0-9_]{3,20}" autocapitalize="off" autocomplete="off" placeholder="bijv. filmfan_kim">
          <label class="label" for="displayname">Naam (mag je weglaten)</label>
          <input class="input" id="displayname" maxlength="40" placeholder="Kim">
          <button class="btn primary block" type="submit">Verder</button>
        </form>
      </div>`;
  }

  // ---------- Router ----------
  function renderTabbar(active) {
    const tab = (href, name, label, ic) => `<a href="#${href}" ${active === name ? 'aria-current="page"' : ""}>${ic}${label}</a>`;
    tabbar.innerHTML =
      tab("feed", "feed", "Feed", icon.home) +
      tab("ontdek", "ontdek", "Ontdek", icon.search) +
      `<a href="#ontdek" class="plus" aria-label="Film loggen" data-act="focus-search">${icon.plus}</a>` +
      tab("vrienden", "vrienden", "Vrienden", icon.users) +
      tab("profiel", "profiel", "Profiel", icon.user);
    tabbar.hidden = false;
  }

  async function route() {
    const id = ++S.routeId;
    const [name, arg] = (location.hash.slice(1) || "feed").split("/");
    renderTabbar(name === "u" ? "" : name);
    app.innerHTML = `<div class="loading">Laden…</div>`;
    window.scrollTo(0, 0);
    const views = {
      feed: viewFeed, ontdek: viewOntdek, vrienden: viewFriends, instellingen: viewSettings,
      film: () => viewFilm(arg, "movie"), serie: () => viewFilm(arg, "tv"), persoon: () => viewPerson(arg), profiel: () => viewProfile(S.me.username), u: () => viewProfile(decodeURIComponent(arg || ""))
    };
    try {
      const html = await (views[name] || viewFeed)();
      if (id !== S.routeId) return;
      app.innerHTML = html;
      if (name === "ontdek") runSearch();
      if (name === "serie") loadSeason(S.season);
      if (S.focusSearch) { S.focusSearch = false; document.getElementById("zoek")?.focus(); }
    } catch (e) {
      if (id !== S.routeId) return;
      console.error(e);
      app.innerHTML = `<div class="center"><h1 class="h2">Dit lukte niet</h1><p class="muted">Controleer je internet en probeer het opnieuw.</p><button class="btn" data-act="retry">Opnieuw</button></div>`;
    }
  }
  window.addEventListener("hashchange", () => { if (S.session && S.me) route(); });

  // ---------- Feed ----------
  async function followingIds() {
    const { data } = await sb.from("follows").select("followee").eq("follower", S.me.id);
    return (data || []).map((f) => f.followee);
  }
  function logCard(l) {
    const p = l.profiles || {};
    return `<article class="card">
      <div class="card-head">${avatar(p)}<a href="#u/${esc(p.username)}"><b>${esc(p.display_name || p.username)}</b> keek</a><span class="when">${ago(l.created_at)}</span></div>
      <a class="card-body" href="${linkTo(typeOf(l), l.tmdb_id)}">
        <div class="thumb">${poster(l.poster_path, "w185")}</div>
        <div class="info">
          <div class="card-title">${esc(l.title)} <span class="y">${esc(l.year || "")}</span>${tvTag(typeOf(l))}</div>
          <div class="row" style="gap:8px"><span class="stars">${starText(l.rating)}</span>${l.liked ? '<span class="heart" aria-label="favoriet">♥</span>' : ""}${l.rewatch ? '<span class="muted" style="font-size:12px">herkijk</span>' : ""}</div>
          ${l.service ? `<span class="chip" style="height:26px;align-self:flex-start;font-size:12px">${esc(l.service)}</span>` : ""}
          ${l.review ? `<p class="review">${esc(l.review)}</p>` : ""}
        </div>
      </a>
    </article>`;
  }
  async function viewFeed() {
    const ids = [S.me.id, ...(await followingIds())];
    const { data, error } = await sb.from("logs").select("*, profiles(username, display_name)").in("user_id", ids).order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    const head = `<div class="row" style="justify-content:space-between;margin-bottom:16px"><div class="logo" style="font-size:34px">doekie<span>.</span></div><a class="btn small" href="#vrienden">Uitnodigen</a></div>`;
    if (!data.length) {
      return head + `<div class="empty"><h2 class="h2">Je feed is nog leeg</h2><p class="muted" style="margin:0">Log je eerste film of serie, of nodig vrienden uit. Dan zie je hier wat jullie kijken.</p>
        <div class="row wrap" style="justify-content:center"><a class="btn accent" href="#ontdek">Zoeken</a><a class="btn" href="#vrienden">Vrienden uitnodigen</a></div></div>`;
    }
    return head + `<div class="stack">${data.map(logCard).join("")}</div>`;
  }

  // ---------- Ontdekken ----------
  async function viewOntdek() {
    const hasMine = myServices().length > 0;
    return `<h1 class="h1">Ontdek</h1>
      <div class="stack" style="margin-top:14px">
        <input class="input" id="zoek" type="search" placeholder="Zoek een film of serie" aria-label="Zoek een film of serie" autocomplete="off">
        <div class="chips">
          <button class="chip" data-act="ontdek-all" aria-pressed="${!S.ontdekMine}">Populair</button>
          ${hasMine ? `<button class="chip" data-act="ontdek-mine" aria-pressed="${S.ontdekMine}">Op mijn diensten</button>` : `<a class="chip" href="#instellingen">Kies je diensten</a>`}
        </div>
      </div>
      <div id="people-results"></div>
      <div class="section"><div class="section-head"><h2 class="h2" id="results-title">Populair deze week</h2></div><div class="grid" id="results"><div class="muted">Laden…</div></div></div>`;
  }

  // Slim zoeken: probeer ook zonder spaties ("jack ass" → "jackass") en zonder streepjes,
  // en neem de bekendste titels van gevonden personen mee ("steve-o" → Jackass).
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
  async function smartSearch(q) {
    const variants = [...new Set([q, q.replace(/\s+/g, ""), q.replace(/[-–.]/g, " ").replace(/\s+/g, " ").trim()])].filter((v) => v.length >= 2);
    const pages = await Promise.all(variants.map((v) => tmdb("search/multi", { query: v, include_adult: "false" }).catch(() => ({ results: [] }))));
    const seen = new Map();
    const people = [];
    const nq = norm(q);
    for (const page of pages) {
      for (const r of page.results || []) {
        if (r.media_type === "person") { if (!people.some((p) => p.id === r.id)) people.push(r); continue; }
        if (r.media_type !== "movie" && r.media_type !== "tv") continue;
        const key = r.media_type + r.id;
        const t = norm(titleOf(r)), o = norm(r.original_title || r.original_name);
        const match = t.includes(nq) || o.includes(nq) || nq.includes(t) ? 1000 : 0;
        const score = match + (r.popularity || 0);
        if (!seen.has(key) || seen.get(key).score < score) seen.set(key, { ...r, score });
      }
    }
    people.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    for (const p of people.slice(0, 2)) {
      for (const k of p.known_for || []) {
        if (k.media_type !== "movie" && k.media_type !== "tv") continue;
        const key = k.media_type + k.id;
        if (!seen.has(key)) seen.set(key, { ...k, score: 500 + (k.popularity || 0) });
      }
    }
    return { titles: [...seen.values()].sort((a, b) => b.score - a.score), people: people.slice(0, 6) };
  }
  function renderPeople(people) {
    const box = document.getElementById("people-results"); if (!box) return;
    box.innerHTML = people.length ? `<div class="section"><div class="label" style="margin-bottom:8px">Personen</div><div class="chips">${people.map((p) => `
      <a class="chip" style="height:44px;padding:0 14px 0 4px" href="#persoon/${p.id}">
        ${p.profile_path ? `<img src="${IMG}w185${esc(p.profile_path)}" alt="" style="width:36px;height:36px;border-radius:50%;object-fit:cover">` : `<span class="avatar" style="width:36px;height:36px;background:${colorFor(p.name)}">${esc(p.name[0])}</span>`}
        <span style="display:flex;flex-direction:column;line-height:1.15"><span style="color:var(--ink)">${esc(p.name)}</span><span style="font-size:11px;font-weight:500;color:var(--muted)">${p.known_for_department === "Acting" ? "Acteur" : p.known_for_department === "Directing" ? "Regisseur" : esc(p.known_for_department || "")}</span></span>
      </a>`).join("")}</div></div>` : "";
  }

  // ---------- Personen ----------
  async function viewPerson(id) {
    const p = await tmdb(`person/${Number(id)}`, { append_to_response: "combined_credits" });
    const seen = new Set();
    const credits = [...(p.combined_credits?.cast || []), ...(p.combined_credits?.crew || [])]
      .filter((c) => (c.media_type === "movie" || c.media_type === "tv") && c.poster_path && !seen.has(c.media_type + c.id) && seen.add(c.media_type + c.id))
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 60);
    return `<div class="row" style="gap:8px;margin-bottom:16px"><button class="x" data-act="back" aria-label="Terug">${icon.back}</button></div>
      <div class="profile-head">
        ${p.profile_path ? `<img src="${IMG}w185${esc(p.profile_path)}" alt="" style="width:84px;height:84px;border-radius:50%;object-fit:cover;flex:none">` : avatar({ username: p.name, display_name: p.name }, true)}
        <div style="min-width:0"><h1 class="h1" style="font-size:26px">${esc(p.name)}</h1><div class="muted">${p.known_for_department === "Acting" ? "Acteur" : esc(p.known_for_department || "")}${p.birthday ? " · geboren " + esc(p.birthday.slice(0, 4)) : ""}</div></div>
      </div>
      ${p.biography ? `<p class="overview" style="display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden">${esc(p.biography)}</p>` : ""}
      <div class="section"><div class="section-head"><h2 class="h2">Films en series</h2><span class="muted" style="font-size:13px">${credits.length}</span></div>
        <div class="grid">${credits.map((m) => `<a class="tile" href="${linkTo(typeOf(m), m.id)}">${poster(m.poster_path)}<span class="t">${esc(titleOf(m))}</span><span class="y">${yearOf(dateOf(m))}${m.media_type === "tv" ? " · Serie" : ""}</span></a>`).join("") || '<p class="muted">Geen titels gevonden.</p>'}</div></div>`;
  }
  async function runSearch() {
    const box = document.getElementById("results"); if (!box) return;
    const title = document.getElementById("results-title");
    const q = (document.getElementById("zoek")?.value || "").trim();
    let list, label, people = [];
    try {
      if (q) { const r = await smartSearch(q); list = r.titles; people = r.people; label = `Resultaten voor “${q}”`; }
      else if (S.ontdekMine && myServices().length) {
        const p = { watch_region: "NL", with_watch_providers: myServices().join("|"), with_watch_monetization_types: "flatrate", sort_by: "popularity.desc" };
        const [mv, tv] = await Promise.all([tmdb("discover/movie", p), tmdb("discover/tv", p).catch(() => ({ results: [] }))]);
        list = [...mv.results.map((m) => ({ ...m, media_type: "movie" })), ...tv.results.map((m) => ({ ...m, media_type: "tv" }))].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        label = "Nu op jouw diensten";
      } else { list = onlyTitles((await tmdb("trending/all/week")).results); label = "Populair deze week"; }
    } catch (e) { box.innerHTML = `<p class="muted">Laden lukte niet. Probeer het opnieuw.</p>`; return; }
    if (q !== (document.getElementById("zoek")?.value || "").trim()) return;
    renderPeople(people);
    title.textContent = label;
    box.innerHTML = list.length
      ? list.slice(0, 30).map((m) => `<a class="tile" href="${linkTo(typeOf(m), m.id)}">${poster(m.poster_path)}<span class="t">${esc(titleOf(m))}</span><span class="y">${yearOf(dateOf(m))}${m.media_type === "tv" ? " · Serie" : ""}</span></a>`).join("")
      : `<p class="muted">Niets gevonden.</p>`;
  }

  // ---------- Filmpagina ----------
  async function viewFilm(id, type) {
    id = Number(id);
    const [m, wl, friends, myLogs, episodeProgress] = await Promise.all([
      tmdb(`${type}/${id}`, { append_to_response: "videos,credits,watch/providers", include_video_language: "nl,en" }),
      sb.from("watchlist").select("tmdb_id").eq("user_id", S.me.id).eq("media_type", type).eq("tmdb_id", id).maybeSingle(),
      followingIds().then((ids) => sb.from("logs").select("*, profiles(username, display_name)").eq("media_type", type).eq("tmdb_id", id).in("user_id", [S.me.id, ...ids]).order("created_at", { ascending: false }).limit(20)),
      sb.from("logs").select("*").eq("user_id", S.me.id).eq("media_type", type).eq("tmdb_id", id).order("watched_on", { ascending: false }).order("created_at", { ascending: false }).limit(1),
      type === "tv" ? sb.from("episode_progress").select("season_number, episode_number, watched_at").eq("user_id", S.me.id).eq("tmdb_id", id) : Promise.resolve({ data: [], error: null })
    ]);
    m.media_type = type;
    S.film = m;
    const isTv = type === "tv";
    const director = isTv
      ? (m.created_by || []).slice(0, 2).map((c) => c.name).join(" & ")
      : (m.credits?.crew || []).find((c) => c.job === "Director")?.name;
    const what = isTv ? "serie" : "film";
    const lengthText = isTv
      ? (m.number_of_seasons ? `${m.number_of_seasons} ${m.number_of_seasons === 1 ? "seizoen" : "seizoenen"} · ` : "")
      : (m.runtime ? m.runtime + " min · " : "");
    const vids = (m.videos?.results || []).filter((v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"));
    const trailer = vids.find((v) => v.iso_639_1 === "nl") || vids.find((v) => v.type === "Trailer") || vids[0];
    const nl = m["watch/providers"]?.results?.NL || {};
    const mine = new Set(myServices());
    const provRow = (p, kind) => `<div class="provider${mine.has(p.provider_id) ? " mine" : ""}">
        <img src="${IMG}w92${esc(p.logo_path)}" alt="">
        <div class="n"><div style="font-weight:600">${esc(p.provider_name)}</div><div class="k">${kind}</div></div>
        ${mine.has(p.provider_id) ? '<span class="badge">Jouw dienst</span>' : ""}
      </div>`;
    const seen = new Set();
    const provs = [];
    for (const [k, kind] of [["flatrate", "In het abonnement"], ["free", "Gratis"], ["ads", "Gratis met reclame"], ["rent", "Huren"], ["buy", "Kopen"]]) {
      for (const p of nl[k] || []) { if (!seen.has(p.provider_id)) { seen.add(p.provider_id); provs.push(provRow(p, kind)); } }
    }
    const fl = friends.data || [];
    const rated = fl.filter((l) => l.rating);
    const avg = rated.length ? (rated.reduce((s, l) => s + Number(l.rating), 0) / rated.length).toFixed(1).replace(".", ",") : null;
    S.filmTrailer = trailer?.key || null;
    S.filmInList = !!wl.data;
    S.filmSeen = !!myLogs.data?.length;
    S.filmLog = myLogs.data?.[0] || null;
    S.filmLiked = !!S.filmLog?.liked;
    S.episodeProgress = new Set((episodeProgress.data || []).map((e) => `${e.season_number}:${e.episode_number}`));
    S.episodeProgressUnavailable = !!episodeProgress.error;
    return `
      <div class="hero" style="background-image:${m.backdrop_path ? `url('${IMG}w780${esc(m.backdrop_path)}')` : "none"}">
        <button class="back" data-act="back" aria-label="Terug">${icon.back}</button>
        ${trailer ? `<button class="play" data-act="trailer"><span>${icon.play}</span>Bekijk trailer</button>` : ""}
      </div>
      <div class="film-head">
        <div class="p">${poster(m.poster_path)}</div>
        <div class="stack" style="gap:4px;min-width:0">
          <h1 class="h1" style="font-size:28px;line-height:1.05">${esc(titleOf(m))}${tvTag(type)}</h1>
          <span class="soft">${yearOf(dateOf(m))}${director ? " · " + esc(director) : ""}</span>
          <span class="muted" style="font-size:13px">${lengthText}${esc((m.genres || []).slice(0, 2).map((g) => g.name).join(", "))}</span>
        </div>
      </div>
      <div class="row film-actions" style="margin-top:18px">
        <button class="btn accent" style="flex:1" data-act="seen" aria-pressed="${S.filmSeen}">${S.filmSeen ? "✓ Gezien" : "○ Gezien"}</button>
        <button class="btn favorite" style="flex:1" data-act="favorite" aria-pressed="${S.filmLiked}">${S.filmLiked ? "♥ Favoriet" : "♡ Favoriet"}</button>
        <button class="btn" style="flex:1" data-act="log">+ Recensie</button>
        <button class="btn" style="flex:1" data-act="watchlist" aria-pressed="${S.filmInList}">${S.filmInList ? "✓ Op kijklijst" : "+ Kijklijst"}</button>
      </div>
      ${m.overview ? `<p class="overview">${esc(m.overview)}</p>` : ""}
      ${isTv ? seasonsSection(m) : ""}
      <div class="section">
        <div class="section-head"><h2 class="h2">Waar te zien in Nederland</h2><span class="source">Bron: JustWatch</span></div>
        <div class="stack" style="gap:8px">${provs.length ? provs.join("") : `<p class="muted" style="margin:0">Deze ${what} staat nu niet bij een Nederlandse dienst.</p>`}</div>
      </div>
      <div class="section">
        <div class="section-head"><h2 class="h2">Jij en je vrienden</h2>${avg ? `<span class="stars">★ ${avg}</span>` : ""}</div>
        ${fl.length ? `<div class="stack">${fl.map((l) => `<div class="row" style="align-items:flex-start">${avatar(l.profiles)}<div><div><b>${esc(l.profiles?.display_name || l.profiles?.username)}</b> <span class="stars">${starText(l.rating)}</span>${l.liked ? ' <span class="heart">♥</span>' : ""}</div>${l.review ? `<div class="soft" style="font-size:14px">${esc(l.review)}</div>` : ""}</div></div>`).join("")}</div>`
          : `<p class="muted" style="margin:0">Nog niemand die je volgt heeft deze ${what} gelogd.</p>`}
      </div>`;
  }

  // ---------- Seizoenen en afleveringen ----------
  function seasonsSection(m) {
    const all = (m.seasons || []).filter((s) => s.episode_count > 0);
    if (!all.length) return "";
    const regular = all.filter((s) => s.season_number > 0);
    const specials = all.filter((s) => s.season_number === 0);
    const list = [...regular, ...specials];
    if (S.seasonFor !== m.id) { S.seasonFor = m.id; S.season = null; }
    if (!list.some((s) => s.season_number === S.season)) S.season = (regular[0] || list[0]).season_number;
    const label = (s) => `${s.season_number === 0 ? "Specials" : `Seizoen ${s.season_number}`} · ${seasonWatchedCount(s)}/${s.episode_count}`;
    return `<div class="section">
      <div class="section-head season-head"><div><h2 class="h2">Afleveringen</h2><span class="muted" style="font-size:13px">${regular.length} ${regular.length === 1 ? "seizoen" : "seizoenen"}</span></div><button type="button" class="btn small" data-act="season-all" data-n="${S.season}" ${S.episodeProgressUnavailable ? "disabled" : ""}>${seasonWatchedCount(list.find((s) => s.season_number === S.season)) === (list.find((s) => s.season_number === S.season)?.episode_count || 0) ? "Vinkjes wissen" : "Seizoen afvinken"}</button></div>
      <div class="chips" role="group" aria-label="Kies een seizoen">${list.map((s) => `<button type="button" class="chip" data-act="season" data-n="${s.season_number}" aria-pressed="${s.season_number === S.season}">${label(s)}</button>`).join("")}</div>
      <div id="progress-summary" class="progress-summary">${S.episodeProgressUnavailable ? "Afleveringsvoortgang laden lukte niet. Controleer of de database is bijgewerkt." : episodeProgressSummary(m)}</div>
      <div id="episodes" class="stack" style="margin-top:12px;gap:8px"><p class="muted">Laden…</p></div>
    </div>`;
  }
  function seasonWatchedCount(s) {
    if (!s || !S.episodeProgress) return 0;
    let count = 0;
    for (let i = 1; i <= s.episode_count; i++) if (S.episodeProgress.has(`${s.season_number}:${i}`)) count++;
    return count;
  }
  function episodeProgressSummary(m) {
    const seasons = (m.seasons || []).filter((s) => s.episode_count > 0).sort((a, b) => (a.season_number === 0 ? 1 : a.season_number) - (b.season_number === 0 ? 1 : b.season_number));
    const total = seasons.reduce((n, s) => n + s.episode_count, 0);
    const watched = S.episodeProgress?.size || 0;
    let next = null;
    for (const s of seasons) {
      for (let n = 1; n <= s.episode_count; n++) {
        if (!S.episodeProgress?.has(`${s.season_number}:${n}`)) { next = { season: s.season_number, episode: n }; break; }
      }
      if (next) break;
    }
    const where = next ? `Volgende: ${next.season === 0 ? "special" : `seizoen ${next.season}`}, aflevering ${next.episode}` : "Alle bekende afleveringen afgevinkt";
    return `${watched} van ${total} afleveringen gezien${watched ? ` · ${where}` : " · Nog niet begonnen"}`;
  }
  function updateEpisodeProgressUI() {
    const m = S.film;
    const summary = document.getElementById("progress-summary");
    if (!m || !summary) return;
    summary.textContent = episodeProgressSummary(m);
    document.querySelectorAll("[data-act=season]").forEach((btn) => {
      const season = (m.seasons || []).find((s) => s.season_number === Number(btn.dataset.n));
      if (!season) return;
      const count = seasonWatchedCount(season);
      btn.textContent = `${season.season_number === 0 ? "Specials" : `Seizoen ${season.season_number}`} · ${count}/${season.episode_count}`;
    });
    const seasonButton = document.querySelector('[data-act="season-all"]');
    const current = (m.seasons || []).find((s) => s.season_number === Number(seasonButton?.dataset.n));
    if (seasonButton && current) seasonButton.textContent = seasonWatchedCount(current) === current.episode_count ? "Vinkjes wissen" : "Seizoen afvinken";
    document.querySelectorAll(".episode-toggle").forEach((btn) => {
      const watched = S.episodeProgress.has(`${btn.dataset.season}:${btn.dataset.episode}`);
      btn.setAttribute("aria-pressed", String(watched));
      btn.textContent = watched ? "✓ Gezien" : "+ Gezien";
      btn.setAttribute("aria-label", `${watched ? "Markeer niet gezien" : "Markeer als gezien"}: aflevering ${btn.dataset.episode}`);
    });
  }
  async function toggleSeason(btn) {
    const m = S.film;
    const seasonNumber = Number(btn.dataset.n);
    const season = (m?.seasons || []).find((s) => s.season_number === seasonNumber);
    if (!m || !season || S.episodeProgressUnavailable) return;
    const complete = seasonWatchedCount(season) === season.episode_count;
    btn.disabled = true;
    const query = complete
      ? sb.from("episode_progress").delete().eq("user_id", S.me.id).eq("tmdb_id", m.id).eq("season_number", seasonNumber)
      : sb.from("episode_progress").upsert(Array.from({ length: season.episode_count }, (_, i) => ({ user_id: S.me.id, tmdb_id: m.id, season_number: seasonNumber, episode_number: i + 1, series_title: titleOf(m), poster_path: m.poster_path, watched_at: new Date().toISOString() })), { onConflict: "user_id,tmdb_id,season_number,episode_number" });
    const { error } = await query;
    btn.disabled = false;
    if (error) return fail(error, "Seizoensvoortgang opslaan lukte niet.");
    for (let i = 1; i <= season.episode_count; i++) {
      const key = `${seasonNumber}:${i}`;
      if (complete) S.episodeProgress.delete(key); else S.episodeProgress.add(key);
    }
    updateEpisodeProgressUI();
    toast(complete ? "Seizoensvinkjes gewist" : "Seizoen als gezien opgeslagen");
  }
  async function toggleEpisode(btn) {
    const m = S.film;
    if (!m || S.episodeProgressUnavailable) return;
    const season = Number(btn.dataset.season), episode = Number(btn.dataset.episode);
    const key = `${season}:${episode}`;
    const wasWatched = S.episodeProgress.has(key);
    btn.disabled = true;
    const query = wasWatched
      ? sb.from("episode_progress").delete().eq("user_id", S.me.id).eq("tmdb_id", m.id).eq("season_number", season).eq("episode_number", episode)
      : sb.from("episode_progress").upsert({ user_id: S.me.id, tmdb_id: m.id, season_number: season, episode_number: episode, series_title: titleOf(m), poster_path: m.poster_path, watched_at: new Date().toISOString() }, { onConflict: "user_id,tmdb_id,season_number,episode_number" });
    const { error } = await query;
    btn.disabled = false;
    if (error) return fail(error, "Afleveringsvoortgang opslaan lukte niet.");
    if (wasWatched) S.episodeProgress.delete(key); else S.episodeProgress.add(key);
    const isWatched = !wasWatched;
    btn.setAttribute("aria-pressed", String(isWatched));
    btn.setAttribute("aria-label", `${isWatched ? "Markeer niet gezien" : "Markeer als gezien"}: aflevering ${episode}`);
    btn.textContent = isWatched ? "✓ Gezien" : "+ Gezien";
    updateEpisodeProgressUI();
    toast(isWatched ? "Aflevering als gezien opgeslagen" : "Aflevering uit voortgang gehaald");
  }
  async function loadSeason(n) {
    const box = document.getElementById("episodes"); const m = S.film;
    if (!box || !m || m.media_type !== "tv" || n == null) return;
    box.innerHTML = `<p class="muted">Laden…</p>`;
    let s;
    try { s = await tmdb(`tv/${m.id}/season/${n}`); } catch (_) { box.innerHTML = `<p class="muted">Afleveringen laden lukte niet. Probeer het opnieuw.</p>`; return; }
    if (S.season !== n || document.getElementById("episodes") !== box) return;
    const eps = s.episodes || [];
    if (!eps.length) { box.innerHTML = `<p class="muted">Nog geen afleveringen bekend.</p>`; return; }
    const fmt = (d) => (d ? new Date(d + "T12:00").toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" }) : "");
    const intro = s.overview ? `<p class="soft" style="margin:0 0 4px;font-size:14px">${esc(s.overview)}</p>` : "";
    box.innerHTML = intro + eps.map((e) => {
      const isWatched = S.episodeProgress.has(`${n}:${e.episode_number}`);
      return `<div class="episode-row">
        <button type="button" class="episode-info" data-act="episode" aria-expanded="false">
        <div class="episode-still">${e.still_path ? `<img src="${IMG}w300${esc(e.still_path)}" alt="" loading="lazy">` : ""}</div>
        <div style="min-width:0;flex:1;display:flex;flex-direction:column;gap:3px">
          <span style="font-size:12px;color:var(--muted)">Aflevering ${e.episode_number}${e.runtime ? " · " + e.runtime + " min" : ""}</span>
          <span style="font-weight:600;line-height:1.25">${esc(e.name || "Aflevering " + e.episode_number)}</span>
          <span style="font-size:12px;color:var(--muted)">${fmt(e.air_date)}</span>
          ${e.overview ? `<span class="ep-more" hidden style="font-size:13px;color:var(--soft);margin-top:4px">${esc(e.overview)}</span>` : ""}
        </div>
        </button>
        <button type="button" class="chip episode-toggle" data-act="toggle-episode" data-season="${n}" data-episode="${e.episode_number}" data-name="${esc(e.name || "Aflevering " + e.episode_number)}" aria-pressed="${isWatched}" aria-label="${isWatched ? "Markeer niet gezien" : "Markeer als gezien"}: aflevering ${e.episode_number}" ${S.episodeProgressUnavailable ? "disabled" : ""}>${isWatched ? "✓ Gezien" : "+ Gezien"}</button>
      </div>`;
    }).join("");
  }

  function openSheet(html) {
    sheetRoot.innerHTML = `<div class="sheet-bg" data-act="sheet-bg"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;
    document.body.style.overflow = "hidden";
  }
  function closeSheet() { sheetRoot.innerHTML = ""; document.body.style.overflow = ""; }

  function openTrailer() {
    if (!S.filmTrailer) return;
    openSheet(`<div class="sheet-head"><h2 class="h2">Trailer</h2><button class="x" data-act="close" aria-label="Sluiten">${icon.x}</button></div>
      <div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(S.filmTrailer)}?autoplay=1&playsinline=1" title="Trailer" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`);
  }

  async function openLog() {
    const m = S.film; if (!m) return;
    const nl = m["watch/providers"]?.results?.NL || {};
    const names = new Set();
    for (const k of ["flatrate", "free", "ads", "rent", "buy"]) for (const p of nl[k] || []) names.add(p.provider_name);
    try { const all = await nlProviders(); for (const p of all) if (myServices().includes(p.provider_id)) names.add(p.provider_name); } catch (_) {}
    for (const e of EXTRA) names.add(e);
    S.log = { rating: 0, liked: false, rewatch: false, service: [...names][0] || null, services: [...names] };
    renderLogSheet();
  }
  function renderLogSheet() {
    const L = S.log, m = S.film;
    const starBtns = [1, 2, 3, 4, 5].map((n) => {
      const cls = L.rating >= n ? "on" : L.rating >= n - 0.5 ? "half" : "";
      return `<button type="button" class="${cls}" data-act="star" data-n="${n}" aria-label="${n} ${n === 1 ? "ster" : "sterren"}">★</button>`;
    }).join("");
    const prev = { date: document.getElementById("log-date")?.value, review: document.getElementById("log-review")?.value };
    openSheet(`
      <div class="sheet-head"><div><div class="label">${m.media_type === "tv" ? "Serie" : "Film"} loggen</div><h2 class="h2">${esc(titleOf(m))} <span class="muted" style="font-weight:400;font-size:14px">${yearOf(dateOf(m))}</span></h2></div><button class="x" data-act="close" aria-label="Sluiten">${icon.x}</button></div>
      <div class="stack" style="align-items:center;gap:6px"><div class="star-input" role="group" aria-label="Beoordeling">${starBtns}</div>
        <span class="muted" style="font-size:13px">${L.rating ? String(L.rating).replace(".", ",") + " van 5 · tik nog eens voor een halve ster" : "Tik om sterren te geven"}</span></div>
      <div class="toggles">
        <button type="button" data-act="toggle-liked" aria-pressed="${L.liked}">♥ Favoriet</button>
        <button type="button" data-act="toggle-rewatch" aria-pressed="${L.rewatch}">↻ Herkijk</button>
      </div>
      <div class="stack" style="gap:8px"><span class="label">Gekeken op</span>
        <div class="row wrap" style="gap:8px">${L.services.map((s) => `<button type="button" class="chip" data-act="service" data-s="${esc(s)}" aria-pressed="${L.service === s}">${esc(s)}</button>`).join("")}</div></div>
      <label class="stack" style="gap:6px"><span class="label">Datum</span><input class="input" id="log-date" type="date" value="${esc(prev.date || today())}" max="${today()}"></label>
      <label class="stack" style="gap:6px"><span class="label">Recensie</span><textarea class="input" id="log-review" maxlength="2000" placeholder="Wat vond je ervan?">${esc(prev.review || "")}</textarea></label>
      <button class="btn primary block" data-act="save-log">Opslaan en delen</button>`);
  }
  async function saveLog(btn) {
    const L = S.log, m = S.film;
    btn.disabled = true;
    const row = {
      user_id: S.me.id, media_type: m.media_type, tmdb_id: m.id, title: titleOf(m), year: Number(yearOf(dateOf(m))) || null, poster_path: m.poster_path,
      watched_on: document.getElementById("log-date").value || today(), rating: L.rating || null, liked: L.liked, rewatch: L.rewatch,
      review: document.getElementById("log-review").value.trim() || null, service: L.service
    };
    const { error } = await sb.from("logs").insert(row);
    if (error) { btn.disabled = false; return fail(error, "Opslaan lukte niet."); }
    await sb.from("watchlist").delete().eq("user_id", S.me.id).eq("media_type", m.media_type).eq("tmdb_id", m.id);
    closeSheet(); toast("Opgeslagen in je dagboek");
    location.hash = "feed";
  }
  async function toggleWatchlist(btn) {
    const m = S.film; btn.disabled = true;
    const q = S.filmInList
      ? sb.from("watchlist").delete().eq("user_id", S.me.id).eq("media_type", m.media_type).eq("tmdb_id", m.id)
      : sb.from("watchlist").insert({ user_id: S.me.id, media_type: m.media_type, tmdb_id: m.id, title: titleOf(m), year: Number(yearOf(dateOf(m))) || null, poster_path: m.poster_path });
    const { error } = await q;
    btn.disabled = false;
    if (error) return fail(error);
    S.filmInList = !S.filmInList;
    btn.setAttribute("aria-pressed", S.filmInList);
    btn.textContent = S.filmInList ? "✓ Op kijklijst" : "+ Kijklijst";
    toast(S.filmInList ? "Op je kijklijst gezet" : "Van je kijklijst gehaald");
  }

  async function markSeen(btn) {
    const m = S.film;
    if (!m) return;
    btn.disabled = true;
    const { data, error } = await sb.from("logs").select("id").eq("user_id", S.me.id).eq("media_type", m.media_type).eq("tmdb_id", m.id).limit(1);
    if (error) { btn.disabled = false; return fail(error, "Bekeken status laden lukte niet."); }
    if (data?.length) {
      btn.disabled = false;
      S.filmSeen = true;
      btn.setAttribute("aria-pressed", "true");
      btn.textContent = "✓ Gezien";
      return toast("Deze titel staat al als gezien");
    }
    const { data: newLog, error: insertError } = await sb.from("logs").insert({ user_id: S.me.id, media_type: m.media_type, tmdb_id: m.id, title: titleOf(m), year: Number(yearOf(dateOf(m))) || null, poster_path: m.poster_path, watched_on: today(), rating: null, liked: false, rewatch: false, review: null, service: null }).select().single();
    btn.disabled = false;
    if (insertError) return fail(insertError, "Markeren als gezien lukte niet.");
    S.filmSeen = true;
    S.filmLog = newLog;
    S.filmLiked = !!newLog?.liked;
    btn.setAttribute("aria-pressed", "true");
    btn.textContent = "✓ Gezien";
    toast("Als gezien opgeslagen");
  }

  async function toggleFavorite(btn) {
    const m = S.film;
    if (!m) return;
    btn.disabled = true;
    const liked = !S.filmLiked;
    let data = null, error = null;
    if (S.filmLog?.id) {
      ({ data, error } = await sb.from("logs").update({ liked }).eq("id", S.filmLog.id).eq("user_id", S.me.id).select().single());
    } else {
      ({ data, error } = await sb.from("logs").insert({ user_id: S.me.id, media_type: m.media_type, tmdb_id: m.id, title: titleOf(m), year: Number(yearOf(dateOf(m))) || null, poster_path: m.poster_path, watched_on: today(), rating: null, liked, rewatch: false, review: null, service: null }).select().single());
    }
    btn.disabled = false;
    if (error) return fail(error, "Favoriet opslaan lukte niet.");
    S.filmLog = data;
    S.filmSeen = true;
    S.filmLiked = liked;
    btn.setAttribute("aria-pressed", String(liked));
    btn.textContent = liked ? "♥ Favoriet" : "♡ Favoriet";
    const seenBtn = document.querySelector('[data-act="seen"]');
    if (seenBtn) { seenBtn.setAttribute("aria-pressed", "true"); seenBtn.textContent = "✓ Gezien"; }
    toast(liked ? "Als favoriet opgeslagen" : "Uit favorieten gehaald");
  }

  // ---------- Profiel ----------
  async function viewProfile(username) {
    const { data: p } = await sb.from("profiles").select("*").eq("username", username).maybeSingle();
    if (!p) return `<div class="center"><h1 class="h2">Dit profiel bestaat niet</h1><a class="btn" href="#feed">Naar je feed</a></div>`;
    const isMe = p.id === S.me.id;
    const [logs, followers, following, amFollowing, wl, episodes, favorites] = await Promise.all([
      sb.from("logs").select("*").eq("user_id", p.id).order("watched_on", { ascending: false }).order("created_at", { ascending: false }).limit(500),
      sb.from("follows").select("*", { count: "exact", head: true }).eq("followee", p.id),
      sb.from("follows").select("*", { count: "exact", head: true }).eq("follower", p.id),
      isMe ? Promise.resolve({ data: null }) : sb.from("follows").select("follower").eq("follower", S.me.id).eq("followee", p.id).maybeSingle(),
      isMe ? sb.from("watchlist").select("*").eq("user_id", p.id).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
      isMe ? sb.from("episode_progress").select("tmdb_id, season_number, episode_number, series_title, poster_path, watched_at").eq("user_id", p.id).order("watched_at", { ascending: false }).limit(2000) : Promise.resolve({ data: [] }),
      isMe ? sb.from("logs").select("*").eq("user_id", p.id).eq("liked", true).order("watched_on", { ascending: false }).order("created_at", { ascending: false }).limit(1000) : Promise.resolve({ data: [] })
    ]);
    const L = logs.data || [];
    S.profile = { p, isMe, logs: L, favorites: favorites.data || [], episodeProgress: episodes.data || [], watchlist: wl.data || [], tab: S.profile?.p?.id === p.id ? S.profile.tab : "dagboek", following: !!amFollowing.data, seenQuery: "" };
    const yr = String(new Date().getFullYear());
    return `
      <div class="row" style="justify-content:flex-end;min-height:44px">${isMe ? `<a class="x" href="#instellingen" aria-label="Instellingen">${icon.gear}</a>` : ""}</div>
      <div class="profile-head">${avatar(p, true)}<div style="min-width:0"><h1 class="h1" style="font-size:24px">${esc(p.display_name || p.username)}</h1><div class="muted">@${esc(p.username)}</div></div></div>
      ${isMe ? "" : `<button class="btn ${S.profile.following ? "" : "accent"} block" style="margin-top:14px" data-act="follow">${S.profile.following ? "Volgend" : "Volgen"}</button>`}
      <div class="counts">
        <div><b>${L.length}</b><span>gelogd</span></div>
        <div><b>${L.filter((l) => (l.watched_on || "").startsWith(yr)).length}</b><span>in ${yr}</span></div>
        <div><b>${followers.count ?? 0}</b><span>volgers</span></div>
        <div><b>${following.count ?? 0}</b><span>volgend</span></div>
      </div>
      <div class="seg" role="tablist">
        ${[["dagboek", "Dagboek"], ...(isMe ? [["gezien", "Gekeken"]] : []), ["kijklijst", "Kijklijst"], ["stats", "Statistiek"]].filter(([k]) => isMe || k !== "kijklijst").map(([k, n]) => `<button role="tab" data-act="ptab" data-t="${k}" aria-selected="${S.profile.tab === k}">${n}</button>`).join("")}
      </div>
      <div id="ptab-body" style="margin-top:12px">${profileTab()}</div>`;
  }
  function profileTab() {
    const P = S.profile;
    if (P.tab === "gezien") {
      const unique = new Map();
      for (const l of P.logs) if (!unique.has(`${l.media_type}:${l.tmdb_id}`)) unique.set(`${l.media_type}:${l.tmdb_id}`, l);
      for (const l of P.favorites) if (!unique.has(`${l.media_type}:${l.tmdb_id}`)) unique.set(`${l.media_type}:${l.tmdb_id}`, l);
      const episodeCounts = new Map();
      for (const e of P.episodeProgress) {
        const key = `tv:${e.tmdb_id}`;
        episodeCounts.set(key, (episodeCounts.get(key) || 0) + 1);
        if (!unique.has(key)) unique.set(key, { media_type: "tv", tmdb_id: e.tmdb_id, title: e.series_title, poster_path: e.poster_path });
      }
      const q = (P.seenQuery || "").trim().toLocaleLowerCase("nl");
      const watched = [...unique.values()].filter((l) => !q || (l.title || "").toLocaleLowerCase("nl").includes(q)).sort((a, b) => (a.title || "").localeCompare(b.title || "", "nl"));
      const tiles = watched.map((l) => `<a class="tile" href="${linkTo(typeOf(l), l.tmdb_id)}">${poster(l.poster_path)}<span class="t">${esc(l.title)}</span><span class="y">${typeOf(l) === "tv" ? `Serie${episodeCounts.has(`tv:${l.tmdb_id}`) ? ` · ${episodeCounts.get(`tv:${l.tmdb_id}`)} afl. gezien` : ""}` : "Film"}${l.year ? ` · ${l.year}` : ""}</span></a>`).join("");
      return `<div class="stack" style="gap:12px"><input class="input" id="zoek-gezien" type="search" placeholder="Zoek een film of serie" aria-label="Zoek in je bekeken films en series" value="${esc(P.seenQuery)}"><div id="gezien-results">${tiles ? `<div class="grid">${tiles}</div>` : `<div class="empty"><p class="muted" style="margin:0">${q ? "Geen bekeken films of series gevonden." : "Je hebt nog geen films of series als gezien gemarkeerd."}</p></div>`}</div></div>`;
    }
    if (P.tab === "kijklijst") {
      return P.watchlist.length ? `<div class="grid">${P.watchlist.map((w) => `<a class="tile" href="${linkTo(typeOf(w), w.tmdb_id)}">${poster(w.poster_path)}<span class="t">${esc(w.title)}</span>${typeOf(w) === "tv" ? '<span class="y">Serie</span>' : ""}</a>`).join("")}</div>`
        : `<div class="empty"><p class="muted" style="margin:0">Je kijklijst is leeg. Tik bij een film of serie op “+ Kijklijst”.</p></div>`;
    }
    if (P.tab === "stats") {
      if (!P.logs.length) return `<div class="empty"><p class="muted" style="margin:0">Nog niets gelogd.</p></div>`;
      const per = {}; for (const l of P.logs) { const k = l.service || "Onbekend"; per[k] = (per[k] || 0) + 1; }
      const rows = Object.entries(per).sort((a, b) => b[1] - a[1]); const max = rows[0][1];
      const rated = P.logs.filter((l) => l.rating);
      const avg = rated.length ? (rated.reduce((s, l) => s + Number(l.rating), 0) / rated.length).toFixed(1).replace(".", ",") : "–";
      return `<div class="stack"><span class="soft">Waar ${P.isMe ? "je" : "er"} keek</span>
        ${rows.map(([n, c]) => `<div class="bar"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(n)}</span><span class="track"><span class="fill" style="width:${(c / max) * 100}%"></span></span><span class="num">${c}</span></div>`).join("")}
        <span class="muted">Gemiddeld ★ ${avg} · ${P.logs.filter((l) => l.liked).length} favorieten</span></div>`;
    }
    return P.logs.length ? P.logs.map((l) => `<div class="diary-row">
        <div class="d"><b>${new Date(l.watched_on + "T12:00").getDate()}</b>${esc(fmtDay(l.watched_on).split(" ")[1] || "")}</div>
        <a class="thumb" href="${linkTo(typeOf(l), l.tmdb_id)}">${poster(l.poster_path, "w92")}</a>
        <a class="m" href="${linkTo(typeOf(l), l.tmdb_id)}"><div class="t">${esc(l.title)}</div><div class="stars" style="font-size:12px">${starText(l.rating)}${l.liked ? ' <span class="heart">♥</span>' : ""}</div>${l.review ? `<div class="review diary-review">${esc(l.review)}</div>` : ""}</a>
        ${P.isMe ? `<button type="button" class="btn small diary-edit" data-act="edit-review" data-id="${esc(l.id)}">${l.review ? "Bewerk review" : "Review toevoegen"}</button>` : ""}
      </div>`).join("")
      : `<div class="empty"><p class="muted" style="margin:0">${P.isMe ? "Je hebt nog niets gelogd." : "Nog niets gelogd."}</p>${P.isMe ? '<a class="btn accent" href="#ontdek">Film of serie zoeken</a>' : ""}</div>`;
  }
  async function toggleFollow(btn) {
    const P = S.profile; btn.disabled = true;
    const q = P.following
      ? sb.from("follows").delete().eq("follower", S.me.id).eq("followee", P.p.id)
      : sb.from("follows").insert({ follower: S.me.id, followee: P.p.id });
    const { error } = await q;
    if (error) { btn.disabled = false; return fail(error); }
    route();
  }

  function openReviewEditor(id) {
    const log = S.profile?.logs.find((l) => String(l.id) === String(id));
    if (!log || !S.profile.isMe) return;
    S.editingLog = log;
    openSheet(`<div class="sheet-head"><div><div class="label">${log.review ? "Recensie aanpassen" : "Recensie toevoegen"}</div><h2 class="h2">${esc(log.title)}</h2></div><button class="x" data-act="close" aria-label="Sluiten">${icon.x}</button></div>
      <label class="stack" style="gap:6px"><span class="label">Recensie</span><textarea class="input" id="edit-review" maxlength="2000" placeholder="Wat vond je ervan?">${esc(log.review || "")}</textarea></label>
      <button class="btn primary block" data-act="save-review">Recensie opslaan</button>`);
  }

  async function saveReview(btn) {
    const log = S.editingLog;
    if (!log || !S.profile?.isMe) return;
    btn.disabled = true;
    const review = document.getElementById("edit-review").value.trim() || null;
    const { error } = await sb.from("logs").update({ review }).eq("id", log.id).eq("user_id", S.me.id);
    if (error) { btn.disabled = false; return fail(error, "Recensie opslaan lukte niet."); }
    log.review = review;
    S.editingLog = null;
    closeSheet();
    document.getElementById("ptab-body").innerHTML = profileTab();
    toast("Recensie bijgewerkt");
  }

  // ---------- Vrienden ----------
  const inviteLink = () => `${location.origin}${location.pathname}?uitnodiging=${encodeURIComponent(S.me.username)}`;
  async function viewFriends() {
    const { data } = await sb.from("follows").select("followee, profiles!follows_followee_fkey(username, display_name)").eq("follower", S.me.id);
    const list = (data || []).map((f) => f.profiles).filter(Boolean);
    return `<h1 class="h1">Vrienden</h1>
      <div class="stack" style="margin-top:14px">
        <input class="input" id="zoek-vriend" type="search" placeholder="Zoek op gebruikersnaam" aria-label="Zoek op gebruikersnaam" autocapitalize="off" autocomplete="off">
        <div id="vriend-results"></div>
        <div class="invite">
          <div class="h2" style="color:inherit">Kijk samen met je vrienden</div>
          <div style="font-size:14px">Stuur je link. Wie hem opent en een account maakt, volgt jou meteen.</div>
          <button class="btn block" data-act="share">Deel mijn link</button>
        </div>
      </div>
      <div class="section"><div class="label" style="margin-bottom:6px">Jij volgt (${list.length})</div>
        ${list.length ? list.map((p) => personRow(p)).join("") : '<p class="muted">Je volgt nog niemand.</p>'}</div>`;
  }
  const personRow = (p) => `<a class="person" href="#u/${esc(p.username)}">${avatar(p)}<div class="m"><div style="font-weight:600">${esc(p.display_name || p.username)}</div><div class="s">@${esc(p.username)}</div></div><span class="muted">›</span></a>`;
  async function searchFriends() {
    const q = (document.getElementById("zoek-vriend")?.value || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    const box = document.getElementById("vriend-results"); if (!box) return;
    if (q.length < 2) { box.innerHTML = ""; return; }
    const { data } = await sb.from("profiles").select("username, display_name").ilike("username", `${q}%`).neq("id", S.me.id).limit(10);
    box.innerHTML = (data || []).length ? data.map(personRow).join("") : `<p class="muted">Niemand gevonden met @${esc(q)}.</p>`;
  }
  async function share() {
    const url = inviteLink();
    const text = "Kijk je mee op Doekie? Dan zie je wat ik kijk en waar films staan.";
    if (navigator.share) { try { await navigator.share({ title: "Doekie", text, url }); return; } catch (_) { return; } }
    try { await navigator.clipboard.writeText(url); toast("Link gekopieerd"); } catch (_) { prompt("Kopieer je link:", url); }
  }

  // ---------- Instellingen ----------
  async function viewSettings() {
    let provs = [];
    try { provs = (await nlProviders()).slice(0, 30); } catch (_) {}
    const mine = new Set(myServices());
    return `<div class="row" style="gap:8px"><a class="x" href="#profiel" aria-label="Terug">${icon.back}</a><h1 class="h1" style="font-size:24px">Instellingen</h1></div>
      <div class="section"><div class="label">Mijn diensten</div><p class="muted" style="margin:4px 0 10px;font-size:13px">Films op deze diensten krijgen het label “Jouw dienst”.</p>
        <div class="list">${provs.map((p) => `<label class="check-row"><img src="${IMG}w92${esc(p.logo_path)}" alt=""><span>${esc(p.provider_name)}</span><input type="checkbox" data-prov="${p.provider_id}" ${mine.has(p.provider_id) ? "checked" : ""}></label>`).join("") || '<p class="muted">Diensten laden lukte niet.</p>'}</div></div>
      <div class="section stack" style="gap:4px">
        <button class="btn ghost block" style="justify-content:flex-start" data-act="logout">Uitloggen</button>
      </div>
      <p class="muted" style="font-size:12px;margin-top:28px">Filmdata en posters van TMDB. Streaminggegevens van JustWatch. Doekie gebruikt de TMDB API maar wordt niet door TMDB ondersteund of goedgekeurd.</p>`;
  }
  async function saveServices() {
    const ids = [...document.querySelectorAll("[data-prov]:checked")].map((el) => Number(el.dataset.prov));
    const { error } = await sb.from("profiles").update({ services: ids }).eq("id", S.me.id);
    if (error) return fail(error, "Opslaan lukte niet.");
    S.me.services = ids; toast("Diensten opgeslagen");
  }

  // ---------- Klikken, typen, versturen ----------
  document.addEventListener("click", async (e) => {
    const el = e.target.closest("[data-act]"); if (!el) return;
    const act = el.dataset.act;
    if (act === "sheet-bg" && e.target !== el) return;
    switch (act) {
      case "retry": route(); break;
      case "auth-mode": S.authMode = el.dataset.m; viewLogin(); break;
      case "google": {
        const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname } });
        if (error) fail(error, authMessage(error));
        break;
      }
      case "focus-search": S.focusSearch = true; if (location.hash === "#ontdek") { e.preventDefault(); document.getElementById("zoek")?.focus(); } break;
      case "back": history.length > 1 ? history.back() : (location.hash = "feed"); break;
      case "ontdek-all": S.ontdekMine = false; route(); break;
      case "ontdek-mine": S.ontdekMine = true; route(); break;
      case "trailer": openTrailer(); break;
      case "season": {
        S.season = Number(el.dataset.n);
        const seasonAll = document.querySelector('[data-act="season-all"]');
        if (seasonAll) seasonAll.dataset.n = String(S.season);
        document.querySelectorAll("[data-act=season]").forEach((b) => b.setAttribute("aria-pressed", b === el));
        updateEpisodeProgressUI();
        loadSeason(S.season);
        break;
      }
      case "season-all": toggleSeason(el); break;
      case "episode": { const d = el.querySelector(".ep-more"); if (d) { d.hidden = !d.hidden; el.setAttribute("aria-expanded", !d.hidden); } break; }
      case "toggle-episode": toggleEpisode(el); break;
      case "log": openLog(); break;
      case "seen": markSeen(el); break;
      case "favorite": toggleFavorite(el); break;
      case "edit-review": openReviewEditor(el.dataset.id); break;
      case "save-review": saveReview(el); break;
      case "watchlist": toggleWatchlist(el); break;
      case "close": case "sheet-bg": closeSheet(); break;
      case "star": { const n = Number(el.dataset.n); S.log.rating = S.log.rating === n ? n - 0.5 : n; renderLogSheet(); break; }
      case "toggle-liked": S.log.liked = !S.log.liked; renderLogSheet(); break;
      case "toggle-rewatch": S.log.rewatch = !S.log.rewatch; renderLogSheet(); break;
      case "service": S.log.service = el.dataset.s; renderLogSheet(); break;
      case "save-log": saveLog(el); break;
      case "ptab": S.profile.tab = el.dataset.t; S.profile.seenQuery = ""; document.querySelectorAll("[data-act=ptab]").forEach((b) => b.setAttribute("aria-selected", b === el)); document.getElementById("ptab-body").innerHTML = profileTab(); break;
      case "follow": toggleFollow(el); break;
      case "share": share(); break;
      case "logout": await sb.auth.signOut(); location.hash = ""; break;
    }
  });
  document.addEventListener("input", (e) => {
    if (e.target.id === "zoek") { clearTimeout(S.searchT); S.searchT = setTimeout(runSearch, 300); }
    if (e.target.id === "zoek-vriend") { clearTimeout(S.searchT); S.searchT = setTimeout(searchFriends, 250); }
    if (e.target.id === "zoek-gezien") {
      S.profile.seenQuery = e.target.value;
      const body = document.getElementById("ptab-body");
      if (body) body.innerHTML = profileTab();
      const input = document.getElementById("zoek-gezien");
      if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
    }
  });
  document.addEventListener("change", (e) => { if (e.target.matches("[data-prov]")) saveServices(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && sheetRoot.innerHTML) closeSheet(); });
  document.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    if (f.id === "login-form") {
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const signup = S.authMode === "signup";
      S.lastEmail = email;
      if (password.length < 8) return toast("Je wachtwoord moet minstens 8 tekens zijn.");
      const btn = document.getElementById("login-btn"); btn.disabled = true; btn.textContent = "Bezig…";
      const res = signup
        ? await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } })
        : await sb.auth.signInWithPassword({ email, password });
      if (res.error) { btn.disabled = false; btn.textContent = signup ? "Account maken" : "Inloggen"; return fail(res.error, authMessage(res.error)); }
      if (signup && !res.data.session) {
        btn.disabled = false; btn.textContent = "Account maken";
        app.innerHTML = `<div class="center"><div class="logo" style="font-size:48px">doekie<span>.</span></div><h1 class="h2">Bevestig je e-mailadres</h1>
          <p class="muted">We stuurden een mail naar <b>${esc(email)}</b>. Tik op de link en log daarna in.</p>
          <button class="btn" data-act="auth-mode" data-m="login">Naar inloggen</button></div>`;
      }
    }
    if (f.id === "onboard-form") {
      const username = document.getElementById("username").value.trim().toLowerCase();
      const display_name = document.getElementById("displayname").value.trim() || null;
      if (!/^[a-z0-9_]{3,20}$/.test(username)) return toast("Gebruik 3 tot 20 tekens: kleine letters, cijfers of _.");
      const { data, error } = await sb.from("profiles").insert({ id: S.session.user.id, username, display_name }).select().single();
      if (error) return fail(error, error.code === "23505" ? "Die gebruikersnaam is al bezet." : "Opslaan lukte niet.");
      S.me = data; await acceptInvite(); location.hash = "ontdek"; route();
    }
  });

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
