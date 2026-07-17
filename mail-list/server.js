"use strict";

/**
 * Mailing-list service for anttituomola.fi
 *
 * - POST /api/subscribe   { email, language, website (honeypot), source }
 * - GET  /api/confirm?token=...        double opt-in confirmation
 * - GET  /api/unsubscribe?token=...    shows a confirm button (avoids scanner prefetch)
 * - POST /api/unsubscribe?token=...    actually unsubscribes (RFC 8058 one-click)
 * - GET  /api/health
 *
 * Polls the site's blog feed (FEED_URL) every POLL_INTERVAL_MINUTES minutes.
 * New posts are emailed to confirmed subscribers SEND_DELAY_MINUTES after
 * first detection, one individual SES email per subscriber.
 */

require("dotenv").config();

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const Database = require("better-sqlite3");
const { SESClient, SendRawEmailCommand } = require("@aws-sdk/client-ses");

// --- config ---------------------------------------------------------------

const PORT = Number(process.env.PORT || 3004);
const PUBLIC_BASE_URL = (
  process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`
).replace(/\/+$/, "");
// Base URL for links inside emails. Points at the site's /mail-api proxy by
// default in production so recipients never see the backend hostname.
const LINK_BASE = (
  process.env.EMAIL_LINK_BASE_URL || `${PUBLIC_BASE_URL}/api`
).replace(/\/+$/, "");
const FEED_URL =
  process.env.FEED_URL || "https://www.anttituomola.fi/blog/feed.json";
const FROM_EMAIL = process.env.FROM_EMAIL || "antti@anttituomola.fi";
const FROM_NAME = process.env.FROM_NAME || "Antti Tuomola";
const SEND_DELAY_MINUTES = Number(process.env.SEND_DELAY_MINUTES || 30);
const POLL_INTERVAL_MINUTES = Number(process.env.POLL_INTERVAL_MINUTES || 5);
const DRY_RUN = process.env.DRY_RUN === "true";
const DB_PATH =
  process.env.DB_PATH || path.join(__dirname, "data", "mail.db");

const AWS_REGION = process.env.AWS_REGION;
const hasAwsCreds = Boolean(
  AWS_REGION &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
);

// --- database --------------------------------------------------------------

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS subscribers (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    language      TEXT NOT NULL DEFAULT 'en',
    status        TEXT NOT NULL DEFAULT 'pending',  -- pending | confirmed | unsubscribed
    confirm_token TEXT NOT NULL,
    unsub_token   TEXT NOT NULL,
    source        TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    confirmed_at  TEXT
  );
  CREATE TABLE IF NOT EXISTS posts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    feed_id         TEXT NOT NULL UNIQUE,
    url             TEXT NOT NULL,
    title           TEXT NOT NULL,
    excerpt         TEXT NOT NULL,
    language        TEXT NOT NULL,
    translation_url TEXT,
    detected_at     TEXT NOT NULL DEFAULT (datetime('now')),
    sent_at         TEXT
  );
  CREATE TABLE IF NOT EXISTS sends (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id       INTEGER NOT NULL REFERENCES posts(id),
    subscriber_id INTEGER NOT NULL REFERENCES subscribers(id),
    sent_at       TEXT NOT NULL DEFAULT (datetime('now')),
    error         TEXT,
    UNIQUE(post_id, subscriber_id)
  );
`);

const q = {
  subscriberByEmail: db.prepare("SELECT * FROM subscribers WHERE email = ?"),
  subscriberByConfirmToken: db.prepare(
    "SELECT * FROM subscribers WHERE confirm_token = ?"
  ),
  subscriberByUnsubToken: db.prepare(
    "SELECT * FROM subscribers WHERE unsub_token = ?"
  ),
  insertSubscriber: db.prepare(
    `INSERT INTO subscribers (email, language, confirm_token, unsub_token, source)
     VALUES (?, ?, ?, ?, ?)`
  ),
  updatePending: db.prepare(
    `UPDATE subscribers
     SET status = 'pending', language = ?, confirm_token = ?, unsub_token = ?, source = ?
     WHERE id = ?`
  ),
  confirmSubscriber: db.prepare(
    `UPDATE subscribers SET status = 'confirmed', confirmed_at = datetime('now')
     WHERE id = ?`
  ),
  unsubscribe: db.prepare(
    "UPDATE subscribers SET status = 'unsubscribed' WHERE id = ?"
  ),
  confirmedSubscribers: db.prepare(
    "SELECT * FROM subscribers WHERE status = 'confirmed'"
  ),
  postCount: db.prepare("SELECT COUNT(*) AS c FROM posts"),
  insertPost: db.prepare(
    `INSERT OR IGNORE INTO posts
       (feed_id, url, title, excerpt, language, translation_url, detected_at, sent_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)`
  ),
  duePosts: db.prepare(
    `SELECT * FROM posts
     WHERE sent_at IS NULL AND detected_at <= datetime('now', ?)`
  ),
  postSentAt: db.prepare("SELECT sent_at FROM posts WHERE id = ?"),
  postByUrl: db.prepare("SELECT * FROM posts WHERE url = ?"),
  postsPointingTo: db.prepare("SELECT * FROM posts WHERE translation_url = ?"),
  markSent: db.prepare(
    "UPDATE posts SET sent_at = datetime('now') WHERE url = ?"
  ),
  insertSend: db.prepare(
    "INSERT OR IGNORE INTO sends (post_id, subscriber_id) VALUES (?, ?)"
  ),
  insertSendError: db.prepare(
    "INSERT OR IGNORE INTO sends (post_id, subscriber_id, error) VALUES (?, ?, ?)"
  ),
};

