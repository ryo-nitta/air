require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { google } = require('googleapis');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Google Sheets 認証（環境変数から JSON を読み込み）
const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const SPREADSHEET_ID = process.env.SHEET_ID;

// 予約フォーム受信処理
app.post('/reserve', async (req, res) => {
  const { name, email, phone, address, date, startTime, menu, message } = req.body;

  // 必須項目チェック
  if (!name || !email || !phone || !address || !date || !startTime || !menu) {
    return res.status(400).send("必須項目が未入力です。");
  }

  // メニュー時間設定
  const menuDurations = { "1": 90, "2": 120 };
  const duration = menuDurations[menu] || 0;

  // 開始・終了時間計算
  const start = new Date(`${date}T${startTime}`);
  const end = new Date(start.getTime() + duration * 60000);
  const endTime = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;

  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    // 既存予約の重複チェック
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "'シート1'!E:G", // E=日付, F=開始, G=終了
    });

    const rows = result.data.values || [];
    const overlap = rows.slice(1).some(r => {
      if (!r[0]) return false; // 空行は無視
      if (r[0] !== date) return false;

      const reservedStart = new Date(`${r[0]}T${r[1]}`);
      const reservedEnd = new Date(`${r[0]}T${r[2]}`);
      return (start < reservedEnd && end > reservedStart);
    });

    if (overlap) {
      return res.status(400).send(`
        <h2>この時間帯はすでに予約済みです。別の時間を選択してください。</h2>
        <button onclick="history.back()">戻る</button>
      `);
    }

    // メニュー内容
    const menuText = menu === "1" ? "エアコン1台（90分）" : "エアコン2台（120分）";

    // スプレッドシートに追加
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "'シート1'!A:I",
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[name, email, phone, address, date, startTime, endTime, menuText, message || ""]]
      }
    });

    // 成功メッセージ（メール送信なし）
    res.send(`
      <h2>予約が完了しました。</h2>
      <p>ご予約内容が登録されました。</p>
      <button onclick="history.back()">戻る</button>
    `);

  } catch (err) {
    console.error('予約処理エラー:', err);
    res.status(500).send("予約処理でエラーが発生しました。");
  }
});

// 予約済みスロット取得API
app.get('/reserved-slots', async (req, res) => {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "'シート1'!E:G",
    });

    const rows = result.data.values || [];
    const slots = rows.slice(1)
      .filter(r => r[0] && r[1] && r[2])
      .map(r => ({
        date: r[0],
        start: r[1].slice(0, 5),
        end: r[2].slice(0, 5)
      }));

    res.json(slots);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

// ポート設定
const PORT = process.env.PORT || 3018;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
