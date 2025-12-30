/**
 * DateをISO 8601形式の文字列に変換
 */
export function formatToISOString(date: Date): string {
  return date.toISOString();
}

/**
 * 今日の開始時刻を取得（JST）
 */
export function getTodayStart(): Date {
  const now = new Date();
  const jstOffset = 9 * 60; // JST is UTC+9
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const jst = new Date(utc + jstOffset * 60000);
  jst.setHours(0, 0, 0, 0);
  return jst;
}

/**
 * 今日の終了時刻を取得（JST）
 */
export function getTodayEnd(): Date {
  const todayStart = getTodayStart();
  todayStart.setHours(23, 59, 59, 999);
  return todayStart;
}
