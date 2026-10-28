/*
 * Local preview server: `npm run dev`, then open http://localhost:3000
 * Serves the static files and runs api/github.js the same way Vercel does.
 * (Not deployed — excluded via .vercelignore.)
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT) || 3000;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
};

const apiHandler = require(path.join(ROOT, "api", "github.js"));

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === "/api/github") return apiHandler(req, res);

    const rel = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
    const file = path.resolve(ROOT, "." + rel);
    if (!file.startsWith(ROOT + path.sep)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    fs.readFile(file, (err, buf) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream" });
      res.end(buf);
    });
  })
  .listen(PORT, () => console.log(`Portfolio running at http://localhost:${PORT}`));
