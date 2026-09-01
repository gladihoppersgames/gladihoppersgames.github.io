// Local preview server. Usage: node scripts/serve.cjs [port]
// Mirrors GitHub Pages behaviour closely enough for checking the site locally:
// directory URLs resolve to index.html, and unknown paths serve 404.html.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const port = Number(process.argv[2]) || 8899;

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

http
  .createServer((request, response) => {
    const requested = decodeURIComponent(request.url.split("?")[0]);
    let file = path.join(root, requested);

    // Keep requests inside the project directory.
    if (!file.startsWith(root)) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      file = path.join(file, "index.html");
    }

    if (!fs.existsSync(file)) {
      const notFound = path.join(root, "404.html");
      if (fs.existsSync(notFound)) {
        response.writeHead(404, { "Content-Type": types[".html"] });
        fs.createReadStream(notFound).pipe(response);
        return;
      }
      response.writeHead(404).end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    fs.createReadStream(file).pipe(response);
  })
  .listen(port, () => {
    console.log(`Gladihoppers Games preview running at http://localhost:${port}/`);
  });
