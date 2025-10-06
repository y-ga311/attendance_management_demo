/**
 * 日本時間（JST）の日時を取得するユーティリティ関数
 */

/**
 * 現在の日本時間を日本語形式で取得（データベース保存用）
 * @returns 日本時間の日本語文字列（例: "2025年10月6日00時05分04秒"）
 */
export function getJSTISOString(): string {
  const now = new Date();
  // 日本時間で日本語形式の文字列を生成
  const japaneseTime = now.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  // 2025/10/6 0:07:47 → 2025年10月6日00時07分47秒 に変換
  const parts = japaneseTime.split(' ');
  const datePart = parts[0]; // 2025/10/6
  const timePart = parts[1]; // 0:07:47
  
  const dateComponents = datePart.split('/');
  const timeComponents = timePart.split(':');
  
  const year = dateComponents[0];
  const month = dateComponents[1];
  const day = dateComponents[2];
  const hour = timeComponents[0].padStart(2, '0');
  const minute = timeComponents[1];
  const second = timeComponents[2];
  
  return `${year}年${month}月${day}日${hour}時${minute}分${second}秒`;
}

/**
 * 現在の日本時間をDateオブジェクトで取得
 * @returns 日本時間のDateオブジェクト
 */
export function getJSTDate(): Date {
  const now = new Date();
  // 日本時間の文字列からDateオブジェクトを作成
  const jstString = now.toLocaleString('sv-SE', { timeZone: 'Asia/Tokyo' });
  return new Date(jstString + '+09:00');
}

/**
 * 現在の日本時間をYYYY-MM-DD形式で取得
 * @returns 日本時間の日付文字列（例: "2024-01-01"）
 */
export function getJSTDateString(): string {
  const now = new Date();
  return now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
}

/**
 * 現在の日本時間をHH:MM:SS形式で取得
 * @returns 日本時間の時刻文字列（例: "12:00:00"）
 */
export function getJSTTimeString(): string {
  const now = new Date();
  return now.toLocaleTimeString('sv-SE', { timeZone: 'Asia/Tokyo' });
}

/**
 * 現在の日本時間を日本語形式で取得
 * @returns 日本時間の日本語文字列（例: "2024年1月1日 12:00:00"）
 */
export function getJSTJapaneseString(): string {
  const now = new Date();
  return now.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * 日本語形式の時刻文字列をDateオブジェクトに変換
 * @param japaneseTimeString 日本語形式の時刻文字列（例: "2025年10月06日00時08分49秒"）
 * @returns Dateオブジェクト
 */
export function parseJapaneseTimeString(japaneseTimeString: string): Date {
  // 2025年10月06日00時08分49秒 → 2025-10-06T00:08:49+09:00 に変換
  const match = japaneseTimeString.match(/(\d{4})年(\d{1,2})月(\d{1,2})日(\d{1,2})時(\d{1,2})分(\d{1,2})秒/);
  
  if (!match) {
    throw new Error(`Invalid Japanese time format: ${japaneseTimeString}`);
  }
  
  const [, year, month, day, hour, minute, second] = match;
  
  // ゼロパディング
  const paddedMonth = month.padStart(2, '0');
  const paddedDay = day.padStart(2, '0');
  const paddedHour = hour.padStart(2, '0');
  const paddedMinute = minute.padStart(2, '0');
  const paddedSecond = second.padStart(2, '0');
  
  // ISO形式に変換してDateオブジェクトを作成
  const isoString = `${year}-${paddedMonth}-${paddedDay}T${paddedHour}:${paddedMinute}:${paddedSecond}+09:00`;
  return new Date(isoString);
}
