// ブログ静的記事ページ & sitemap をローカルで一括生成/再生成するスクリプト。
//   node scripts/gen-blog-static.mjs
// posts.json を読み、各記事の blog/<slug>/index.html と sitemap.xml を出力します。
// Vercel Cron は api/cron-article.js が同じテンプレートで自動生成するため、
// このスクリプトは既存記事のバックフィルや手動再生成用です。

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { articlePageHtml, sitemapXml } from "../api/lib/article-template.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const posts = JSON.parse(readFileSync(resolve(root, "blog/posts.json"), "utf8")).posts || [];

let n = 0;
for (const p of posts) {
  if (!p || !p.slug) continue;
  const dir = resolve(root, "blog", p.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, "index.html"), articlePageHtml(p), "utf8");
  n++;
}

const today = posts[0]?.date || "2026-07-02";
writeFileSync(resolve(root, "sitemap.xml"), sitemapXml(posts, { today }), "utf8");

console.log(`生成完了: 静的記事 ${n} 本 + sitemap.xml (${posts.length + 2} URL)`);
