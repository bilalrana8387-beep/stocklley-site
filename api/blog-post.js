// Server-rendered single post at /blog/:slug (mapped via vercel.json
// rewrite to /api/blog-post?slug=:slug). Same server-side-fetch reasoning
// as blog-index.js -- full HTML in the initial response for SEO, plus real
// per-post <title>/description/OG tags instead of one static tag for every
// post.

const { fetchBlogPost, escapeHtml, renderMarkdown, fmtDate, pageShell } = require("./_lib");

module.exports = async (req, res) => {
  const slug = req.query.slug;
  if (!slug) { res.status(400).send("Missing slug."); return; }

  let post = null;
  try {
    post = await fetchBlogPost(slug);
  } catch (err) {
    console.error("blog-post: could not load post:", err.message);
    res.status(500).send("Could not load this post right now. Please try again shortly.");
    return;
  }

  if (!post) {
    res.status(404);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(pageShell({
      title: "Post not found — Stocklley Blog",
      description: "This post doesn't exist or hasn't been published yet.",
      canonical: "https://www.stocklley.com/blog/" + escapeHtml(slug),
      bodyHtml: `<main class="wrap"><a class="back-link" href="/blog">← Back to Blog</a><h1 class="post-title">Post not found</h1><p>This post doesn't exist, or hasn't been published yet.</p></main>`,
    }));
    return;
  }

  const canonical = "https://www.stocklley.com/blog/" + post.slug;
  const description = post.seoDescription || post.excerpt || "";
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description,
    datePublished: post.publishedAt,
    author: { "@type": "Organization", name: post.author || "Stocklley" },
    publisher: { "@type": "Organization", name: "Stocklley" },
    mainEntityOfPage: canonical,
  });

  const bodyHtml = `<main class="wrap">
    <a class="back-link" href="/blog">← Back to Blog</a>
    <h1 class="post-title">${escapeHtml(post.title)}</h1>
    <div class="post-meta">${escapeHtml(post.author || "Stocklley Team")} · ${escapeHtml(fmtDate(post.publishedAt))}</div>
    ${post.coverImageUrl ? `<img class="post-cover" src="${escapeHtml(post.coverImageUrl)}" alt="${escapeHtml(post.title)}">` : ""}
    <div class="post-body">${renderMarkdown(post.content)}</div>
  </main>`;

  const html = pageShell({
    title: (post.seoTitle || post.title) + " — Stocklley Blog",
    description,
    canonical,
    ogImage: post.coverImageUrl || null,
    bodyHtml,
    jsonLd,
  });

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
  res.status(200).send(html);
};
