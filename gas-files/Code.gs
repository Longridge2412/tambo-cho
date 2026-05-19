/**
 * Code.gs
 * 田んぼ帳 - API 本体
 *
 * フロントから POST されたリクエストを action ごとにディスパッチする。
 */

/**
 * POST エンドポイント。フロントから fetch される入口。
 * リクエスト body は text/plain で JSON 文字列を渡す前提(CORS 回避策)。
 */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const payload = body.payload || {};

    const result = dispatch(action, payload);
    return jsonResponse({ ok: true, data: result });

  } catch (err) {
    return jsonResponse({
      ok: false,
      error: err.message,
      stack: err.stack ? err.stack.split('\n').slice(0, 5).join('\n') : null
    });
  }
}

/**
 * GET でも疎通確認だけは返す(動作確認時に便利)。
 */
function doGet(e) {
  return jsonResponse({
    ok: true,
    data: { message: 'Tambo-cho GAS is alive.', version: APP_VERSION }
  });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * action 名で API をディスパッチ。
 */
function dispatch(action, payload) {
  switch (action) {
    case 'ping':              return apiPing();
    case 'initSchema':        return initializeSchema();
    case 'addMember':         return apiAddMember(payload);
    case 'listMembers':       return apiListMembers();
    case 'addVisit':          return apiAddVisit(payload);
    case 'listVisits':        return apiListVisits(payload);
    case 'addFacilityOp':     return apiAddFacilityOp(payload);
    case 'listFacilityOps':   return apiListFacilityOps(payload);
    case 'addNote':           return apiAddNote(payload);
    case 'listNotes':         return apiListNotes();
    case 'uploadPhoto':       return apiUploadPhoto(payload);
    case 'listDutyMaster':    return apiListDutyMaster();
    case 'listSeasonTargets': return apiListSeasonTargets();
    case 'getTodayContext':   return apiGetTodayContext();
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

// ─────────────────────────────────────────
// 基本API
// ─────────────────────────────────────────

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
  const sheet = ss.getSheetByName(SHEET_NAMES.MEMBERS);
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

function apiAddVisit(payload) {
  if (!payload.member_id) throw new Error('member_id is required');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.VISITS);
  const visit_id = generateId('v', sheet);
  const visited_at = payload.visited_at || new Date().toISOString();

  let photo_url = '';
  if (payload.photo_data_url) {
    const filename = `${formatDateForFile(visited_at)}_${payload.member_id}.jpg`;
    const uploaded = uploadDataUrlToDrive(payload.photo_data_url, filename, '見回り写真');
    photo_url = uploaded.url;
  }

  sheet.appendRow([
    visit_id,
    payload.member_id,
    visited_at,
    photo_url,
    payload.water_level_eval || '',
    payload.stream_status || '',
    payload.free_note || ''
  ]);

  return {
    visit_id, member_id: payload.member_id, visited_at,
    water_level_photo_url: photo_url,
    water_level_eval: payload.water_level_eval || '',
    stream_status: payload.stream_status || '',
    free_note: payload.free_note || ''
  };
}

function apiListVisits(payload) {
  const limit = (payload && payload.limit) || 20;
  const rows = readSheet(SHEET_NAMES.VISITS);
  rows.sort((a, b) => String(b.visited_at || '').localeCompare(String(a.visited_at || '')));
  return rows.slice(0, limit);
}

// ─────────────────────────────────────────
// 共用設備操作API
// ─────────────────────────────────────────

function apiAddFacilityOp(payload) {
  if (!payload.member_id) throw new Error('member_id is required');
  if (!payload.target) throw new Error('target is required');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.FACILITY_OPS);
  const op_id = generateId('f', sheet);
  const operated_at = payload.operated_at || new Date().toISOString();

  let photo_url = '';
  if (payload.photo_data_url) {
    const filename = `${formatDateForFile(operated_at)}_${payload.member_id}_${payload.target}.jpg`;
    const uploaded = uploadDataUrlToDrive(payload.photo_data_url, filename, '共用設備写真');
    photo_url = uploaded.url;
  }

  sheet.appendRow([
    op_id,
    payload.member_id,
    payload.target,
    payload.action || '',
    photo_url,
    operated_at,
    payload.reason || '',
    payload.coordination_note || '',
    payload.paired_op_id || ''
  ]);

  return {
    op_id, member_id: payload.member_id,
    target: payload.target, action: payload.action || '',
    photo_url, operated_at,
    reason: payload.reason || '',
    coordination_note: payload.coordination_note || '',
    paired_op_id: payload.paired_op_id || ''
  };
}

function apiListFacilityOps(payload) {
  const limit = (payload && payload.limit) || 20;
  const rows = readSheet(SHEET_NAMES.FACILITY_OPS);
  rows.sort((a, b) => String(b.operated_at || '').localeCompare(String(a.operated_at || '')));
  return rows.slice(0, limit);
}

// ─────────────────────────────────────────
// ノートAPI
// ─────────────────────────────────────────

function apiAddNote(payload) {
  if (!payload.content) throw new Error('content is required');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.NOTES);
  const note_id = generateId('n', sheet);
  const now = new Date().toISOString();
  sheet.appendRow([
    note_id,
    payload.content,
    payload.created_by || '',
    now,
    now,
    payload.pinned === true
  ]);
  return {
    note_id, content: payload.content,
    created_by: payload.created_by || '',
    created_at: now, updated_at: now,
    pinned: payload.pinned === true
  };
}

