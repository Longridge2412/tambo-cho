/**
 * Api_Members.gs — Members + Ping + Photo Upload
 */

function apiPing() {
  return {
    message: 'pong',
    time: new Date().toISOString(),
    version: APP_VERSION
  };
}

// ─────────────────────────────────────────
// メンバーAPI
// ─────────────────────────────────────────

function apiAddMember(payload) {
  if (!payload.display_name) throw new Error('display_name is required');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = _findSheet(SHEET_NAMES.MEMBERS);
  const member_id = generateId('m', sheet);
  const joined_at = new Date().toISOString();
  sheet.appendRow([member_id, payload.display_name, joined_at]);
  return { member_id, display_name: payload.display_name, joined_at };
}

function apiListMembers() {
  return readSheet(SHEET_NAMES.MEMBERS);
}

// ─────────────────────────────────────────
// 見回り記録API
// ─────────────────────────────────────────

/**
 * 写真1枚だけを Drive に上げて URL を返す。
 *
 * 共有フォームはこの API で写真を先に送り、addPost には URL だけを渡す。
 * 1回の通信を小さく保つことで、電波の弱い場所でのタイムアウトを減らす。
 */
function apiUploadPhoto(payload) {
  if (!payload.data_url) throw new Error('data_url is required');
  const filename = payload.filename || `upload_${Date.now()}.jpg`;
  const folder = payload.folder || '見回り写真';
  return uploadDataUrlToDrive(payload.data_url, filename, folder);
}

// ─────────────────────────────────────────
// 内部ユーティリティ
// ─────────────────────────────────────────

/**
 * シートの全データを {header: value} の配列として返す。
 */
