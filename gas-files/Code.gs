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
    case 'listDutyWeek':      return apiListDutyWeek(payload);
    case 'updateDutyWeek':    return apiUpdateDutyWeek(payload);
    case 'listDutySwaps':     return apiListDutySwaps();
    case 'addDutySwap':       return apiAddDutySwap(payload);
    case 'acceptDutySwap':    return apiAcceptDutySwap(payload);
    case 'updateDutyMaster':  return apiUpdateDutyMaster(payload);
    case 'listPaddyPhenology':   return apiListPaddyPhenology();
    case 'updatePaddyPhenology': return apiUpdatePaddyPhenology(payload);
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

  // 田んぼ1(3畝)の写真
  let photo_url = '';
  if (payload.photo_data_url) {
    const filename = `${formatDateForFile(visited_at)}_${payload.member_id}_3se.jpg`;
    photo_url = uploadDataUrlToDrive(payload.photo_data_url, filename, '見回り写真').url;
  }
  // 田んぼ2(1反)の写真
  let photo_url_2 = '';
  if (payload.field2_photo_data_url) {
    const filename = `${formatDateForFile(visited_at)}_${payload.member_id}_1tan.jpg`;
    photo_url_2 = uploadDataUrlToDrive(payload.field2_photo_data_url, filename, '見回り写真').url;
  }

  sheet.appendRow([
    visit_id,
    payload.member_id,
    visited_at,
    photo_url,
    payload.water_level_eval || '',
    payload.stream_status || '',
    payload.free_note || '',
    photo_url_2,
    payload.field2_eval || ''
  ]);

  return {
    visit_id, member_id: payload.member_id, visited_at,
    water_level_photo_url: photo_url,
    water_level_eval: payload.water_level_eval || '',
    stream_status: payload.stream_status || '',
    free_note: payload.free_note || '',
    field2_photo_url: photo_url_2,
    field2_eval: payload.field2_eval || ''
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
  const tomorrowJp = dayOfWeekMap[(now.getDay() + 1) % 7];

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

  // 1.5. 明日の当番
  const tomorrowDuty = dutyMaster
    .filter(r => r.day_of_week === tomorrowJp)
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
      today_duty: todayDuty,
      tomorrow_day_of_week: tomorrowJp,
      tomorrow_duty: tomorrowDuty
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

// ─────────────────────────────────────────
// 当番カレンダーAPI(Step 2)
// ─────────────────────────────────────────

/**
 * Date を 'YYYY-MM-DD' 形式に。
 */
function formatYmd_(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 指定週(7日間)の当番を返す。
 * duty_master(曜日固定)をベースに、duty_week の特例で上書き。
 */
function apiListDutyWeek(payload) {
  const weekStart = payload && payload.week_start;
  if (!weekStart) throw new Error('week_start is required (YYYY-MM-DD)');

  const members = readSheet(SHEET_NAMES.MEMBERS);
  const memberMap = {};
  members.forEach(m => { memberMap[m.member_id] = m.display_name; });

  const dutyMaster = readSheet(SHEET_NAMES.DUTY_MASTER);
  const dutyWeek = readSheet(SHEET_NAMES.DUTY_WEEK);

  const dowNames = ['日', '月', '火', '水', '木', '金', '土'];
  const base = new Date(weekStart + 'T00:00:00');

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(base.getTime() + i * 86400000);
    const dateStr = formatYmd_(d);
    const dowJp = dowNames[d.getDay()];

    const duties = [];
    for (let slot = 1; slot <= 2; slot++) {
      let override = null;
      for (const w of dutyWeek) {
        if (formatYmd_(new Date(w.target_date)) === dateStr && Number(w.slot) === slot) {
          override = w;
          break;
        }
      }
      let memberId = '', isModified = false, modifiedBy = '';
      if (override) {
        memberId = override.member_id;
        isModified = true;
        modifiedBy = override.modified_by || '';
      } else {
        const m = dutyMaster.find(r => r.day_of_week === dowJp && Number(r.slot) === slot);
        memberId = m ? m.member_id : '';
      }
      duties.push({
        slot: slot,
        member_id: memberId,
        display_name: memberMap[memberId] || '',
        is_modified: isModified,
        modified_by: modifiedBy
      });
    }
    days.push({ date: dateStr, day_of_week: dowJp, duties: duties });
  }
  return { week_start: weekStart, days: days };
}

/**
 * 今週の当番を変更(duty_week に特例を記録)。
 */
function apiUpdateDutyWeek(payload) {
  if (!payload.target_date) throw new Error('target_date is required');
  if (!payload.slot) throw new Error('slot is required');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.DUTY_WEEK);
  const now = new Date().toISOString();
  const targetDate = String(payload.target_date);
  const slot = Number(payload.slot);

  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idxDate = headers.indexOf('target_date');
  const idxSlot = headers.indexOf('slot');
  const idxMember = headers.indexOf('member_id');
  const idxModFlag = headers.indexOf('is_modified');
  const idxModBy = headers.indexOf('modified_by');
  const idxModAt = headers.indexOf('modified_at');

  for (let r = 1; r < values.length; r++) {
    const rowDate = formatYmd_(new Date(values[r][idxDate]));
    if (rowDate === targetDate && Number(values[r][idxSlot]) === slot) {
      const rowNum = r + 1;
      sheet.getRange(rowNum, idxMember + 1).setValue(payload.member_id || '');
      sheet.getRange(rowNum, idxModFlag + 1).setValue(true);
      sheet.getRange(rowNum, idxModBy + 1).setValue(payload.modified_by || '');
      sheet.getRange(rowNum, idxModAt + 1).setValue(now);
      return { target_date: targetDate, slot: slot, member_id: payload.member_id, updated: true };
    }
  }
  const duty_id = generateId('d', sheet);
  sheet.appendRow([
    duty_id, targetDate, payload.member_id || '', slot,
    true, payload.modified_by || '', now
  ]);
  return { target_date: targetDate, slot: slot, member_id: payload.member_id, created: true };
}

