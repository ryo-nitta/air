document.addEventListener("DOMContentLoaded", async () => {
  const dateInput = document.querySelector("input[name='date']");
  const timeSelect = document.getElementById("startTime");
  const menuSelect = document.querySelector("select[name='menu']");

  let reserved = [];

  // --- 予約済みデータ取得 ---
  try {
    const res = await fetch("/reserved-slots");
    reserved = await res.json();
  } catch (err) {
    console.error("予約取得失敗", err);
  }

  // --- 時刻文字列をDateに変換する関数 ---
  function parseTime(date, timeStr) {
    const [h, m] = timeStr.split(':');
    const d = new Date(date);
    d.setHours(Number(h), Number(m), 0, 0);
    return d;
  }

  // --- 開始時刻オプションを無効化する ---
  function disableTimes() {
    const selectedDate = dateInput.value;
    const duration = menuSelect.value === "1" ? 90 : 120; // 分

    Array.from(timeSelect.options).forEach(opt => opt.disabled = false);

    reserved.forEach(slot => {
      if (slot.date === selectedDate) {
        const slotStart = parseTime(slot.date, slot.start);
        const slotEnd   = parseTime(slot.date, slot.end);

        Array.from(timeSelect.options).forEach(opt => {
          const optStart = parseTime(selectedDate, opt.value);
          const optEnd   = new Date(optStart.getTime() + duration * 60000);

          // 開始〜終了が予約と重なっていたら無効化
          if (optStart < slotEnd && optEnd > slotStart) {
            opt.disabled = true;
          }
        });
      }
    });
  }

  // 日付変更・メニュー変更で判定
  dateInput.addEventListener("change", disableTimes);
  menuSelect.addEventListener("change", disableTimes);
});
