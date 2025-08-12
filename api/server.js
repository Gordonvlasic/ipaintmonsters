// api/server.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();                              // load .env for local dev
const app = express();
const PORT = process.env.PORT || 4000;

// Heroku is behind a proxy; needed for express-rate-limit + correct IPs
app.set("trust proxy", 1);

// Basic hardening (turn off CSP unless you’ve configured it)
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "1mb" }));

// CORS
app.use(
  cors(
    process.env.NODE_ENV === "production"
      ? { origin: true, credentials: false }
      : { origin: ["http://localhost:4200"], credentials: false }
  )
);

// Rate limiting
app.use(rateLimit({ windowMs: 60_000, max: 60 }));

// ---------- Data ----------
const DATA_PATH = path.join(__dirname, "data", "artworks.json");
let DATA = [];
try {
  DATA = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
} catch (err) {
  console.warn("No artworks.json at", DATA_PATH);
}

// ---------- Static images (corrected path) ----------
app.use(
  "/images",
  express.static(path.join(__dirname, "public", "images"), {
    maxAge: "30d",
    immutable: true,
  })
);

// ---------- API ----------
app.get("/api/artworks", (req, res) => {
  let items = DATA;
  const { style, maxPrice, q } = req.query || {};
  if (style) items = items.filter(a => (a.style || []).includes(style));
  if (maxPrice) items = items.filter(a => a.price <= Number(maxPrice));
  if (q) {
    const needle = String(q).toLowerCase();
    items = items.filter(a =>
      (a.title + a.artist + a.medium + (a.tags || []).join())
        .toLowerCase()
        .includes(needle)
    );
  }
  res.json(items);
});

app.get("/api/artworks/:slug", (req, res) => {
  const item = DATA.find(a => a.slug === req.params.slug);
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(item);
});

// ---------- Email ----------
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

app.post("/api/checkout/email", async (req, res) => {
  const { cart, buyer } = req.body || {};
  if (!Array.isArray(cart) || !buyer?.email)
    return res.status(400).json({ error: "Bad input" });

  const items = cart
    .map(c => {
      const art = DATA.find(a => a.id === c.id);
      return art ? { art, qty: Number(c.qty || 1) } : null;
    })
    .filter(Boolean);

  if (!items.length) return res.status(400).json({ error: "Cart invalid" });

  const currency = items[0].art.currency || "";
  const total = items.reduce((s, x) => s + (x.art.price || 0) * x.qty, 0);
  const lines = items
    .map(x => `- ${x.art.title} (${x.art.id}) x${x.qty} — ${x.art.price} ${currency}`)
    .join("\n");

  const html = `
    <h2>New order/reservation request</h2>
    <p><b>Name:</b> ${buyer.name || ""}<br/>
    <b>Email:</b> ${buyer.email}<br/>
    <b>Phone:</b> ${buyer.phone || "-"}</p>
    <p><b>Items:</b><br/><pre>${lines}</pre></p>
    <p><b>Total (non-binding):</b> ${total} ${currency}</p>
    <p><b>Note:</b> ${buyer.note || "-"}</p>
  `;

  try {
    await transporter.sendMail({
      from: `"Gallery" <no-reply@${process.env.MAIL_DOMAIN || "example.com"}>`,
      to: process.env.SALES_EMAIL,
      replyTo: buyer.email,
      subject: `Order/Reserve: ${items.map(x => x.art.title).join(", ")}`,
      html,
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Email failed" });
  }
});

app.post("/api/inquiry", async (req, res) => {
  const { slug, name, email, message } = req.body || {};
  if (!slug || !email || !message)
    return res.status(400).json({ error: "Bad input" });
  const art = DATA.find(a => a.slug === slug);
  const html = `<p>Inquiry about <b>${art?.title || slug}</b></p><p>${message}</p><p>From: ${name || ""} / ${email}</p>`;
  try {
    await transporter.sendMail({
      from: `"Gallery" <no-reply@${process.env.MAIL_DOMAIN || "example.com"}>`,
      to: process.env.SALES_EMAIL,
      replyTo: email,
      subject: `Inquiry: ${art?.title || slug}`,
      html,
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Email failed" });
  }
});

// ---------- Angular build (production) ----------
if (process.env.NODE_ENV === "production") {
  // Build lives at api/dist/web/browser
  const angularPath = path.join(__dirname, "dist", "web", "browser");

  // Serve static bundles before catch-all
  app.use(express.static(angularPath, { maxAge: "1d", index: false }));
  app.use(
    "/assets",
    express.static(path.join(angularPath, "assets"), { maxAge: "30d", immutable: true })
  );

  // SPA fallback (use "*" not "/*")
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/images")) return next();
    res.sendFile(path.join(angularPath, "index.html"));
  });
}

// Health check
app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