/**
 * 代行依頼の一覧(未受諾を上、その後 requested_at 新しい順)。
 */
function apiListDutySwaps() {
  const members = readSheet(SHEET_NAMES.MEMBERS);
  const memberMap = {};
  members.forEach(m => { memberMap[m.member_id] = m.display_name; });
  const rows = readSheet(SHEET_NAMES.DUTY_SWAPS);
  return rows
    .map(s => ({
      ...s,
      original_name: memberMap[s.original_member_id] || '',
      substitute_name: memberMap[s.substitute_member_id] || ''
    }))
    .sort((a, b) => {
      const aAcc = a.accepted_at ? 1 : 0;
      const bAcc = b.accepted_at ? 1 : 0;
      if (aAcc !== bAcc) return aAcc - bAcc;
      return String(b.requested_at || '').localeCompare(String(a.requested_at || ''));
    });
}

/**
 * 代行依頼を作成。
 */
function apiAddDutySwap(payload) {
  if (!payload.original_member_id) throw new Error('original_member_id is required');
  if (!payload.target_date) throw new Error('target_date is required');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.DUTY_SWAPS);
  const swap_id = generateId('s', sheet);
  const now = new Date().toISOString();
  sheet.appendRow([
    swap_id,
    String(payload.target_date),
    payload.original_member_id,
    '',
    now,
    '',
    payload.note || ''
  ]);
  return { swap_id, target_date: payload.target_date, original_member_id: payload.original_member_id };
}

/**
 * 代行依頼を受諾。
 */
function apiAcceptDutySwap(payload) {
  if (!payload.swap_id) throw new Error('swap_id is required');
  if (!payload.substitute_member_id) throw new Error('substitute_member_id is required');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.DUTY_SWAPS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idxId = headers.indexOf('swap_id');
  const idxOrig = headers.indexOf('original_member_id');
  const idxDate = headers.indexOf('target_date');
  const idxSub = headers.indexOf('substitute_member_id');
  const idxAcc = headers.indexOf('accepted_at');
  const now = new Date().toISOString();

  let targetDate = null, originalMember = null;
  for (let r = 1; r < values.length; r++) {
    if (values[r][idxId] === payload.swap_id) {
      const rowNum = r + 1;
      sheet.getRange(rowNum, idxSub + 1).setValue(payload.substitute_member_id);
      sheet.getRange(rowNum, idxAcc + 1).setValue(now);
      targetDate = formatYmd_(new Date(values[r][idxDate]));
      originalMember = values[r][idxOrig];
      break;
    }
  }
  if (targetDate === null) throw new Error('swap not found: ' + payload.swap_id);

  // 当番表も書き換え:その日に originalMember が担当している枠を substitute に
  const slot = findDutySlot_(targetDate, originalMember);
  let dutyUpdated = false;
  if (slot) {
    apiUpdateDutyWeek({
      target_date: targetDate,
      slot: slot,
      member_id: payload.substitute_member_id,
      modified_by: payload.substitute_member_id
    });
    dutyUpdated = true;
  }

  return { swap_id: payload.swap_id, accepted: true, duty_updated: dutyUpdated };
}

