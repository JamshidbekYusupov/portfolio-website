/*
 * Vercel serverless function: GET /api/github
 *
 * Fetches the GitHub profile and every public repository, trims the payload,
 * and lets Vercel's CDN cache it for an hour. Visitors therefore almost never
 * hit GitHub's rate limit (60 requests/hour unauthenticated).
 *
 * Optional environment variables (Vercel → Project → Settings → Environment Variables):
 *   GITHUB_USERNAME  defaults to the username below
 *   GITHUB_TOKEN     a fine-grained token with no extra permissions; raises the limit to 5,000/hour
 */
const USERNAME = process.env.GITHUB_USERNAME || "JamshidbekYusupov";
const API = "https://api.github.com";
const MAX_PAGES = 10; // 1,000 repos is more than enough

const USER_FIELDS = ["login", "name", "bio", "avatar_url", "html_url", "company", "location", "blog", "public_repos", "followers"];
const REPO_FIELDS = [
  "name", "description", "html_url", "homepage", "language", "topics", "fork", "archived",
  "stargazers_count", "forks_count", "created_at", "updated_at", "pushed_at",
];

function pick(obj, fields) {
  const out = {};
  for (const f of fields) out[f] = obj[f] ?? null;
  return out;
}

async function gh(path) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "portfolio-website",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const res = await fetch(API + path, { headers });
  if (!res.ok) {
    const remaining = res.headers.get("x-ratelimit-remaining");
    const reason = remaining === "0" ? "GitHub rate limit exceeded" : `GitHub responded ${res.status}`;
    throw new Error(`${reason} for ${path}`);
  }
  return res.json();
}

async function fetchAllRepos(user) {
  const repos = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = await gh(`/users/${encodeURIComponent(user)}/repos?per_page=100&type=owner&sort=pushed&page=${page}`);
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  return repos;
}

function send(res, status, body, cacheControl) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", cacheControl);
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return send(res, 405, { error: "Method not allowed" }, "no-store");
  }
  try {
    const [user, repos] = await Promise.all([
      gh(`/users/${encodeURIComponent(USERNAME)}`),
      fetchAllRepos(USERNAME),
    ]);
    send(
      res,
      200,
      {
        user: pick(user, USER_FIELDS),
        repos: repos.map((r) => pick(r, REPO_FIELDS)),
        fetchedAt: new Date().toISOString(),
      },
      // CDN keeps it 1h, then serves stale for up to a day while refreshing in the background.
      "public, s-maxage=3600, stale-while-revalidate=86400"
    );
  } catch (err) {
    send(res, 502, { error: err.message }, "no-store");
  }
};
