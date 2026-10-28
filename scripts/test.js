/* Logic tests: `npm test`. Uses Node's built-in assert, no dependencies. */
const assert = require("assert");
const path = require("path");

globalThis.SITE_CONFIG = {
  githubUsername: "JamshidbekYusupov",
  projects: ["Repo-B", "missing_repo", "repo_a", "Repo-B"],
  hidden: ["Secret_Repo"],
  showForks: false,
  overrides: { REPO_A: { title: "Custom A", tags: ["X"], demo: "javascript:alert(1)" } },
};
const app = require(path.join(__dirname, "..", "app.js"));
const origWarn = console.warn;
console.warn = () => {};

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log("  ✓ " + name);
}

test("humanize repo names", () => {
  assert.strictEqual(app.humanize("car_price_prediction"), "Car Price Prediction");
  assert.strictEqual(app.humanize("Cosmopedia_Small-_LM"), "Cosmopedia Small LM");
  assert.strictEqual(app.humanize("arixv_papers_llm_model"), "Arixv Papers LLM Model");
  assert.strictEqual(app.humanize("Tasks-for-certificate-"), "Tasks for Certificate");
  assert.strictEqual(app.humanize("leetCode_"), "Leet Code");
  assert.strictEqual(app.humanize("for_the_win"), "For the Win");
  assert.strictEqual(app.humanize("___"), "___");
});

test("phone formatting", () => {
  assert.strictEqual(app.formatPhone("+998910012723"), "+998 91 001 27 23");
  assert.strictEqual(app.formatPhone("+82 10 1234 5678"), "+82 10 1234 5678");
  assert.strictEqual(app.formatPhone("+821012345678"), "+821012345678");
});

test("HTML escaping", () => {
  assert.strictEqual(app.esc(`<img src=x onerror="a">'&`), "&lt;img src=x onerror=&quot;a&quot;&gt;&#39;&amp;");
  assert.strictEqual(app.esc(null), "");
});

test("URL sanitising", () => {
  assert.strictEqual(app.safeUrl("javascript:alert(1)"), "");
  assert.strictEqual(app.safeUrl("data:text/html,hi"), "");
  assert.strictEqual(app.safeUrl("example.com"), "https://example.com/");
  assert.strictEqual(app.safeUrl("https://x.vercel.app"), "https://x.vercel.app/");
  assert.strictEqual(app.safeUrl("/img/a.png"), "/img/a.png");
  assert.strictEqual(app.safeUrl("//cdn.example.com/x"), "https://cdn.example.com/x");
  assert.strictEqual(app.safeUrl(""), "");
  assert.strictEqual(app.safeUrl(undefined), "");
});

test("buildProjects: filtering, overrides, list order", () => {
  const repos = [
    { name: "repo_a", description: "A", language: "Python", stargazers_count: 2, pushed_at: "2025-01-01T00:00:00Z", homepage: "" },
    { name: "Repo-B", description: null, language: null, topics: ["machine-learning"], pushed_at: "2026-01-01T00:00:00Z", homepage: "b.example.com" },
    { name: "JamshidbekYusupov", description: "profile readme" },
    { name: "secret_repo" },
    { name: "a_fork", fork: true },
    { name: "repo_a" }, // duplicate
    { description: "no name" },
  ];
  const { all, projects } = app.buildProjects(repos);
  assert.deepStrictEqual(all.map((p) => p.name), ["repo_a", "Repo-B"]);
  assert.deepStrictEqual(projects.map((p) => p.name), ["Repo-B", "repo_a"], "config order, duplicates and missing names dropped");
  const a = all[0];
  assert.strictEqual(a.title, "Custom A");
  assert.deepStrictEqual(a.tags, ["X"]);
  assert.strictEqual(a.demo, "", "javascript: demo must be rejected");
  const b = all[1];
  assert.strictEqual(b.title, "Repo B");
  assert.deepStrictEqual(b.tags, ["Machine Learning"]);
  assert.strictEqual(b.demo, "https://b.example.com/");
  assert.strictEqual(b.url, "https://github.com/JamshidbekYusupov/Repo-B");
  assert.strictEqual(b.stars, 0);
});