function apiListNotes() {
  const rows = readSheet(SHEET_NAMES.NOTES);
  rows.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return String(b.updated_at || '').localeCompare(String(a.updated_at || ''));
  });
  return rows;
}

// ─────────────────────────────────────────
// 画像アップロードAPI(単体テスト用)
// ─────────────────────────────────────────

function apiUploadPhoto(payload) {
  if (!payload.data_url) throw new Error('data_url is required');
  const filename = payload.filename || `upload_${Date.now()}.jpg`;
  return uploadDataUrlToDrive(payload.data_url, filename, '見回り写真');
}

// ─────────────────────────────────────────
// 内部ユーティリティ
// ─────────────────────────────────────────

/**
 * シートの全データを {header: value} の配列として返す。
 */
function readSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error(`Sheet not found: ${sheetName}`);
  const range = sheet.getDataRange();
  const values = range.getValues();
  if (values.length <= 1) return [];
  const headers = values[0];
  return values.slice(1).map(row => rowToObject(headers, row));
}

function rowToObject(headers, row) {
  const obj = {};
  headers.forEach((h, i) => { obj[h] = row[i]; });
  return obj;
}

/**
 * シート内で一意な ID を生成。prefix_001 形式。
 */
function generateId(prefix, sheet) {
  const lastRow = sheet.getLastRow();
  const seq = (lastRow === 0 ? 0 : lastRow - 1) + 1;
  return `${prefix}_${String(seq).padStart(3, '0')}`;
}

/**
 * Data URL を Drive にアップロード。
 */
function uploadDataUrlToDrive(dataUrl, filename, subFolderName) {
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) throw new Error('Invalid data URL');
  const mimeType = match[1];
  const base64 = match[2];

  const blob = Utilities.newBlob(
    Utilities.base64Decode(base64),
    mimeType,
    filename
  );

  const rootFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const yearFolder = getOrCreateSubFolder(rootFolder, String(new Date().getFullYear()) + '年');
  const targetFolder = getOrCreateSubFolder(yearFolder, subFolderName);

  const file = targetFolder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return { url: file.getUrl(), file_id: file.getId() };
}

function getOrCreateSubFolder(parentFolder, name) {
  const it = parentFolder.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parentFolder.createFolder(name);
}