// --- email -----------------------------------------------------------------

const ses = hasAwsCreds
  ? new SESClient({
      region: AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    })
  : null;

if (!ses) {
  console.warn(
    "AWS credentials not configured — emails will be logged, not sent (same as DRY_RUN)."
  );
}

const escapeHtml = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const base64Encode = (s) => Buffer.from(s, "utf8").toString("base64");
const encodeHeader = (s) => `=?UTF-8?B?${base64Encode(s)}?=`;

function buildRawEmail({ to, subject, text, html, unsubscribeUrl }) {
  const boundary = "----mail-list-boundary";
  const lines = [
    `From: ${encodeHeader(FROM_NAME)} <${FROM_EMAIL}>`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
  ];
  if (unsubscribeUrl) {
    lines.push(`List-Unsubscribe: <${unsubscribeUrl}>`);
    lines.push("List-Unsubscribe-Post: List-Unsubscribe=One-Click");
  }
  lines.push(
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="utf-8"',
    "Content-Transfer-Encoding: base64",
    "",
    base64Encode(text),
    `--${boundary}`,
    'Content-Type: text/html; charset="utf-8"',
    "Content-Transfer-Encoding: base64",
    "",
    base64Encode(html),
    `--${boundary}--`,
    ""
  );
  return lines.join("\r\n");
}

async function sendEmail({ to, subject, text, html, unsubscribeUrl }) {
  if (DRY_RUN || !ses) {
    console.log(`[dry-run] To: ${to} | Subject: ${subject}`);
    return;
  }
  const raw = buildRawEmail({ to, subject, text, html, unsubscribeUrl });
  await ses.send(
    new SendRawEmailCommand({ RawMessage: { Data: Buffer.from(raw) } })
  );
}

function confirmationEmail(sub) {
  const url = `${LINK_BASE}/confirm?token=${sub.confirm_token}`;
  const subject = "Confirm your subscription / Vahvista tilauksesi";
  const text = [
    "Confirm your subscription to Antti Tuomola's blog by opening this link:",
    url,
    "",
    "Vahvista tilauksesi Antti Tuomolan blogiin avaamalla tämä linkki:",
    url,
    "",
    "If you did not subscribe, ignore this email. / Jos et tilannut, jätä viesti huomioimatta.",
  ].join("\n");
  const html = `
    <div style="font-family: sans-serif; max-width: 32rem; margin: 0 auto;">
      <h2>Confirm your subscription</h2>
      <p>Click the button below to confirm your subscription to Antti Tuomola's blog (English posts).</p>
      <p><a href="${url}" style="display: inline-block; padding: 0.75rem 1.5rem; background: #8AA399; color: #fff; border-radius: 0.5rem; text-decoration: none;">Confirm subscription</a></p>
      <hr style="border: none; border-top: 1px solid #ccc; margin: 1.5rem 0;" />
      <h2>Vahvista tilauksesi</h2>
      <p>Vahvista tilauksesi Antti Tuomolan blogiin (suomenkieliset postaukset) painamalla yllä olevaa painiketta.</p>
      <p style="color: #666; font-size: 0.875rem;">If you did not subscribe, you can ignore this email.<br/>Jos et tilannut, voit jättää tämän viestin huomioimatta.</p>
    </div>`;
  return { subject, text, html };
}

