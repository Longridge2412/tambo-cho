/**
 * Api_Facility.gs — 共用設備操作(堤の開け閉め等)
 */

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

function apiUpdateFacilityOp(payload) {
  return _updateByIdInSheet(
    SHEET_NAMES.FACILITY_OPS, 'op_id', payload.op_id, payload,
    ['action', 'reason', 'coordination_note', 'target']
  );
}

function apiDeleteFacilityOp(payload) {
  return _deleteByIdInSheet(SHEET_NAMES.FACILITY_OPS, 'op_id', payload.op_id);
}
