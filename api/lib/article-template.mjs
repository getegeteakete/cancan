// 共有テンプレート — ブログ静的記事ページ & サイトマップ生成
// cron-article.js（Vercel）とローカルのバックフィルスクリプトの両方から利用します。

export const SITE_URL = "https://cancan-wine.vercel.app";

export function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// 記事本文(HTML)から素のテキストを取り出す（メタ用のフォールバック）
function stripTags(html) {
  return String(html || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

// 記事1本の完全な静的HTMLページ（SEO最適化済み）
export function articlePageHtml(art, opts = {}) {
  const site = opts.siteUrl || SITE_URL;
  const url = site + "/blog/" + art.slug + "/";
  const desc = (art.excerpt && art.excerpt.trim()) || stripTags(art.body).slice(0, 120);
  const tags = Array.isArray(art.tags) ? art.tags : [];
  const image = site + "/og-image.jpg";

  const blogPosting = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": art.title,
    "description": desc,
    "datePublished": art.date,
    "dateModified": art.date,
    "author": { "@type": "Organization", "name": "カンティーナ赤坂", "url": site + "/" },
    "publisher": {
      "@type": "Organization",
      "name": "カンティーナ赤坂",
      "logo": { "@type": "ImageObject", "url": image },
    },
    "image": image,
    "mainEntityOfPage": { "@type": "WebPage", "@id": url },
    "keywords": tags.join(", "),
    "inLanguage": "ja",
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "ホーム", "item": site + "/" },
      { "@type": "ListItem", "position": 2, "name": "ブログ", "item": site + "/blog/" },
      { "@type": "ListItem", "position": 3, "name": art.title, "item": url },
    ],
  };

  const tagHtml = tags.map((t) => '<span class="tag">' + esc(t) + "</span>").join("");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(art.title)}｜カンティーナ赤坂</title>
