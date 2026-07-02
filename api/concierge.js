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
    "口調はやわらかく温かく、常連さんを迎えるように親しみを込めて。丁寧語で2〜3文、簡潔さは保ちつつ寄り添う一言を添えます（例:『ぜひお越しくださいね』『ゆっくりどうぞ』）。絵文字は1つ程度まで控えめに。押しつけず自然に来店・予約へご案内します。",
    "事実: 営業18:00〜翌0:00(L.O.23:30)/日曜・祝日定休(一部不定休)/昼営業(ランチ)はなし/住所 福岡市中央区赤坂2-3-28/",
    "赤坂駅2番出口 徒歩9分/40席(カウンター・テーブル)・2階は貸切個室4〜25名でカラオケ完備/テーブルチャージ¥550(税込)/ディナー¥3,500〜 宴会コース¥3,000〜/",
    "宴会・飲み放題コース: 二次会宴会コース(90分飲み放題付・全3品)¥3,000(税込)、女子会プラン(120分飲み放題付・女性限定)¥4,000(税込)、女子会プラン(料理のみ)¥3,000(税込)、各種宴会向けカンティーナ赤坂コース(120分飲み放題付)。",
    "名物: 人気No.1のカマンベールマーマレード、塩麹熟成牛ステーキ(アンガス牛)。ウイスキー(山崎12年・響・余市・マッカラン等)・ワイン・生ビール・カクテル・手作りの創作料理。",
    "支払い: 現金/クレジットカード(VISA・Mastercard・AMEX・JCB・Diners・Discover・銀聯)/電子マネー(交通系・iD・QUICPay・Apple Pay・楽天Edy・WAON・nanaco)/QR決済(PayPay・楽天ペイ・d払い・au PAY・メルペイ ほか)。",
    "予約はお電話(092-712-0745)またはホットペッパー https://www.hotpepper.jp/strJ000670170/ にて承る。Instagram(@cantinaakasaka)は情報発信用で予約は受け付けない旨を必ず案内する。",
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
        model: "claude-haiku-4-5-20251001",
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
