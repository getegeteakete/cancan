// Vercel Cron / 手動公開 兼用 — 1日1記事の自動生成＆ブログ追加
// 必要な環境変数:
//   ANTHROPIC_API_KEY : Claude APIキー（生成に使用）
//   GITHUB_TOKEN      : リポジトリ書き込み権限のあるfine-grained PAT（記事の保存に使用）
//   GITHUB_REPO       : 省略時は getegeteakete/cancan
//   CRON_SECRET       : Vercel Cronの認証（Vercelが自動でBearer送信）
//   ADMIN_PASSWORD    : 管理画面から「今すぐ公開」する際の認証（任意）
//
// Vercel Cron は vercel.json の crons 設定で毎日呼び出されます。

const FACTS =
  "店名:カンティーナ赤坂(Cantina Akasaka)/福岡市中央区赤坂2-3-28/地下鉄「赤坂駅」2番出口 徒歩9分/" +
  "営業18:00〜翌0:00(L.O.23:30)/日曜・祝日定休(一部不定休)/ニューオーリンズ風の大人のバー食堂・ブルースが流れる隠れ家/" +
  "山崎12年・響・余市・マッカラン・ボウモア、ワイン、生ビール、カクテル/熟成牛ステーキ・カルボナーラ・チーズ盛合せ・締めのラーメンや味噌汁も/" +
  "40席・個室最大20名・貸切可/チャージ¥500/ディナー¥3,500〜 宴会¥5,000〜/予約:ホットペッパー https://www.hotpepper.jp/strJ000670170/ /Instagram @cantinaakasaka";

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

    const api = "https://api.github.com/repos/" + repo + "/contents/blog/posts.json";
    const ghHeaders = { Authorization: "Bearer " + gh, "User-Agent": "cantina-cron", Accept: "application/vnd.github+json" };

    const getR = await fetch(api, { headers: ghHeaders });
    const cur = await getR.json();
    let json = { posts: [] }, sha = undefined;
    if (cur && cur.content) {
      json = JSON.parse(Buffer.from(cur.content, "base64").toString("utf8"));
      sha = cur.sha;
    }
    json.posts = json.posts || [];
    json.posts.unshift(art);
    json.posts = json.posts.slice(0, 90); // 直近90本を保持

    const newContent = Buffer.from(JSON.stringify(json, null, 2)).toString("base64");
    const putR = await fetch(api, {
      method: "PUT",
      headers: { ...ghHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ message: "blog: 自動記事 " + art.date + " " + art.title, content: newContent, sha }),
    });
    const putData = await putR.json();
    if (putData.commit) return res.status(200).json({ ok: true, slug: art.slug, title: art.title, date: art.date });
    return res.status(500).json({ error: "GitHubへの保存に失敗しました。", detail: putData.message || putData });
  } catch (e) {
    return res.status(500).json({ error: "生成に失敗しました: " + String(e) });
  }
}
