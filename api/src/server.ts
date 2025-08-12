import express from "express";
import fs from "fs";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

type Artwork = {
  id: string;
  slug: string;
  title: string;
  artist: string;
  medium: string;
  dimensions: { w: number; h: number; unit: string };
  year: number;
  price: number;
  currency: string;
  availability: "available" | "reserved" | "sold";
  framed: boolean;
  style: string[];
  tags: string[];
  images: { cover: string; thumb: string; alt: string; gallery?: string[] };
};

const app = express();
app.use(helmet());
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
const DATA_PATH = path.join(__dirname, "../data/artworks.json");
let DATA: Artwork[] = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));

// ---------- Static images ----------
app.use(
  "/images",
  express.static(path.join(__dirname, "../public/images"), {
    maxAge: "30d",
    immutable: true,
  })
);

// ---------- API ----------
app.get("/api/artworks", (req, res) => {
  let items = DATA;
  const { style, maxPrice, q } = req.query as Record<string, string>;
  if (style) items = items.filter(a => a.style.includes(style));
  if (maxPrice) items = items.filter(a => a.price <= Number(maxPrice));
  if (q) {
    const needle = q.toLowerCase();
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
  const { cart, buyer } = req.body as {
    cart: { id: string; qty: number }[];
    buyer: { name: string; email: string; phone?: string; note?: string };
  };
  if (!cart?.length || !buyer?.email)
    return res.status(400).json({ error: "Bad input" });

  const items = cart
    .map(c => {
      const art = DATA.find(a => a.id === c.id);
      return art ? { art, qty: c.qty } : null;
    })
    .filter(Boolean) as { art: Artwork; qty: number }[];

  if (!items.length) return res.status(400).json({ error: "Cart invalid" });

  const currency = items[0]!.art.currency;
  const total = items.reduce((s, x) => s + x.art.price * x.qty, 0);
  const lines = items
    .map(
      x => `- ${x.art.title} (${x.art.id}) x${x.qty} — ${x.art.price} ${currency}`
    )
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

// ---------- Angular serving in production ----------
if (process.env.NODE_ENV === "production") {
  const angularPath = path.join(__dirname, "../dist/web/browser");

  // Serve static assets
  app.use(
    express.static(angularPath, {
      maxAge: "1d",
      index: false,
    })
  );

  // SPA fallback
  // SPA fallback
    app.get("/*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/images")) {
        return next();
    }
    res.sendFile(path.join(angularPath, "index.html"));
    });

}

// Health check
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// ---------- Start server ----------
const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