function postEmail(sub, post) {
  const fi = post.language === "fi";
  const unsubscribeUrl = `${LINK_BASE}/unsubscribe?token=${sub.unsub_token}`;
  const readLabel = fi ? "Lue kirjoitus" : "Read the post";
  const intro = fi ? "Uusi kirjoitus blogissa:" : "New post on the blog:";
  const unsubLabel = fi ? "Peru tilaus" : "Unsubscribe";
  const subject = post.title;
  const text = [
    intro,
    "",
    post.title,
    "",
    post.excerpt,
    "",
    `${readLabel}: ${post.url}`,
    "",
    "---",
    `${unsubLabel}: ${unsubscribeUrl}`,
  ].join("\n");
  const html = `
    <div style="font-family: sans-serif; max-width: 32rem; margin: 0 auto;">
      <p style="color: #666;">${intro}</p>
      <h2>${escapeHtml(post.title)}</h2>
      <p>${escapeHtml(post.excerpt)}</p>
      <p><a href="${post.url}" style="display: inline-block; padding: 0.75rem 1.5rem; background: #8AA399; color: #fff; border-radius: 0.5rem; text-decoration: none;">${readLabel}</a></p>
      <hr style="border: none; border-top: 1px solid #ccc; margin: 1.5rem 0;" />
      <p style="color: #666; font-size: 0.875rem;">
        <a href="${unsubscribeUrl}" style="color: #666;">${unsubLabel}</a>
      </p>
    </div>`;
  return { subject, text, html, unsubscribeUrl };
}

// --- http api ----------------------------------------------------------------

const app = express();
app.use(express.json());
app.disable("x-powered-by");
// Behind nginx: trust X-Forwarded-For only from loopback so rate limiting
// sees real client IPs without allowing direct spoofing.
app.set("trust proxy", "loopback");

// Simple in-memory rate limiter (per IP)
const buckets = new Map();
function rateLimit(max, windowMs) {
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      return res.status(429).json({ error: "Too many requests, try later" });
    }
    next();
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const newToken = () => crypto.randomBytes(32).toString("hex");

app.post("/api/subscribe", rateLimit(5, 10 * 60 * 1000), async (req, res) => {
  try {
    const { email: rawEmail, language: rawLang, website, source } = req.body ?? {};

    // Honeypot: bots fill hidden fields; pretend success
    if (website) {
      return res.json({ message: "ok" });
    }

    const email = String(rawEmail || "").trim().toLowerCase();
    const language = rawLang === "fi" ? "fi" : "en";
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    const existing = q.subscriberByEmail.get(email);
    let sub;
    if (existing && existing.status === "confirmed") {
      // Already subscribed — respond identically without revealing status
      return res.json({ message: "ok" });
    } else if (existing && existing.status === "pending") {
      sub = existing; // resend confirmation with the existing token
    } else if (existing) {
      // previously unsubscribed -> back to pending with fresh tokens
      q.updatePending.run(language, newToken(), newToken(), source ?? null, existing.id);
      sub = q.subscriberByEmail.get(email);
    } else {
      q.insertSubscriber.run(email, language, newToken(), newToken(), source ?? null);
      sub = q.subscriberByEmail.get(email);
    }

    await sendEmail({ to: email, ...confirmationEmail(sub) });
    return res.json({ message: "ok" });
  } catch (err) {
    console.error("subscribe failed:", err);
    return res.status(500).json({ error: "Subscription failed, try again later" });
  }
});

