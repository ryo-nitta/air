// test-sheets.js
const { google } = require('googleapis');
require('dotenv').config();

async function testWrite() {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'my-project-22n-2eb41c12c470.json', // サービスアカウントJSON
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const SPREADSHEET_ID = process.env.SHEET_ID;

    // 7列分のテストデータ
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'A:G',  // 7列分
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          'テスト名前',        // A
          'test@example.com',   // B
          '2025-09-03',         // C
          '11:00',              // D: 開始時刻
          '12:30',              // E: 終了時刻
          '1',                  // F: メニュー
          'テストメッセージ'    // G
        ]]
      }
    });

    console.log("書き込み成功！", response.data);
  } catch (error) {
    console.error("Google Sheets API error full object:", error);
    console.error("Google Sheets API error message:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
  }
}

testWrite();