function formatDateForFile(isoString) {
  const d = new Date(isoString);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

// ─────────────────────────────────────────
// Step 1 / Step 2 で追加された API
// ─────────────────────────────────────────

function apiListDutyMaster() {
  const rows = readSheet(SHEET_NAMES.DUTY_MASTER);
  const members = readSheet(SHEET_NAMES.MEMBERS);
  const memberMap = {};
  members.forEach(m => { memberMap[m.member_id] = m.display_name; });

  return rows.map(r => ({
    day_of_week: r.day_of_week,
    member_id: r.member_id,
    display_name: memberMap[r.member_id] || '?',
    slot: r.slot
  }));
}

function apiListSeasonTargets() {
  return readSheet(SHEET_NAMES.SEASON_TARGETS);
}

/**
 * ホーム画面用の今日のコンテキストを一括取得。
 * 1リクエストで済むようにまとめる(田んぼでの通信を減らす目的)。
 *
 * パフォーマンス最適化:
 * - 全シートを1回ずつだけ読む(readSheet の呼び出しを最小化)
 * - members を1回だけ読んでマップ化、複数箇所で再利用
 */
function apiGetTodayContext() {
  const now = new Date();
  const dayOfWeekMap = ['日', '月', '火', '水', '木', '金', '土'];
  const dayJp = dayOfWeekMap[now.getDay()];

  // 全シートを1回ずつだけ読む
  const members       = readSheet(SHEET_NAMES.MEMBERS);
  const dutyMaster    = readSheet(SHEET_NAMES.DUTY_MASTER);
  const seasonTargets = readSheet(SHEET_NAMES.SEASON_TARGETS);
  const visits        = readSheet(SHEET_NAMES.VISITS);
  const facilityOps   = readSheet(SHEET_NAMES.FACILITY_OPS);

  const memberMap = {};
  members.forEach(m => { memberMap[m.member_id] = m.display_name; });

  // 1. 本日の当番
  const todayDuty = dutyMaster
    .filter(r => r.day_of_week === dayJp)
    .map(r => ({ ...r, display_name: memberMap[r.member_id] || '?' }))
    .sort((a, b) => Number(a.slot) - Number(b.slot));

  // 2. 季節別目標
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const today_md = `${mm}-${dd}`;
  let target = null;
  for (const t of seasonTargets) {
    const startMd = toMd_(t.start_md);
    const endMd   = toMd_(t.end_md);
    if (isWithin(today_md, startMd, endMd)) {
      target = {
        target_label: t.target_label,
        period_label: t.period_label,
        description: t.description
      };
      break;
    }
  }

  // 3. 直近の見回り(新しい順、3件)
  const sortedVisits = visits.slice().sort((a, b) =>
    String(b.visited_at || '').localeCompare(String(a.visited_at || ''))
  );
  const recentVisits = sortedVisits.slice(0, 3).map(v => ({
    ...v,
    display_name: memberMap[v.member_id] || '?'
  }));

  // 4. 未完了の堤(開けたまま閉めていない)
  const pairedSet = {};
  facilityOps.forEach(o => {
    if (o.target === '堤' && o.action === '閉めた' && o.paired_op_id) {
      pairedSet[o.paired_op_id] = true;
    }
  });
  const pendingTsutsumi = facilityOps
    .filter(o => o.target === '堤' && o.action === '開けた' && !pairedSet[o.op_id])
    .map(o => ({ ...o, display_name: memberMap[o.member_id] || '?' }))
    .sort((a, b) => String(b.operated_at || '').localeCompare(String(a.operated_at || '')));

  // 5. 共用設備の動き(直近2件)
  const recentFacilityOps = facilityOps
    .slice()
    .sort((a, b) => String(b.operated_at || '').localeCompare(String(a.operated_at || '')))
    .slice(0, 2)
    .map(o => ({ ...o, display_name: memberMap[o.member_id] || '?' }));

  return {
    today: {
      date_iso: now.toISOString(),
      day_of_week: dayJp,
      today_duty: todayDuty
    },
    target: target,
    latest_visit: recentVisits[0] || null,
    recent_visits: recentVisits,
    pending_tsutsumi: pendingTsutsumi,
    recent_facility_ops: recentFacilityOps
  };
}

/**
 * MM-DD 形式の3つの値を比較し、today が start..end の期間内かを判定。
 * 期間が年をまたぐケース(例: 12-15 から 01-15)にも対応。
 */
function isWithin(today_md, start_md, end_md) {
  if (start_md <= end_md) {
    return start_md <= today_md && today_md <= end_md;
  }
  return today_md >= start_md || today_md <= end_md;
}

/**
 * Date オブジェクトまたは文字列を "MM-DD" 形式に正規化。
 */
function toMd_(value) {
  if (value instanceof Date) {
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${m}-${d}`;
  }
  if (value == null) return '';
  return String(value);
}
