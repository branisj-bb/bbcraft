// Lokální testovací server: servíruje dist/ + API funkce z api/
// Použití: node scripts/local-test-server.mjs  →  http://localhost:4322
// Vyžaduje .env se STRIPE_SECRET_KEY a STRIPE_PUBLISHABLE_KEY (test mode)
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const DIST = join(ROOT, "dist");
const PORT = 4322;

// načti .env
const envPath = join(ROOT, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

if (!process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) {
  console.warn(
    "⚠️  STRIPE_SECRET_KEY není testovací (sk_test_...) — pozor, pracoval bys s ostrým účtem!",
  );
}

const { default: createCheckoutSession } = await import(
  join(ROOT, "api/create-checkout-session.js")
);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".xml": "application/xml",
  ".txt": "text/plain",
  ".ico": "image/x-icon",
};

// mini-shim Vercel res API (res.status().json() / .send())
function wrapRes(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (obj) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(obj));
  };
  res.send = (body) => res.end(body);
  return res;
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString() || "null"));
      } catch {
        resolve(null);
      }
    });
  });
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/api/create-checkout-session") {
    req.body = await readBody(req);
    return createCheckoutSession(req, wrapRes(res));
  }

  // statické soubory z dist/
  let path = normalize(url.pathname).replace(/^(\.\.[/\\])+/, "");
  let file = join(DIST, path);
  if (existsSync(file) && !extname(file)) file = join(file, "index.html");
  if (!extname(file)) file += ".html";

  if (!existsSync(file)) {
    res.statusCode = 404;
    return res.end("Not found: " + url.pathname);
  }
  res.setHeader("Content-Type", MIME[extname(file)] ?? "application/octet-stream");
  res.end(readFileSync(file));
}).listen(PORT, () => {
  console.log(`🐌 Testovací server běží na http://localhost:${PORT}`);
});
