// Shared helpers for the blog's server-rendered pages (api/blog-index.js,
// api/blog-post.js). No external npm dependencies on purpose -- same reason
// as stocklley-app's own api/_lib.js: nothing to install at deploy time
// that could fail or drift.
//
// These pages are rendered SERVER-SIDE (not fetched client-side with JS)
// specifically so search engines see real content in the initial HTML
// response, not an empty shell -- the whole point of adding a blog.

const APP_API_BASE = "https://app.stocklley.com";

async function fetchBlogPosts() {
  const res = await fetch(APP_API_BASE + "/api/blog");
  if (!res.ok) throw new Error("Could not load posts (" + res.status + ")");
  const data = await res.json();
  return Array.isArray(data.posts) ? data.posts : [];
}

async function fetchBlogPost(slug) {
  const res = await fetch(APP_API_BASE + "/api/blog?slug=" + encodeURIComponent(slug));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Could not load post (" + res.status + ")");
  const data = await res.json();
  return data.post || null;
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Minimal Markdown -> HTML: headings (## / ###), **bold**, *italic*,
// [text](url) links, "- " bullet lists, and blank-line-separated
// paragraphs. Covers exactly what the admin editor's hint promises --
// deliberately not a full CommonMark implementation.
function renderMarkdown(md) {
  const lines = String(md || "").replace(/\r\n/g, "\n").split("\n");
  const htmlBlocks = [];
  let para = [];
  let list = [];
  const flushPara = () => {
    if (para.length) { htmlBlocks.push("<p>" + inline(para.join(" ")) + "</p>"); para = []; }
  };
  const flushList = () => {
    if (list.length) { htmlBlocks.push("<ul>" + list.map(li => "<li>" + inline(li) + "</li>").join("") + "</ul>"); list = []; }
  };
  function inline(s) {
    let out = escapeHtml(s);
    out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>");
    return out;
  }
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushPara(); flushList(); continue; }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) { flushPara(); flushList(); const lvl = h[1].length + 1; htmlBlocks.push("<h" + lvl + ">" + inline(h[2]) + "</h" + lvl + ">"); continue; }
    const li = line.match(/^[-*]\s+(.*)$/);
    if (li) { flushPara(); list.push(li[1]); continue; }
    flushList();
    para.push(line);
  }
  flushPara(); flushList();
  return htmlBlocks.join("\n");
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

// Same SVG mark used in the app and on the rest of stocklley.com.
const LOGO_SVG = `<svg viewBox="30 45 120 140" xmlns="http://www.w3.org/2000/svg" style="height:34px;width:auto;display:block;">
  <circle cx="75" cy="90" r="35" fill="#1D9E75" opacity="0.6"/>
  <circle cx="105" cy="115" r="35" fill="#0F6E56" opacity="0.6"/>
  <circle cx="75" cy="140" r="35" fill="#5DCAA5" opacity="0.6"/>
  <g transform="translate(60,69)" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" fill="none">
    <path d="M11 0 L22 5.5 L22 16.5 L11 22 L0 16.5 L0 5.5 Z"/>
    <path d="M0 5.5 L11 11 L22 5.5"/>
    <path d="M11 11 L11 22"/>
  </g>
  <g transform="translate(105,104.5)" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" fill="none">
    <path d="M0 3 L14 3 L14 15 L0 15 Z"/>
    <path d="M14 7 L20 7 L23 11 L23 15 L14 15"/>
    <circle cx="5" cy="17.5" r="2.5" fill="#ffffff" stroke="none"/>
    <circle cx="19" cy="17.5" r="2.5" fill="#ffffff" stroke="none"/>
  </g>
  <g transform="translate(60,139)" stroke="#ffffff" stroke-width="1.8" fill="none">
    <circle cx="11" cy="11" r="10.5"/>
    <path d="M11 5 L11 17 M14.5 7.5 Q11 5.5 8 7.2 Q6 8.5 8 10 Q10 11 12 11.5 Q14.5 12.3 12.5 14.5 Q9.5 16.3 7 14" stroke-linecap="round"/>
  </g>
</svg>`;

