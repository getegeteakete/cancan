// Vercel Cron / 手動公開 兼用 — 1日1記事の自動生成＆ブログ追加
// 必要な環境変数:
//   ANTHROPIC_API_KEY : Claude APIキー（生成に使用）
//   GITHUB_TOKEN      : リポジトリ書き込み権限のあるfine-grained PAT（記事の保存に使用）
//   GITHUB_REPO       : 省略時は getegeteakete/cancan
//   CRON_SECRET       : Vercel Cronの認証（Vercelが自動でBearer送信）
//   ADMIN_PASSWORD    : 管理画面から「今すぐ公開」する際の認証（任意）
//
// Vercel Cron は vercel.json の crons 設定で毎日呼び出されます。
//
// 生成時に以下を同時に更新します（SEO対策）:
//   1. blog/posts.json                … 記事データ（SPA一覧＆記事ビュー用）
//   2. blog/<slug>/index.html         … クロール可能な静的記事ページ（正規URL・OGP・構造化データ付き）
//   3. sitemap.xml                    … トップ＋一覧＋全記事URLを再生成

import { articlePageHtml, sitemapXml } from "./lib/article-template.mjs";

const FACTS =
  "店名:カンティーナ赤坂(Cantina Akasaka)/福岡市中央区赤坂2-3-28/地下鉄「赤坂駅」2番出口 徒歩9分/" +
  "営業18:00〜翌0:00(L.O.23:30)/日曜・祝日定休(一部不定休)/昼営業(ランチ)はなし/ニューオーリンズ風の大人のバー食堂・ブルースが流れる隠れ家/" +
  "名物:人気No.1のカマンベールマーマレード、塩麹熟成牛ステーキ(アンガス牛)/山崎12年・響・余市・マッカラン・ボウモア、ワイン、生ビール、カクテル/カルボナーラ・チーズ盛合せ・締めのラーメンや味噌汁も/" +
  "40席(カウンター・テーブル)・2階は貸切個室4〜25名でカラオケ完備/テーブルチャージ¥550(税込)/ディナー¥3,500〜 宴会コース¥3,000〜/" +
  "飲み放題付きコース:二次会宴会コース(90分・全3品)¥3,000、女子会プラン(120分・女性限定)¥4,000、女子会プラン(料理のみ)¥3,000、各種宴会向けカンティーナ赤坂コース(120分)/" +
  "支払い:現金・各種カード・電子マネー・QR決済(PayPay等)に幅広く対応/設備:喫煙可・Wi-Fi有・近隣にコインパーキング有(専用駐車場なし)/予約:ホットペッパー https://www.hotpepper.jp/strJ000670170/ /Instagram @cantinaakasaka";

const TOPICS = [
  "福岡・赤坂で大人が静かに飲めるバーの選び方",
  "ウイスキー初心者におすすめの一杯と楽しみ方",
  "赤坂で個室・貸切ができるお店をお探しの方へ",
  "仕事帰りに一人でも入りやすい赤坂のバー",
  "デートで使いたい福岡・赤坂の隠れ家バー",
  "山崎・響を味わう夜｜国産ウイスキーの魅力",
  "赤坂グルメ｜〆にラーメンや味噌汁まで楽しめるバー食堂",
  "ワインとおつまみで過ごす、赤坂のゆるやかな夜",
  "雨の日に立ち寄りたい、赤坂の落ち着いた一軒",
  "はじめてのバーで緊張しないための、気軽な過ごし方",
  "週末の予約はお早めに｜赤坂で過ごす特別な夜",
  "ブルースが似合う店で、静かにグラスを傾ける時間",
];

function dayOfYear(d) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / 86400000);
}

