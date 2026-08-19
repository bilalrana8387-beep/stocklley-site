// Server-rendered blog index at /blog (mapped via vercel.json rewrite).
// Fetches published posts from the app's public API server-side, so the
// HTML response search engines see already has real post titles/excerpts
// in it -- not an empty page that only fills in after client-side JS runs.

const { fetchBlogPosts, escapeHtml, fmtDate, pageShell } = require("./_lib");

module.exports = async (req, res) => {
  let posts = [];
  try {
    posts = await fetchBlogPosts();
  } catch (err) {
    console.error("blog-index: could not load posts:", err.message);
  }

  const cards = posts.length
    ? posts.map(p => `<a class="post-card" href="/blog/${escapeHtml(p.slug)}">
        <h2>${escapeHtml(p.title)}</h2>
        <div class="meta">${escapeHtml(fmtDate(p.publishedAt))}</div>
        ${p.excerpt ? `<p>${escapeHtml(p.excerpt)}</p>` : ""}
        <span class="readmore">Read more →</span>
      </a>`).join("\n")
    : `<div class="empty-state">No posts published yet — check back soon.</div>`;

  const bodyHtml = `<main class="wrap">
    <div class="blog-eyebrow">Stocklley Blog</div>
    <h1 class="blog-index-h1">Notes for Amazon sellers and the agencies who run them</h1>
    <p class="blog-index-sub">Real inventory, purchasing, and accounting problems we see sellers run into — and how to actually fix them.</p>
    ${cards}
  </main>`;

  const html = pageShell({
    title: "Blog — Stocklley",
    description: "Real inventory, purchasing, and accounting problems Amazon sellers run into, and how to fix them.",
    canonical: "https://www.stocklley.com/blog",
    bodyHtml,
  });

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
  res.status(200).send(html);
};
