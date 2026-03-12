/**
 * date-utils.js - 日付操作ユーティリティ
 *
 * ES Modulesパターンで日付関連の共通処理を提供
 */

// ========================================
// 日付フォーマット
// ========================================

/**
 * 日付を日本語形式でフォーマット
 * @param {Date|string} date - 日付オブジェクトまたはISO文字列
 * @returns {string} フォーマットされた日付文字列（例: 2025年10月25日）
 */
export function formatDateJa(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '不明な日付';

  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();

  return `${year}年${month}月${day}日`;
}

/**
 * 日付と時刻を日本語形式でフォーマット
 * @param {Date|string} date - 日付オブジェクトまたはISO文字列
 * @returns {string} フォーマットされた日時文字列（例: 2025/10/25 14:30）
 */
export function formatDateTime(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '不明な日時';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

/**
 * 時刻のみをフォーマット
 * @param {Date|string} date - 日付オブジェクトまたはISO文字列
 * @returns {string} フォーマットされた時刻文字列（例: 14:30）
 */
export function formatTime(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '--:--';

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

/**
 * 相対時間を取得（例: 2時間前、3日後）
 * @param {Date|string} date - 日付オブジェクトまたはISO文字列
 * @returns {string} 相対時間文字列
 */
export function getRelativeTime(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '不明';

  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffSec = Math.floor(Math.abs(diffMs) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  const isPast = diffMs < 0;

  if (diffSec < 60) {
    return isPast ? 'たった今' : 'まもなく';
  } else if (diffMin < 60) {
    return isPast ? `${diffMin}分前` : `${diffMin}分後`;
  } else if (diffHour < 24) {
    return isPast ? `${diffHour}時間前` : `${diffHour}時間後`;
  } else if (diffDay < 7) {
    return isPast ? `${diffDay}日前` : `${diffDay}日後`;
  } else {
    return formatDateTime(date);
  }
}

// ========================================
// 日付操作
// ========================================

/**
 * 明日の日付を取得
 * @returns {Date} 明日の日付
 */
export function getTomorrow() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

/**
 * N日後の日付を取得
 * @param {number} days - 日数
 * @returns {Date} N日後の日付
 */
export function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * 日付をYYYY-MM-DD形式の文字列に変換
 * @param {Date} date - 日付オブジェクト
 * @returns {string} YYYY-MM-DD形式の文字列
 */
export function toDateString(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * 日付をHH:MM形式の文字列に変換
 * @param {Date} date - 日付オブジェクト
 * @returns {string} HH:MM形式の文字列
 */
export function toTimeString(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '10:00';

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

// ========================================
// 日付バリデーション
// ========================================

/**
 * 日付が過去かどうかチェック
 * @param {Date|string} date - 日付オブジェクトまたはISO文字列
 * @returns {boolean} 過去ならtrue
 */
export function isPast(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return false;

  return d.getTime() < Date.now();
}

/**
 * 日付が未来かどうかチェック
 * @param {Date|string} date - 日付オブジェクトまたはISO文字列
 * @returns {boolean} 未来ならtrue
 */
export function isFuture(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return false;

  return d.getTime() > Date.now();
}

/**
 * 日付が今日かどうかチェック
 * @param {Date|string} date - 日付オブジェクトまたはISO文字列
 * @returns {boolean} 今日ならtrue
 */
export function isToday(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return false;

  const today = new Date();
  return d.getFullYear() === today.getFullYear() &&
         d.getMonth() === today.getMonth() &&
         d.getDate() === today.getDate();
}

// ========================================
// タイムゾーン変換
// ========================================

/**
 * UTC時刻をJST（日本標準時）に変換
 * @param {Date|string} utcDate - UTC日時
 * @returns {Date} JST日時
 */
export function utcToJst(utcDate) {
  const d = new Date(utcDate);
  if (isNaN(d.getTime())) return new Date();

  // UTC+9時間
  const jstOffset = 9 * 60 * 60 * 1000;
  return new Date(d.getTime() + jstOffset);
}

/**
 * JST（日本標準時）をUTCに変換
 * @param {Date} jstDate - JST日時
 * @returns {Date} UTC日時
 */
export function jstToUtc(jstDate) {
  const d = new Date(jstDate);
  if (isNaN(d.getTime())) return new Date();

  // UTC+9時間を引く
  const jstOffset = 9 * 60 * 60 * 1000;
  return new Date(d.getTime() - jstOffset);
}