/**
 * マスター当番表を更新。
 */
function apiUpdateDutyMaster(payload) {
  if (!payload.day_of_week) throw new Error('day_of_week is required');
  if (!payload.slot) throw new Error('slot is required');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.DUTY_MASTER);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idxDow = headers.indexOf('day_of_week');
  const idxSlot = headers.indexOf('slot');
  const idxMember = headers.indexOf('member_id');
  const slot = Number(payload.slot);
  for (let r = 1; r < values.length; r++) {
    if (values[r][idxDow] === payload.day_of_week && Number(values[r][idxSlot]) === slot) {
      sheet.getRange(r + 1, idxMember + 1).setValue(payload.member_id || '');
      return { day_of_week: payload.day_of_week, slot: slot, member_id: payload.member_id, updated: true };
    }
  }
  sheet.appendRow([payload.day_of_week, payload.member_id || '', slot]);
  return { day_of_week: payload.day_of_week, slot: slot, member_id: payload.member_id, created: true };
}


/**
 * 指定日に member_id が担当している slot(1 or 2)を返す。無ければ null。
 */
function findDutySlot_(targetDate, memberId) {
  const dowNames = ['日', '月', '火', '水', '木', '金', '土'];
  const d = new Date(targetDate + 'T00:00:00');
  const dowJp = dowNames[d.getDay()];
  const dutyMaster = readSheet(SHEET_NAMES.DUTY_MASTER);
  const dutyWeek = readSheet(SHEET_NAMES.DUTY_WEEK);
  for (let slot = 1; slot <= 2; slot++) {
    let mid = null;
    for (const w of dutyWeek) {
      if (formatYmd_(new Date(w.target_date)) === targetDate && Number(w.slot) === slot) {
        mid = w.member_id;
        break;
      }
    }
    if (mid === null) {
      const m = dutyMaster.find(r => r.day_of_week === dowJp && Number(r.slot) === slot);
      mid = m ? m.member_id : '';
    }
    if (mid === memberId) return slot;
  }
  return null;
}

// ─────────────────────────────────────────
// 田んぼフェノロジー(田植え/出穂/収穫日)API
//   sheet: paddy_phenology
//   columns: paddy_key, paddy_name, variety, transplant_date, heading_date, harvest_date
// ─────────────────────────────────────────

function apiListPaddyPhenology() {
  return readSheet('paddy_phenology').map(function (r) {
    return {
      paddy_key:       r.paddy_key,
      paddy_name:      r.paddy_name,
      variety:         r.variety || '',
      transplant_date: toYmd_(r.transplant_date),
      heading_date:    toYmd_(r.heading_date),
      harvest_date:    toYmd_(r.harvest_date)
    };
  });
}

function apiUpdatePaddyPhenology(payload) {
  if (!payload.paddy_key) throw new Error('paddy_key is required');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('paddy_phenology');
  if (!sheet) throw new Error('paddy_phenology シートがありません');
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idxKey       = headers.indexOf('paddy_key');
  const idxTrans     = headers.indexOf('transplant_date');
  const idxHeading   = headers.indexOf('heading_date');
  const idxHarvest   = headers.indexOf('harvest_date');
  if (idxKey < 0) throw new Error('paddy_phenology ヘッダ不備');
  for (let r = 1; r < values.length; r++) {
    if (values[r][idxKey] === payload.paddy_key) {
      if (idxTrans   >= 0 && payload.transplant_date !== undefined) sheet.getRange(r+1, idxTrans+1).setValue(payload.transplant_date || '');
      if (idxHeading >= 0 && payload.heading_date    !== undefined) sheet.getRange(r+1, idxHeading+1).setValue(payload.heading_date || '');
      if (idxHarvest >= 0 && payload.harvest_date    !== undefined) sheet.getRange(r+1, idxHarvest+1).setValue(payload.harvest_date || '');
      return { paddy_key: payload.paddy_key, updated: true };
    }
  }
  throw new Error('paddy_key not found: ' + payload.paddy_key);
}

/** YYYY-MM-DD 文字列に正規化(空・null・Date・文字列いずれも対応) */
function toYmd_(v) {
  if (!v) return '';
  if (v instanceof Date) {
    const y = v.getFullYear(), m = String(v.getMonth()+1).padStart(2,'0'), d = String(v.getDate()).padStart(2,'0');
    return y + '-' + m + '-' + d;
  }
  const s = String(v).trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  const y = d.getFullYear(), mo = String(d.getMonth()+1).padStart(2,'0'), da = String(d.getDate()).padStart(2,'0');
  return y + '-' + mo + '-' + da;
}