<meta name="description" content="${esc(desc)}">
<meta name="keywords" content="${esc(tags.join(","))}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#0c0906">
<meta property="og:type" content="article">
<meta property="og:site_name" content="カンティーナ赤坂 Cantina Akasaka">
<meta property="og:title" content="${esc(art.title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${image}">
<meta property="og:locale" content="ja_JP">
<meta property="article:published_time" content="${esc(art.date)}">
${tags.map((t) => '<meta property="article:tag" content="' + esc(t) + '">').join("\n")}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(art.title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${image}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Jost:wght@300;400;500&family=Shippori+Mincho:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{--ink:#0c0906;--ink-2:#14100a;--ink-3:#1d160e;--line:rgba(207,58,55,0.26);--line-soft:rgba(207,58,55,0.13);--red:#cf3a37;--red-2:#ef7a72;--cream:#efe7d6;--muted:#a3947c;--serif:'Cormorant Garamond','Shippori Mincho',serif;--mincho:'Shippori Mincho',serif;--sans:'Jost',sans-serif;}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:var(--mincho);background:var(--ink);color:var(--cream);line-height:1.9;-webkit-font-smoothing:antialiased}
a{color:inherit}
header{position:sticky;top:0;z-index:50;background:rgba(12,9,6,0.9);backdrop-filter:blur(12px);border-bottom:1px solid var(--line-soft);padding:16px 22px;display:flex;align-items:center;gap:16px}
header .home{font-family:var(--serif);font-size:22px;color:var(--cream);text-decoration:none}
header .home b{color:var(--red);font-weight:500}
header .back{margin-left:auto;font-family:var(--sans);font-size:12px;letter-spacing:0.1em;color:var(--muted);text-decoration:none;border:1px solid var(--line);padding:8px 14px;transition:all .25s}
header .back:hover{border-color:var(--red);color:var(--red-2)}
.wrap{max-width:760px;margin:0 auto;padding:56px 22px 90px}
.crumb{font-family:var(--sans);font-size:11px;letter-spacing:0.06em;color:var(--muted);margin-bottom:26px}
.crumb a{text-decoration:none;border-bottom:1px solid var(--line-soft)}
.crumb a:hover{color:var(--red-2)}
.crumb span{margin:0 8px;opacity:.5}
.article .date{font-family:var(--sans);font-size:12px;letter-spacing:0.14em;color:var(--red-2)}
.article h1{font-family:var(--serif);font-weight:500;font-size:clamp(30px,6vw,46px);line-height:1.25;margin:12px 0 8px}
.article .tags{margin:14px 0 30px;display:flex;flex-wrap:wrap;gap:8px}
.tag{font-family:var(--sans);font-size:11px;color:var(--muted);border:1px solid var(--line);padding:5px 11px}
.article .rule{width:56px;height:1px;background:var(--red);opacity:.6;margin:0 0 28px}
.article .body{font-size:16px;line-height:2.05;color:#f2ece0}
.article .body h3{font-family:var(--serif);font-weight:500;font-size:24px;color:var(--red-2);margin:32px 0 10px}
.article .body p{margin-bottom:18px}
.article .cta{margin-top:44px;padding-top:26px;border-top:1px solid var(--line-soft)}
.btn{display:inline-flex;align-items:center;gap:9px;font-family:var(--sans);font-size:13px;letter-spacing:0.1em;color:#fff;background:var(--red);border:1px solid var(--red);padding:14px 26px;text-decoration:none;transition:background .3s}
.btn:hover{background:#b62e2b}
.back-list{display:inline-block;margin-top:34px;font-family:var(--sans);font-size:12px;color:var(--muted);text-decoration:none;border-bottom:1px solid var(--line)}
.back-list:hover{color:var(--red-2)}
footer{border-top:1px solid var(--line-soft);padding:34px 22px;text-align:center;font-family:var(--sans);font-size:11px;letter-spacing:0.12em;color:var(--muted)}
@media(max-width:560px){.wrap{padding:40px 20px 70px}.article .body{font-size:15.5px}}
:focus-visible{outline:2px solid var(--red);outline-offset:2px}
</style>
<script type="application/ld+json">${JSON.stringify(blogPosting)}</script>
<script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>
</head>
<body>
<header>
  <a href="/" class="home">Cantina <b>Akasaka</b></a>
  <a href="/blog/" class="back">ブログ一覧</a>
</header>
<div class="wrap">
  <nav class="crumb" aria-label="パンくず"><a href="/">ホーム</a><span>›</span><a href="/blog/">ブログ</a><span>›</span>${esc(art.title)}</nav>
  <article class="article">
    <div class="date">${esc(art.date)}</div>
    <h1>${esc(art.title)}</h1>
    <div class="tags">${tagHtml}</div>
    <div class="rule"></div>
    <div class="body">${art.body || ""}</div>
    <div class="cta"><a class="btn" href="https://www.hotpepper.jp/strJ000670170/" target="_blank" rel="noopener">ご予約はこちら（ホットペッパー）</a></div>
    <a class="back-list" href="/blog/">← 記事一覧へ戻る</a>
  </article>
</div>
<footer>© 2026 Cantina Akasaka｜福岡市中央区赤坂2-3-28｜地下鉄「赤坂駅」2番出口 徒歩9分</footer>
</body>
</html>
`;
}

// posts全体からsitemap.xmlを生成（トップ + ブログ一覧 + 各記事）
export function sitemapXml(posts, opts = {}) {
  const site = opts.siteUrl || SITE_URL;
  const today = opts.today || (posts[0] && posts[0].date) || "2026-07-02";
  const urls = [
    `  <url><loc>${site}/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
    `  <url><loc>${site}/blog/</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`,
  ];
  for (const p of posts || []) {
    if (!p || !p.slug) continue;
    urls.push(
      `  <url><loc>${site}/blog/${p.slug}/</loc><lastmod>${p.date || today}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`
    );
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}