// Full page shell -- header/nav/footer match the rest of stocklley.com
// (same logo, same nav links, same orange CTA) so the blog doesn't feel
// bolted on. `bodyHtml` is the page-specific content.
function pageShell({ title, description, canonical, ogImage, bodyHtml, jsonLd }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Stocklley">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
${ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}">` : ""}
<meta name="twitter:card" content="${ogImage ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
${jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : ""}
<style>
* { box-sizing: border-box; }
body { margin:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background:#ffffff; color:#1a2233; }
a { color:inherit; }
header { background:#0f1e2e; }
header .inner { max-width:1120px; margin:0 auto; padding:18px 24px; display:flex; align-items:center; justify-content:space-between; }
header .brand { display:flex; align-items:center; gap:10px; color:#fff; font-weight:700; font-size:19px; text-decoration:none; font-family:Georgia,'DejaVu Serif',serif; }
nav.desktop-nav { display:flex; align-items:center; gap:26px; }
nav.desktop-nav .nav-link { color:#cbd5e1; text-decoration:none; font-size:14px; font-weight:500; }
nav.desktop-nav .nav-link:hover { color:#fff; }
nav.desktop-nav .login-link { color:#fff; text-decoration:none; font-size:14px; font-weight:600; }
nav.desktop-nav .cta-btn { background:#F2A541; color:#1a1204; padding:9px 18px; border-radius:8px; font-weight:700; font-size:14px; text-decoration:none; }
main.wrap { max-width:760px; margin:0 auto; padding:48px 24px 80px; }
.blog-eyebrow { font-size:12px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:#0F6E56; margin-bottom:10px; }
.blog-index-h1 { font-size:34px; font-weight:700; margin:0 0 8px; }
.blog-index-sub { color:#6b7280; font-size:16px; margin-bottom:40px; max-width:600px; }
.post-card { display:block; text-decoration:none; color:inherit; padding:24px 0; border-bottom:1px solid #e5e7eb; }
.post-card:first-child { padding-top:0; }
.post-card h2 { font-size:22px; margin:0 0 8px; color:#111827; }
.post-card .meta { font-size:13px; color:#9ca3af; margin-bottom:8px; }
.post-card p { color:#4b5563; font-size:15px; line-height:1.6; margin:0; }
.post-card .readmore { color:#0F6E56; font-weight:600; font-size:14px; margin-top:10px; display:inline-block; }
.empty-state { color:#6b7280; padding:40px 0; }
.post-title { font-size:38px; font-weight:700; line-height:1.2; margin:0 0 14px; }
.post-meta { color:#9ca3af; font-size:14px; margin-bottom:32px; }
.post-cover { width:100%; border-radius:12px; margin-bottom:32px; display:block; }
.post-body { font-size:17px; line-height:1.75; color:#1f2937; }
.post-body h2 { font-size:26px; margin:36px 0 14px; }
.post-body h3 { font-size:21px; margin:28px 0 12px; }
.post-body p { margin:0 0 20px; }
.post-body ul { margin:0 0 20px; padding-left:22px; }
.post-body li { margin-bottom:8px; }
.post-body a { color:#0F6E56; text-decoration:underline; }
.back-link { display:inline-block; margin-bottom:28px; color:#6b7280; text-decoration:none; font-size:14px; }
.back-link:hover { color:#111827; }
footer { background:#0f1e2e; color:#94a3b8; margin-top:60px; }
footer .inner { max-width:1120px; margin:0 auto; padding:32px 24px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:16px; font-size:13px; }
footer a { color:#cbd5e1; text-decoration:none; }
@media (max-width:720px) {
  nav.desktop-nav { display:none; }
  .post-title { font-size:28px; }
}
</style>
</head>
<body>
<header>
  <div class="inner">
    <a href="https://www.stocklley.com/" class="brand">${LOGO_SVG}<span>Stocklley</span></a>
    <nav class="desktop-nav">
      <a href="https://www.stocklley.com/#features" class="nav-link">Features</a>
      <a href="https://www.stocklley.com/#forecasting" class="nav-link">Forecasting</a>
      <a href="https://www.stocklley.com/#stack" class="nav-link">Why Stocklley</a>
      <a href="/blog" class="nav-link">Blog</a>
      <a href="https://www.stocklley.com/#pricing" class="nav-link">Pricing</a>
      <a href="https://app.stocklley.com" class="login-link">Log In</a>
      <a href="https://www.stocklley.com/#signup" class="cta-btn">Sign Up</a>
    </nav>
  </div>
</header>
${bodyHtml}
<footer>
  <div class="inner">
    <div>© ${new Date().getFullYear()} Stocklley, a product of Lifefit Pro. All rights reserved.</div>
    <div style="display:flex;gap:18px;">
      <a href="https://www.stocklley.com/">Home</a>
      <a href="/blog">Blog</a>
      <a href="https://www.stocklley.com/#pricing">Pricing</a>
    </div>
  </div>
</footer>
</body>
</html>`;
}

module.exports = { fetchBlogPosts, fetchBlogPost, escapeHtml, renderMarkdown, fmtDate, pageShell };
