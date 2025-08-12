"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use(express_1.default.json({ limit: "1mb" }));
// CORS
app.use((0, cors_1.default)(process.env.NODE_ENV === "production"
    ? { origin: true, credentials: false }
    : { origin: ["http://localhost:4200"], credentials: false }));
// Rate limiting
app.use((0, express_rate_limit_1.default)({ windowMs: 60000, max: 60 }));
// ---------- Data ----------
const DATA_PATH = path_1.default.join(__dirname, "../data/artworks.json");
let DATA = JSON.parse(fs_1.default.readFileSync(DATA_PATH, "utf-8"));
// ---------- Static images ----------
app.use("/images", express_1.default.static(path_1.default.join(__dirname, "../public/images"), {
    maxAge: "30d",
    immutable: true,
}));
// ---------- API ----------
app.get("/api/artworks", (req, res) => {
    let items = DATA;
    const { style, maxPrice, q } = req.query;
    if (style)
        items = items.filter(a => a.style.includes(style));
    if (maxPrice)
        items = items.filter(a => a.price <= Number(maxPrice));
    if (q) {
        const needle = q.toLowerCase();
        items = items.filter(a => (a.title + a.artist + a.medium + (a.tags || []).join())
            .toLowerCase()
            .includes(needle));
    }
    res.json(items);
});
app.get("/api/artworks/:slug", (req, res) => {
    const item = DATA.find(a => a.slug === req.params.slug);
    if (!item)
        return res.status(404).json({ error: "Not found" });
    res.json(item);
});
// ---------- Email ----------
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
});
app.post("/api/checkout/email", async (req, res) => {
    const { cart, buyer } = req.body;
    if (!cart?.length || !buyer?.email)
        return res.status(400).json({ error: "Bad input" });
    const items = cart
        .map(c => {
        const art = DATA.find(a => a.id === c.id);
        return art ? { art, qty: c.qty } : null;
    })
        .filter(Boolean);
    if (!items.length)
        return res.status(400).json({ error: "Cart invalid" });
    const currency = items[0].art.currency;
    const total = items.reduce((s, x) => s + x.art.price * x.qty, 0);
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
    }
    catch (e) {
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
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Email failed" });
    }
});
// ---------- Angular serving in production ----------
if (process.env.NODE_ENV === "production") {
    const angularPath = path_1.default.join(__dirname, "../dist/web/browser");
    // Serve static assets
    app.use(express_1.default.static(angularPath, {
        maxAge: "1d",
        index: false,
    }));
    // SPA fallback
    // SPA fallback
    app.get("/*", (req, res, next) => {
        if (req.path.startsWith("/api") || req.path.startsWith("/images")) {
            return next();
        }
        res.sendFile(path_1.default.join(angularPath, "index.html"));
    });
}
// Health check
app.get("/healthz", (_req, res) => res.json({ ok: true }));
// ---------- Start server ----------
const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
//# sourceMappingURL=server.js.map