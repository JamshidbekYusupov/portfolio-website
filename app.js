/*
 * Portfolio front-end logic.
 * Data flow: load repos (serverless API → direct GitHub → local cache)
 *            → normalize + merge with config.js → render profile + projects.
 */
(function () {
  "use strict";

  const CONFIG = globalThis.SITE_CONFIG || {};
  const USERNAME = CONFIG.githubUsername || "JamshidbekYusupov";
  const CACHE_KEY = "portfolio-gh-cache-v1:" + USERNAME.toLowerCase();
  const CACHE_FRESH_MS = 60 * 60 * 1000; // 1 hour

  /* ---------------- utilities ---------------- */

  const $ = (sel, root = document) => root.querySelector(sel);

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  // Only allow http(s) and site-relative URLs into href/src attributes.
  function safeUrl(url) {
    if (!url || typeof url !== "string") return "";
    const trimmed = url.trim();
    if (/^\/(?!\/)/.test(trimmed)) return trimmed;
    const withScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : "https://" + trimmed;
    try {
      const u = new URL(withScheme);
      return u.protocol === "http:" || u.protocol === "https:" ? u.href : "";
    } catch {
      return "";
    }
  }

  // Files shipped with the site (CV, photo, project images). Returned as page-relative paths
  // ("files/cv.pdf") so they work on Vercel, in a sub-folder, and when index.html is opened from disk.
  // Full http(s) URLs are allowed too.
  function assetUrl(path) {
    if (!path || typeof path !== "string") return "";
    const p = path.trim();
    if (/^https?:\/\//i.test(p)) return safeUrl(p);
    if (/^[a-z][a-z\d+.-]*:/i.test(p) || p.startsWith("//")) return ""; // javascript:, data:, protocol-relative…
    const rel = p.replace(/^(\.\/|\/)+/, "");
    return rel ? rel.split("/").map(encodeURIComponent).join("/") : "";
  }

  const ACRONYMS = new Set(["ai", "ml", "llm", "lm", "nlp", "api", "xai", "aqi", "gpt", "cv", "eda", "rag", "ui", "sql"]);
  const SMALL_WORDS = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "in", "of", "on", "or", "the", "to", "vs", "with"]);

  // "car_price_prediction" → "Car Price Prediction", "Cosmopedia_Small-_LM" → "Cosmopedia Small LM"
  function humanize(name) {
    const words = String(name)
      .replace(/([a-z\d])([A-Z])/g, "$1 $2")
      .split(/[\s_\-.]+/)
      .filter(Boolean);
    if (!words.length) return String(name);
    return words
      .map((w, i) => {
        const lower = w.toLowerCase();
        if (ACRONYMS.has(lower)) return lower.toUpperCase();
        if (i > 0 && SMALL_WORDS.has(lower)) return lower;
        if (w.length > 1 && w === w.toUpperCase() && /[A-Z]/.test(w)) return w;
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join(" ");
  }

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  function relativeTime(ms) {
    if (!ms) return "";
    const diff = (ms - Date.now()) / 1000;
    const units = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
    for (const [unit, secs] of units) {
      if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
    }
    return "just now";
  }

  const dateFmt = new Intl.DateTimeFormat("en", { year: "numeric", month: "long", day: "numeric" });
  const formatDate = (ms) => (ms ? dateFmt.format(new Date(ms)) : "");

  const parseTime = (iso) => {
    const t = Date.parse(iso);
    return Number.isFinite(t) ? t : 0;
  };

  /* ---------------- data loading ---------------- */

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && Array.isArray(parsed.repos) ? parsed : null;
    } catch {
      return null;
    }
  }

  function writeCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, cachedAt: Date.now() }));
    } catch {
      /* storage full or blocked — ignore */
    }
  }

  async function fetchJson(url, timeoutMs = 10000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function isValidPayload(data) {
    return data && data.user && Array.isArray(data.repos);
  }

  async function fromServerless() {
    const data = await fetchJson("/api/github");
    if (!isValidPayload(data)) throw new Error("Malformed /api/github response");
    // If config username was changed but the function still points at another user, don't show the wrong data.
    if (String(data.user.login).toLowerCase() !== USERNAME.toLowerCase()) {
      throw new Error("/api/github serves a different user; set GITHUB_USERNAME on Vercel");
    }
    return data;
  }

  async function fromGitHubDirect() {
    const base = "https://api.github.com/users/" + encodeURIComponent(USERNAME);
    const user = await fetchJson(base);
    const repos = [];
    for (let page = 1; page <= 10; page++) {
      const batch = await fetchJson(`${base}/repos?per_page=100&type=owner&sort=pushed&page=${page}`);
      if (!Array.isArray(batch)) throw new Error("Unexpected GitHub response");
      repos.push(...batch);
      if (batch.length < 100) break;
    }
    return { user, repos, fetchedAt: new Date().toISOString() };
  }

  async function loadData() {
    const cached = readCache();
    if (cached && Date.now() - cached.cachedAt < CACHE_FRESH_MS) return { data: cached, source: "cache" };

    const errors = [];
    for (const [source, loader] of [["api", fromServerless], ["github", fromGitHubDirect]]) {
      try {
        const data = await loader();
        writeCache(data);
        return { data, source };
      } catch (err) {
        errors.push(err.message);
      }
    }
    if (cached) return { data: cached, source: "stale-cache" };
    throw new Error(errors.join(" | "));
  }

  /* ---------------- normalization ---------------- */

  function lowerKeyMap(obj) {
    const map = new Map();
    for (const [k, v] of Object.entries(obj || {})) map.set(k.toLowerCase(), v);
    return map;
  }

  function buildProjects(repos) {
    const overrides = lowerKeyMap(CONFIG.overrides);
    const hidden = new Set((CONFIG.hidden || []).map((n) => n.toLowerCase()));
    // `featured` is the old name of `projects`; still accepted.
    const order = (CONFIG.projects || CONFIG.featured || []).map((n) => String(n).toLowerCase());
    const listed = new Set(order);
    const profileRepo = USERNAME.toLowerCase();

    const seen = new Set();
    const projects = [];
    for (const r of repos) {
      if (!r || typeof r.name !== "string") continue;
      const key = r.name.toLowerCase();
      if (seen.has(key)) continue; // guard against duplicate pages
      seen.add(key);
      if (key === profileRepo || hidden.has(key)) continue;
      if (r.fork && !CONFIG.showForks && !listed.has(key)) continue;

      const o = overrides.get(key) || {};
      const topics = Array.isArray(r.topics) ? r.topics : [];
      const tags = Array.isArray(o.tags) && o.tags.length ? o.tags : topics.map(humanize);
      projects.push({
        key,
        name: r.name,
        title: o.title || humanize(r.name),
        description: o.description || r.description || "",
        tags,
        language: r.language || null,
        stars: Number(r.stargazers_count) || 0,
        forks: Number(r.forks_count) || 0,
        url: safeUrl(r.html_url) || `https://github.com/${encodeURIComponent(USERNAME)}/${encodeURIComponent(r.name)}`,
        demo: safeUrl(o.demo || r.homepage),
        image: assetUrl(o.image),
        archived: Boolean(r.archived),
        fork: Boolean(r.fork),
        createdAt: parseTime(r.created_at),
        pushedAt: parseTime(r.pushed_at) || parseTime(r.updated_at),
      });
    }

    // Shown projects: the config list in its order, or every visible repo (newest first) when the list is empty.
    let shown;
    if (order.length) {
      const byKey = new Map(projects.map((p) => [p.key, p]));
      shown = [];
      for (const k of order) {
        const p = byKey.get(k);
        if (p && !shown.includes(p)) shown.push(p);
        else if (!p) console.warn(`[portfolio] project repo "${k}" not found (renamed, private, or hidden?)`);
      }
    } else {
      shown = [...projects].sort((a, b) => b.pushedAt - a.pushedAt || a.title.localeCompare(b.title));
    }
    return { all: projects, projects: shown };
  }

  /* ---------------- rendering: profile ---------------- */

  const svg = (body, filled) =>
    `<svg class="icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" ${filled ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"'}>${body}</svg>`;
  const ICONS = {
    email: svg('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>'),
    phone: svg('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>'),
    github: svg('<path transform="scale(1.5)" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>', true),
    linkedin: svg('<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>'),
    kaggle: svg('<path d="M7 3v18M17 4l-8 8 8 8M10.5 10.5 17 4"/>'),
    download: svg('<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>'),
    web: svg('<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'),
  };

  // "+998910012723" → "+998 91 001 27 23". Numbers already containing spaces are kept as typed.
  function formatPhone(raw) {
    const s = String(raw).trim();
    if (/\s/.test(s)) return s;
    const uz = s.match(/^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/);
    if (uz) return `+998 ${uz[1]} ${uz[2]} ${uz[3]} ${uz[4]}`;
    return s;
  }

  // Sharp 480px avatar. github.com/<user>.png works even when the GitHub API is unavailable or rate-limited.
  function avatarUrl(user) {
    const api = safeUrl(user.avatar_url);
    if (!api) return `https://github.com/${encodeURIComponent(USERNAME)}.png?size=480`;
    const u = new URL(api);
    u.searchParams.set("s", "480");
    return u.href;
  }

  // Custom photo from config.js wins; if it fails to load, fall back to the GitHub avatar.
  function renderPhoto(name, githubAvatar) {
    const img = $("#hero-avatar");
    const frame = $("#avatar-frame");
    const custom = assetUrl(CONFIG.photo);
    const src = custom || githubAvatar;
    if (githubAvatar) img.dataset.fallback = githubAvatar;
    img.alt = `Portrait of ${name}`;
    if (!src || img.dataset.src === src) return;
    if (!custom && img.dataset.src && !frame.hidden) return; // GitHub photo already showing — avoid reloading it
    img.onerror = () => {
      const fb = img.dataset.fallback;
      if (fb && img.dataset.src !== fb) {
        img.dataset.src = fb;
        img.src = fb;
      } else {
        frame.hidden = true;
      }
    };
    img.onload = () => { frame.hidden = false; };
    img.dataset.src = src;
    img.src = src;
  }

  function renderProfile(user) {
    const name = CONFIG.name || user.name || user.login;
    const role = CONFIG.role || user.bio || "";
    const location = CONFIG.location || (user.location || "").trim();
    const affiliation = CONFIG.affiliation || user.company || "";
    const links = CONFIG.links || {};

    document.title = `${name}${role ? " — " + role : ""}`;
    $("#brand-name").textContent = name;
    $("#hero-name").textContent = name;
    $("#hero-role").textContent = role;
    $("#hero-tagline").textContent = CONFIG.tagline || "";

    // "Download CV" button; the download attribute saves the PDF under a readable file name.
    const cv = assetUrl(CONFIG.cv);
    const cvName = cv ? decodeURIComponent(cv.split("/").pop().split("?")[0]) || "CV.pdf" : "";
    $("#hero-actions").innerHTML = cv
      ? `<a class="btn-cv" href="${esc(cv)}" download="${esc(cvName)}" type="application/pdf">${ICONS.download}<span>Download CV</span></a>`
      : "";
    $("#hero-meta").innerHTML = [affiliation, location].filter(Boolean).map((s) => `<span>${esc(s)}</span>`).join('<span class="sep" aria-hidden="true">·</span>');

    renderPhoto(name, avatarUrl(user));

    const about = Array.isArray(CONFIG.about) ? CONFIG.about : [];
    $("#about-text").innerHTML = about.map((p) => `<p>${esc(p)}</p>`).join("");

    $("#skills").innerHTML = Object.entries(CONFIG.skills || {})
      .map(([group, items]) => `<div class="skill-group"><h3>${esc(group)}</h3><p>${(items || []).map(esc).join(", ")}</p></div>`)
      .join("");

    const contact = [];
    const item = (icon, label, href, text, external) =>
      `<li><a class="contact-item" href="${esc(href)}" aria-label="${esc(label)}: ${esc(text)}"${external ? ' target="_blank" rel="noopener"' : ""}>${ICONS[icon]}<span>${esc(text)}</span></a></li>`;
    const email = (CONFIG.email || "").trim();
    if (email) contact.push(item("email", "Email", "mailto:" + email, email, false));
    const phone = (CONFIG.phone || "").trim();
    const phoneDigits = phone.replace(/[^\d+]/g, "");
    if (phoneDigits.replace("+", "").length >= 5) contact.push(item("phone", "Phone", "tel:" + phoneDigits, formatPhone(phone), false));
    const linkDefs = [["github", "GitHub", links.github || user.html_url], ["linkedin", "LinkedIn", links.linkedin], ["kaggle", "Kaggle", links.kaggle], ["web", "Website", user.blog]];
    for (const [icon, label, href] of linkDefs) {
      const url = safeUrl(href);
      if (url) contact.push(item(icon, label, url, url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""), true));
    }
    $("#contact-list").innerHTML = contact.join("");
    $("#footer-name").textContent = name;
  }

  function renderStats(projects, allRepos) {
    const languages = new Set(projects.map((p) => p.language).filter(Boolean));
    const stars = projects.reduce((s, p) => s + p.stars, 0);
    const latest = projects.reduce((m, p) => Math.max(m, p.pushedAt), 0);
    const firstYear = allRepos.reduce((m, p) => (p.createdAt && p.createdAt < m ? p.createdAt : m), Infinity);
    const items = [
      [projects.length, projects.length === 1 ? "Project" : "Projects"],
      [languages.size, languages.size === 1 ? "Language" : "Languages"],
      [stars, stars === 1 ? "Star" : "Stars"],
      [Number.isFinite(firstYear) ? new Date(firstYear).getFullYear() : "—", "Building since"],
    ];
    $("#stats").innerHTML = items.map(([v, l]) => `<div><dt>${esc(l)}</dt><dd>${esc(v)}</dd></div>`).join("");
    $("#last-active").textContent = latest ? `Last commit ${relativeTime(latest)}` : "";
  }

  /* ---------------- rendering: projects ---------------- */

  function linkHtml(p) {
    const parts = [`<a href="${esc(p.url)}" target="_blank" rel="noopener">Source</a>`];
    if (p.demo) parts.push(`<a href="${esc(p.demo)}" target="_blank" rel="noopener">Live demo</a>`);
    return parts.join("");
  }

  function renderProjects(projects) {
    const list = $("#project-list");
    if (!projects.length) {
      list.innerHTML = `<p class="empty">No projects to show yet.</p>`;
      return;
    }
    list.innerHTML = projects
      .map(
        (p) => `
      <article class="feature">
        <div class="feature-body">
          ${p.image ? `<img class="feature-img" src="${esc(p.image)}" alt="" loading="lazy">` : ""}
          <h3><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.title)}</a></h3>
          <p class="feature-meta">
            ${p.language ? `<span>${esc(p.language)}</span>` : ""}
            ${p.pushedAt ? `<span>Updated <time datetime="${new Date(p.pushedAt).toISOString()}" title="${esc(formatDate(p.pushedAt))}">${esc(relativeTime(p.pushedAt))}</time></span>` : ""}
            ${p.stars ? `<span>★ ${p.stars}</span>` : ""}
          </p>
          ${p.description ? `<p class="feature-desc">${esc(p.description)}</p>` : ""}
          ${p.tags.length ? `<ul class="tags">${p.tags.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
          <p class="feature-links">${linkHtml(p)}</p>
        </div>
      </article>`
      )
      .join("");
  }

  /* ---------------- theme ---------------- */

  const THEME_KEY = "portfolio-theme";
  const THEME_COLORS = { dark: "#07080a", white: "#ffffff", indigo: "#1b1a4a" };

  function currentTheme() {
    const t = document.documentElement.dataset.theme;
    return Object.prototype.hasOwnProperty.call(THEME_COLORS, t) ? t : "dark";
  }

  function applyTheme(theme, persist) {
    if (!Object.prototype.hasOwnProperty.call(THEME_COLORS, theme)) theme = "dark";
    document.documentElement.dataset.theme = theme;
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", THEME_COLORS[theme]);
    for (const btn of document.querySelectorAll(".theme-btn")) {
      btn.setAttribute("aria-pressed", String(btn.dataset.themeValue === theme));
    }
    if (persist) {
      try { localStorage.setItem(THEME_KEY, theme); } catch { /* blocked storage — theme still applies for this visit */ }
    }
  }

  function bindTheme() {
    applyTheme(currentTheme(), false);
    const group = $("#theme-switch");
    if (group) {
      group.addEventListener("click", (e) => {
        const btn = e.target.closest(".theme-btn");
        if (btn) applyTheme(btn.dataset.themeValue, true);
      });
    }
  }

  /* ---------------- boot ---------------- */

  function showError(err) {
    console.error("[portfolio]", err);
    const profile = esc(`https://github.com/${USERNAME}`);
    $("#project-list").innerHTML = `<p class="empty">Projects could not be loaded from GitHub right now. Please try again shortly, or browse them directly on <a href="${profile}" target="_blank" rel="noopener">GitHub</a>.</p>`;
  }

  async function init() {
    $("#year").textContent = new Date().getFullYear();
    bindTheme();
    // Render config-only profile immediately so the page isn't blank while GitHub loads.
    renderProfile({ login: USERNAME, html_url: `https://github.com/${USERNAME}` });

    let result;
    try {
      result = await loadData();
    } catch (err) {
      showError(err);
      return;
    }
    const { data, source } = result;
    renderProfile(data.user);

    const { all, projects } = buildProjects(data.repos);
    renderStats(projects, all); // "Building since" uses every repo, the rest counts the shown projects
    renderProjects(projects);

    const fetched = parseTime(data.fetchedAt);
    $("#sync-note").textContent =
      `Projects synced from GitHub${fetched ? " " + relativeTime(fetched) : ""}` + (source === "stale-cache" ? " (offline copy)" : "") + ".";
  }

  // Expose pure helpers for testing in Node; boot only in a browser.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { humanize, formatPhone, esc, safeUrl, assetUrl, buildProjects, relativeTime };
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
