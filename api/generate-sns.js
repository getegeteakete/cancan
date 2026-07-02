// Vercel Serverless Function — SNS宣伝記事ジェネレーター（Claude搭載）
// 必要な環境変数（Vercel → Settings → Environment Variables）:
//   ANTHROPIC_API_KEY : Claude APIキー（sk-ant-...）※コンシェルジュと共通
//   ADMIN_PASSWORD    : 管理画面のパスワード（任意の文字列）※コスト保護のため必須

const FACTS = [
  "店名: カンティーナ赤坂 (Cantina Akasaka)",
  "所在地: 福岡市中央区赤坂2-3-28 / 地下鉄「赤坂駅」2番出口 徒歩9分",
  "営業: 18:00〜翌0:00 (L.O.23:30) / 日曜・祝日定休(一部不定休) / 昼営業(ランチ)はなし",
  "特徴: ニューオーリンズ風の大人のバー食堂。ブルースが流れる隠れ家。",
  "酒: 山崎12年・響 Japanese Harmony・余市・マッカラン・ボウモア、ワイン、生ビール、カクテル",
  "名物・料理: 人気No.1のカマンベールマーマレード、塩麹熟成牛ステーキ(アンガス牛)、カルボナーラ、チーズ盛合せ、アヒージョ、玉子焼、締めのラーメンや味噌汁も",
  "席: 40席(カウンター・テーブル) / 2階は貸切個室4〜25名・カラオケ完備 / テーブルチャージ¥550(税込) / ディナー¥3,500〜 宴会コース¥3,000〜",
  "宴会コース: 二次会宴会コース(90分飲み放題付・全3品)¥3,000、女子会プラン(120分飲み放題付・女性限定)¥4,000、女子会プラン(料理のみ)¥3,000、各種宴会向けカンティーナ赤坂コース(120分飲み放題付)",
  "支払い: 現金・各種カード・電子マネー・QR決済(PayPay等)に幅広く対応",
  "設備: 喫煙可 / Wi-Fi有 / 専用駐車場なし(近隣にコインパーキング有)",
  "予約: お電話 092-712-0745 または ホットペッパーグルメ https://www.hotpepper.jp/strJ000670170/（Instagramでは予約を受け付けていない）",
  "Instagram: @cantinaakasaka（情報発信用）",
].join("\n");

const PLATFORM_GUIDE = {
  instagram:
    "Instagram投稿。本文は3〜5文で情景が浮かぶ描写＋来店を誘う一言。絵文字を程よく(3〜6個)。" +
    "最後にハッシュタグを10〜14個(例:#福岡グルメ #赤坂バー #福岡ディナー #福岡ウイスキー #福岡飲み #赤坂グルメ など、地域と業態を混ぜる)。",
  x:
    "X(旧Twitter)投稿。全角140字以内で簡潔にインパクト重視。絵文字は1〜2個。" +
    "ハッシュタグは2〜3個。予約や来店を促す短いCTAを入れる。140字を厳守。",
  line:
    "LINE公式アカウントの配信文。友だちに語りかける親しみやすい口調。3〜4文。" +
    "今週のおすすめや予約案内など、開封したくなる件名的な一言から始める。絵文字は控えめ。",
  google:
    "Googleビジネスプロフィールの『最新情報』投稿。100〜300字。店の魅力を簡潔に伝え、" +
    "最後に『ご予約はこちら』等の明確なCTA。ハッシュタグは不要。誠実で信頼感のある文体。",
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "ANTHROPIC_API_KEY が未設定です。" });

  const adminPw = process.env.ADMIN_PASSWORD;
  if (!adminPw)
    return res.status(500).json({ error: "ADMIN_PASSWORD が未設定です。Vercelの環境変数に追加してください（管理画面の保護に必要）。" });

  const { platform, topic, tone, count, password, examples, knowledge } = req.body || {};
  if (password !== adminPw) return res.status(401).json({ error: "パスワードが違います。" });

  const guide = PLATFORM_GUIDE[platform];
  if (!guide) return res.status(400).json({ error: "platform が不正です。" });

  const n = Math.min(Math.max(parseInt(count) || 3, 1), 5);
  const toneText = tone || "落ち着いた大人の雰囲気";
  const theme = (topic || "お店の魅力を伝える宣伝").slice(0, 300);

  const kb = (knowledge || "").toString().slice(0, 1200).trim();
  const wins = Array.isArray(examples) ? examples.slice(-6).map(function (s) { return String(s).slice(0, 400); }) : [];

  const SYSTEM =
    "あなたは飲食店専門の敏腕SNSマーケターです。担当は福岡・赤坂のバー食堂『カンティーナ赤坂』。" +
    "目的は保存・シェア・来店につながる、思わず反応したくなる投稿を作ること。以下を徹底します:\n" +
    "1) 最初の一文は強いフック(問いかけ/意外な事実/情景/共感)で続きを読ませる。\n" +
    "2) 読み手の得(こんな時に使える/こんな気分に効く)を具体的に描き、保存したくなる情報を1つ入れる。\n" +
    "3) 押し売りせず、世界観(大人・上質・ニューオーリンズ/ブルース・琥珀色の灯り)で惹きつける。\n" +
    "4) 最後は自然で明確なCTA。予約はお電話(092-712-0745)かホットペッパーのみ、Instagramは予約不可と分かる形で(くどくならない範囲で)。\n" +
    "5) 事実のみ使用し、割引・在庫など未確認情報は創作しない。誇大・嘘・過度な煽りは禁止。\n" +
    "6) 各案は切り口(フックの型)を変え、似通わせない。\n\n" +
    "【店舗情報(事実)】\n" + FACTS +
    (kb ? "\n\n【お店の最新情報・メモ(最優先で活用)】\n" + kb : "") +
    (wins.length ? "\n\n【過去に好評だった投稿(トーンと型のお手本。丸写しはしない)】\n- " + wins.join("\n- ") : "");

  const USER =
    `次の条件で、エンゲージメントを最大化する投稿を${n}案。互いに切り口を変えてください。\n` +
    `・プラットフォーム: ${platform}\n・作成方針: ${guide}\n` +
    `・テーマ/ネタ: ${theme}\n・トーン: ${toneText}\n` +
    (kb ? `・「最新情報・メモ」があれば必ず織り込む\n` : ``) +
    `\n出力は次の形式の**JSONのみ**(前後に説明やコードブロックを付けない):\n` +
    `{"posts":[{"caption":"本文","hashtags":["#タグ1","#タグ2"]}]}\n` +
    `hashtagsが不要なプラットフォームでは空配列にしてください。`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system: SYSTEM,
        messages: [{ role: "user", content: USER }],
      }),
    });
    const data = await r.json();
    if (data.error) return res.status(502).json({ error: "Claude: " + (data.error.message || "エラー") });

    // Haiku 4.5 料金: 入力 $1 / 出力 $5 per 100万トークン
    const u = data.usage || {};
    const inTok = u.input_tokens || 0, outTok = u.output_tokens || 0;
    const cost = inTok * (1.0 / 1e6) + outTok * (5.0 / 1e6); // USD
    const usage = { input: inTok, output: outTok, cost_usd: cost };

    let text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    text = text.replace(/^```(json)?/i, "").replace(/```$/i, "").trim();

    let parsed;
    try { parsed = JSON.parse(text); }
    catch (e) {
      return res.status(200).json({ posts: [{ caption: text, hashtags: [] }], usage });
    }
    return res.status(200).json({ posts: parsed.posts || [], usage });
  } catch (e) {
    return res.status(500).json({ error: "生成に失敗しました: " + String(e) });
  }
}
