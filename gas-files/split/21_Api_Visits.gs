/**
 * Api_Visits.gs — 見回り(visits)
 */

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

function apiUpdateVisit(payload) {
  return _updateByIdInSheet(
    SHEET_NAMES.VISITS, 'visit_id', payload.visit_id, payload,
    ['water_level_eval', 'field2_eval', 'stream_status', 'free_note']
  );
}

function apiDeleteVisit(payload) {
  return _deleteByIdInSheet(SHEET_NAMES.VISITS, 'visit_id', payload.visit_id);
}