const page = (title, bodyHtml) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${title}</title></head>
<body style="font-family: sans-serif; background: #3A3E2F; color: #E8E6E3; display: flex; justify-content: center; padding: 3rem 1rem;">
<div style="max-width: 28rem;">${bodyHtml}</div></body></html>`;

app.get("/api/confirm", (req, res) => {
  const sub = q.subscriberByConfirmToken.get(String(req.query.token || ""));
  if (!sub) {
    return res
      .status(404)
      .send(page("Invalid link", "<h1>Invalid or expired link</h1><p>Linkki ei kelpaa tai on vanhentunut.</p>"));
  }
  q.confirmSubscriber.run(sub.id);
  res.send(
    page(
      "Subscription confirmed",
      "<h1>Subscription confirmed 🎉</h1><p>You'll receive new posts by email.</p><p>Tilaus vahvistettu — saat uudet kirjoitukset sähköpostiisi.</p>"
    )
  );
});

// GET shows a confirm button so mail scanners prefetching the link
// don't unsubscribe people; POST (button or RFC 8058 one-click) unsubscribes.
app.get("/api/unsubscribe", (req, res) => {
  const token = String(req.query.token || "");
  const sub = q.subscriberByUnsubToken.get(token);
  if (!sub) {
    return res
      .status(404)
      .send(page("Invalid link", "<h1>Invalid link</h1><p>Linkki ei kelpaa.</p>"));
  }
  res.send(
    page(
      "Unsubscribe",
      `<h1>Unsubscribe?</h1><p>Stop receiving new posts by email. / Lopeta uusien kirjoitusten tilaus.</p>
       <form method="post" action="">
         <button type="submit" style="padding: 0.75rem 1.5rem; background: #8AA399; color: #fff; border: none; border-radius: 0.5rem; cursor: pointer;">Unsubscribe / Peru tilaus</button>
       </form>`
    )
  );
});

app.post("/api/unsubscribe", (req, res) => {
  const sub = q.subscriberByUnsubToken.get(String(req.query.token || ""));
  if (!sub) {
    return res
      .status(404)
      .send(page("Invalid link", "<h1>Invalid link</h1><p>Linkki ei kelpaa.</p>"));
  }
  q.unsubscribe.run(sub.id);
  res.send(
    page(
      "Unsubscribed",
      "<h1>Unsubscribed</h1><p>You won't receive further emails. / Et saa enää sähköposteja.</p>"
    )
  );
});

app.get("/api/health", (_req, res) => {
  const confirmed = db
    .prepare("SELECT COUNT(*) AS c FROM subscribers WHERE status = 'confirmed'")
    .get().c;
  res.json({ ok: true, confirmedSubscribers: confirmed });
});

// --- feed polling & sending --------------------------------------------------

async function pollFeed() {
  try {
    const res = await fetch(FEED_URL);
    if (!res.ok) throw new Error(`feed responded ${res.status}`);
    const { posts } = await res.json();
    if (!Array.isArray(posts)) throw new Error("feed has no posts array");

    // On the very first poll, mark everything already on the site as sent
    // so old posts are never emailed.
    const firstRun = q.postCount.get().c === 0;
    const now = new Date().toISOString();
    let added = 0;
    for (const p of posts) {
      const result = q.insertPost.run(
        p.id,
        p.url,
        p.title,
        p.excerpt ?? "",
        p.language,
        p.translationUrl ?? null,
        firstRun ? now : null
      );
      added += result.changes;
    }
    if (added > 0) {
      console.log(
        `poll: ${added} new post(s) detected${firstRun ? " (first run — marked as already sent)" : ""}`
      );
    }
  } catch (err) {
    console.error("pollFeed failed:", err.message);
  }
}

// Pick the language variant of a post for a subscriber, falling back to
// whatever language exists.
function pickVariant(post, language) {
  if (post.language === language) return post;
  if (post.translation_url) {
    const t = q.postByUrl.get(post.translation_url);
    if (t && t.language === language) return t;
  }
  for (const p of q.postsPointingTo.all(post.url)) {
    if (p.language === language) return p;
  }
  return post;
}

let sending = false;
async function processQueue() {
  if (sending) return;
  sending = true;
  try {
    const due = q.duePosts.all(`-${SEND_DELAY_MINUTES} minutes`);
    for (const post of due) {
      // The due list is a snapshot; a translation pair processed earlier in
      // this same batch already marked this post sent.
      const fresh = q.postSentAt.get(post.id);
      if (!fresh || fresh.sent_at) continue;
      // URLs of this post and its translation pair, so both get marked sent
      const pairUrls = new Set([post.url]);
      if (post.translation_url) pairUrls.add(post.translation_url);
      for (const p of q.postsPointingTo.all(post.url)) pairUrls.add(p.url);

      const subs = q.confirmedSubscribers.all();
      let sent = 0;
      for (const sub of subs) {
        const variant = pickVariant(post, sub.language);
        try {
          await sendEmail({ to: sub.email, ...postEmail(sub, variant) });
          q.insertSend.run(post.id, sub.id);
          sent += 1;
        } catch (err) {
          q.insertSendError.run(post.id, sub.id, String(err.message || err));
          console.error(`send to ${sub.email} failed:`, err.message);
        }
        await new Promise((r) => setTimeout(r, 200));
      }
      for (const url of pairUrls) q.markSent.run(url);
      console.log(`post "${post.title}" emailed to ${sent} subscriber(s)`);
    }
  } catch (err) {
    console.error("processQueue failed:", err);
  } finally {
    sending = false;
  }
}

// --- startup -----------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`mail-list listening on port ${PORT}`);
  console.log(`feed: ${FEED_URL}`);
  console.log(
    `send delay: ${SEND_DELAY_MINUTES} min, poll interval: ${POLL_INTERVAL_MINUTES} min${DRY_RUN ? ", DRY_RUN on" : ""}`
  );
  pollFeed().finally(() => processQueue());
  setInterval(pollFeed, POLL_INTERVAL_MINUTES * 60 * 1000);
  setInterval(processQueue, 60 * 1000);
});