async function generateArticle(key, topicOverride) {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 3600 * 1000);
  const dateStr = jst.toISOString().slice(0, 10);
  const topic = topicOverride || TOPICS[dayOfYear(jst) % TOPICS.length];

  const SYSTEM =
    "あなたは福岡・赤坂のバー食堂『カンティーナ赤坂』のブログ編集者です。" +
    "地域の見込み客に読まれることを意識した、温かく上質な語り口のSEO記事を書きます。" +
    "事実のみを使い、創作しません。誇張や煽りは避け、読後にそっと来店したくなる文章に。\n【店舗情報】" + FACTS;

  const USER =
    `次のテーマで、600〜800字程度の日本語ブログ記事を1本書いてください。\nテーマ:「${topic}」\n` +
    `・地域キーワード(赤坂/福岡/ウイスキー等)を自然に含める\n・見出し(h3)を2つ程度\n・最後は予約や来店への穏やかな一言\n\n` +
    `出力は次の形式の**JSONのみ**(前後に説明やコードブロックを付けない):\n` +
    `{"title":"記事タイトル","excerpt":"120字程度の要約","tags":["タグ1","タグ2","タグ3"],"body":"<p>本文</p><h3>見出し</h3><p>...</p>"}`;

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 2000, system: SYSTEM, messages: [{ role: "user", content: USER }] }),
  });
  const data = await r.json();
  if (data.error) throw new Error(data.error.message || "Claude error");
  let text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
  text = text.replace(/^```(json)?/i, "").replace(/```$/i, "").trim();
  const a = JSON.parse(text);

  const rand = Math.random().toString(36).slice(2, 6);
  return {
    slug: dateStr + "-" + rand,
    title: a.title,
    date: dateStr,
    excerpt: a.excerpt || "",
    tags: a.tags || [],
    body: a.body || "",
  };
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  const adminPw = process.env.ADMIN_PASSWORD;
  const auth = req.headers.authorization || "";
  const bodyPw = (req.body && req.body.password) || "";
  const okCron = secret && auth === "Bearer " + secret;
  const okAdmin = adminPw && bodyPw === adminPw;
  if (!okCron && !okAdmin) return res.status(401).json({ error: "unauthorized" });

  const key = process.env.ANTHROPIC_API_KEY;
  const gh = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO || "getegeteakete/cancan";
  if (!key) return res.status(500).json({ error: "ANTHROPIC_API_KEY が未設定です。" });
  if (!gh) return res.status(500).json({ error: "GITHUB_TOKEN が未設定です（記事の保存に必要）。" });

  try {
    const topicOverride = (req.body && req.body.topic) || null;
    const art = await generateArticle(key, topicOverride);

    const base = "https://api.github.com/repos/" + repo + "/contents/";
    const ghHeaders = { Authorization: "Bearer " + gh, "User-Agent": "cantina-cron", Accept: "application/vnd.github+json" };

    // 既存ファイルのsha取得（新規時はundefined）
    async function getSha(path) {
      const r = await fetch(base + path, { headers: ghHeaders });
      if (!r.ok) return { sha: undefined, json: null };
      const j = await r.json();
      return { sha: j.sha, json: j };
    }
    // ファイルの作成/更新
    async function putFile(path, contentStr, message) {
      const { sha } = await getSha(path);
      const r = await fetch(base + path, {
        method: "PUT",
        headers: { ...ghHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ message, content: Buffer.from(contentStr).toString("base64"), sha }),
      });
      const d = await r.json();
      if (!d.commit) throw new Error((path + ": ") + (d.message || JSON.stringify(d)));
      return d;
    }

    // 1) posts.json を更新
    const cur = await getSha("blog/posts.json");
    let json = { posts: [] };
    if (cur.json && cur.json.content) json = JSON.parse(Buffer.from(cur.json.content, "base64").toString("utf8"));
    json.posts = json.posts || [];
    json.posts.unshift(art);
    json.posts = json.posts.slice(0, 90); // 直近90本を保持
    await putFile("blog/posts.json", JSON.stringify(json, null, 2), "blog: 自動記事 " + art.date + " " + art.title);

    // 2) 静的記事ページ & 3) サイトマップ（失敗しても記事公開自体は成功扱いに）
    const warnings = [];
    try {
      await putFile("blog/" + art.slug + "/index.html", articlePageHtml(art), "blog: 静的記事ページ " + art.slug);
    } catch (e) { warnings.push("static-page: " + String(e.message || e)); }
    try {
      await putFile("sitemap.xml", sitemapXml(json.posts, { today: art.date }), "seo: sitemap更新 " + art.date);
    } catch (e) { warnings.push("sitemap: " + String(e.message || e)); }

    return res.status(200).json({
      ok: true, slug: art.slug, title: art.title, date: art.date,
      url: "/blog/" + art.slug + "/",
      warnings: warnings.length ? warnings : undefined,
    });
  } catch (e) {
    return res.status(500).json({ error: "生成に失敗しました: " + String(e) });
  }
}
