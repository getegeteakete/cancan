// Vercel Serverless Function — Claude搭載AIコンシェルジュ（本番用・任意）
// 有効化手順:
//  1) Vercel の Project → Settings → Environment Variables に
//     ANTHROPIC_API_KEY を追加（https://console.anthropic.com で取得）
//  2) index.html 内の  var CONCIERGE_API = null;  を  "/api/concierge"  に変更
//  3) 再デプロイ。未設定の間はサイトのルールベース回答が使われます。

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(200).json({ reply: null }); // フロント側がルール回答にフォールバック

  const message = (req.body && req.body.message ? String(req.body.message) : "").slice(0, 500);

  const SYSTEM = [
    "あなたは福岡市中央区赤坂のバー食堂『カンティーナ赤坂』の予約コンシェルジュです。",
    "丁寧で簡潔な日本語（2〜3文）で答え、必ず来店・予約につながるよう案内します。",
    "事実: 営業18:00〜翌0:00(L.O.23:30)/日曜・祝日定休(一部不定休)/住所 福岡市中央区赤坂2-3-28/",
    "赤坂駅2番出口 徒歩9分/40席・個室最大20名・貸切可/チャージ¥500/ディナー¥3,500〜 宴会¥5,000〜/",
    "ウイスキー(山崎12年・響・余市・マッカラン等)・ワイン・手作り料理。",
    "予約はホットペッパー https://www.hotpepper.jp/strJ000670170/ 、Instagram @cantinaakasaka。",
    "分からない事は店頭確認を促す。知らない事実を創作しない。"
  ].join("");

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 400,
        system: SYSTEM,
        messages: [{ role: "user", content: message }]
      })
    });
    const data = await r.json();
    const reply = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
    return res.status(200).json({ reply: reply || null });
  } catch (e) {
    return res.status(200).json({ reply: null });
  }
}
