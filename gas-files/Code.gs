/**
 * Code.gs
 * 田んぼ帳 Step 0 - API 本体
 *
 * フロントから POST されたリクエストを action ごとにディスパッチする。
 * Step 0 では当番関連 API は未実装(スキーマだけ用意)。
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
    // ── Step 1 で追加 ──
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

  // 画像アップロード(あれば)
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
  // 新しい順に
  rows.sort((a, b) => (b.visited_at || '').localeCompare(a.visited_at || ''));
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
  rows.sort((a, b) => (b.operated_at || '').localeCompare(a.operated_at || ''));
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
  // ピン留めを上、その後は更新日の新しい順
  rows.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return (b.updated_at || '').localeCompare(a.updated_at || '');
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

/**
 * シート内で一意な ID を生成。prefix_001 形式。
 * シートの既存行数 + 1 を連番として使う(簡易実装、十分な衝突回避)。
 */
function generateId(prefix, sheet) {
  const lastRow = sheet.getLastRow();
  // ヘッダー1行を引いた行数 + 1
  const seq = (lastRow === 0 ? 0 : lastRow - 1) + 1;
  return `${prefix}_${String(seq).padStart(3, '0')}`;
}

/**
 * Data URL を Drive にアップロード。
 * 年フォルダ・サブフォルダ(見回り写真 / 共用設備写真)に振り分ける。
 *
 * @param {string} dataUrl - "data:image/jpeg;base64,..."
 * @param {string} filename - 保存ファイル名
 * @param {string} subFolderName - "見回り写真" | "共用設備写真"
 * @returns {object} { url, file_id }
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

/**
 * 指定フォルダ内のサブフォルダを取得、なければ作成。
 */
function getOrCreateSubFolder(parentFolder, name) {
  const it = parentFolder.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parentFolder.createFolder(name);
}

/**
 * ISO文字列から YYYYMMDD_HHMM 形式に変換。
 */
function formatDateForFile(isoString) {
  const d = new Date(isoString);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}


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

/**
 * 季節別目標水位の取得。
 */
function apiListSeasonTargets() {
  return readSheet(SHEET_NAMES.SEASON_TARGETS);
}

/**
 * ホーム画面用の今日のコンテキストを一括取得。
 * 1リクエストで済むようにまとめる(田んぼでの通信を減らす目的)。
 *
 * @returns {object} {
 *   today: {date, day_of_week, today_duty: [...members]},
 *   target: {target_label, period_label, description} | null,
 *   latest_visit: {...} | null,
 *   recent_visits: [...] (3件),
 *   pending_tsutsumi: [...] (未完了の堤 開けた、新しい順),
 *   recent_facility_ops: [...] (直近の共用設備操作 2件)
 * }
 */
function apiGetTodayContext() {
  const now = new Date();
  const dayOfWeekMap = ['日', '月', '火', '水', '木', '金', '土'];
  const dayJp = dayOfWeekMap[now.getDay()];

  // 1. 本日の当番
  const dutyRows = apiListDutyMaster();
  const todayDuty = dutyRows
    .filter(r => r.day_of_week === dayJp)
    .sort((a, b) => Number(a.slot) - Number(b.slot));

  // 2. 季節別目標水位の判定(今日が属する期間)
  const targets = apiListSeasonTargets();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const today_md = `${mm}-${dd}`;

  let target = null;
  for (const t of targets) {
    // Sheets で日付セルとして入力されると start_md / end_md は Date オブジェクトで返ってくる。
    // 文字列(MM-DD)と Date のどちらでも比較できるように正規化する。
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

  // 3. 直近の見回り記録
  const visits = apiListVisits({ limit: 3 });
  const members = readSheet(SHEET_NAMES.MEMBERS);
  const memberMap = {};
  members.forEach(m => { memberMap[m.member_id] = m.display_name; });

  // 訪問者名を付与
  const visitsWithName = visits.map(v => ({
    ...v,
    display_name: memberMap[v.member_id] || '?'
  }));

  // 4. 未完了の堤(開けたまま閉めていない)
  //    + 直近の共用設備操作 2件
  const allOps = readSheet(SHEET_NAMES.FACILITY_OPS);
  const pairedSet = {};
  allOps.forEach(o => {
    if (o.target === '堤' && o.action === '閉めた' && o.paired_op_id) {
      pairedSet[o.paired_op_id] = true;
    }
  });
  const pendingTsutsumi = allOps
    .filter(o => o.target === '堤' && o.action === '開けた' && !pairedSet[o.op_id])
    .map(o => ({ ...o, display_name: memberMap[o.member_id] || '?' }))
    .sort((a, b) => String(b.operated_at || '').localeCompare(String(a.operated_at || '')));

  const recentFacilityOps = allOps
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
    latest_visit: visitsWithName[0] || null