test("buildProjects: empty list shows every repo newest first; old `featured` key still works", () => {
  const repos = [
    { name: "old", pushed_at: "2024-01-01T00:00:00Z" },
    { name: "new", pushed_at: "2026-01-01T00:00:00Z" },
    { name: "mid", pushed_at: "2025-01-01T00:00:00Z" },
  ];
  const saved = globalThis.SITE_CONFIG.projects;
  globalThis.SITE_CONFIG.projects = [];
  assert.deepStrictEqual(app.buildProjects(repos).projects.map((p) => p.name), ["new", "mid", "old"]);
  delete globalThis.SITE_CONFIG.projects;
  globalThis.SITE_CONFIG.featured = ["MID"];
  assert.deepStrictEqual(app.buildProjects(repos).projects.map((p) => p.name), ["mid"]);
  delete globalThis.SITE_CONFIG.featured;
  globalThis.SITE_CONFIG.projects = saved;
});

test("asset paths for CV / photo", () => {
  assert.strictEqual(app.assetUrl("files/Yusupov_Jamshidbek_CV_Data_Science.pdf"), "files/Yusupov_Jamshidbek_CV_Data_Science.pdf");
  assert.strictEqual(app.assetUrl("/files/cv.pdf"), "files/cv.pdf", "leading slash removed so it works from disk too");
  assert.strictEqual(app.assetUrl("./images/me.jpg"), "images/me.jpg");
  assert.strictEqual(app.assetUrl("files/My CV.pdf"), "files/My%20CV.pdf");
  assert.strictEqual(app.assetUrl("https://example.com/cv.pdf"), "https://example.com/cv.pdf");
  assert.strictEqual(app.assetUrl("javascript:alert(1)"), "");
  assert.strictEqual(app.assetUrl("//evil.com/x.pdf"), "");
  assert.strictEqual(app.assetUrl(""), "");
});

test("relative time", () => {
  assert.strictEqual(app.relativeTime(Date.now() - 3 * 86400000), "3 days ago");
  assert.strictEqual(app.relativeTime(0), "");
});

(async () => {
  // Live check of the serverless function against the real GitHub API.
  const handler = require(path.join(__dirname, "..", "api", "github.js"));
  const res = {
    headers: {}, statusCode: 0, body: "",
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    end(b) { this.body = b; },
  };
  await handler({ method: "GET" }, res);
  if (res.statusCode === 502 && /rate limit/i.test(res.body)) {
    console.log("  - api/github live check skipped (GitHub rate limit)");
  } else {
    assert.strictEqual(res.statusCode, 200, res.body);
    const data = JSON.parse(res.body);
    assert.strictEqual(data.user.login, "JamshidbekYusupov");
    assert.ok(data.repos.length > 0);
    assert.match(res.headers["cache-control"], /s-maxage=3600/);

    // Run the real config against real data and check every listed repo resolves.
    delete require.cache[require.resolve(path.join(__dirname, "..", "app.js"))];
    globalThis.window = globalThis;
    require(path.join(__dirname, "..", "config.js"));
    const live = require(path.join(__dirname, "..", "app.js"));
    const warnings = [];
    console.warn = (m) => warnings.push(m);
    const { all, projects } = live.buildProjects(data.repos);
    assert.deepStrictEqual(warnings, [], "all project repos in config.js exist");
    assert.strictEqual(projects.length, globalThis.SITE_CONFIG.projects.length);
    assert.ok(!all.some((p) => p.name === "JamshidbekYusupov"));
    passed++;
    console.log(`  ✓ live API: ${data.repos.length} repos fetched, ${projects.length} projects shown`);
  }
  console.warn = origWarn;
  console.log(`\n${passed} tests passed`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
