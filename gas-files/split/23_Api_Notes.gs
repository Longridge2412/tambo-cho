/**
 * Api_Notes.gs — 覚書(notes)
 */

function apiAddNote(payload) {
  if (!payload.content && !payload.photo_data_url) {
    throw new Error('content または photo_data_url が必要です');
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.NOTES);
  const note_id = generateId('n', sheet);
  const now = new Date().toISOString();

  // 任意の写真をDriveへ
  let photo_url = '';
  if (payload.photo_data_url) {
    const filename = `${formatDateForFile(now)}_${payload.created_by || 'anon'}_note.jpg`;
    photo_url = uploadDataUrlToDrive(payload.photo_data_url, filename, '覚書写真').url;
  }

  sheet.appendRow([
    note_id,
    payload.content || '',
    payload.created_by || '',
    now,
    now,
    payload.pinned === true,
    photo_url
  ]);
  return {
    note_id, content: payload.content || '',
    created_by: payload.created_by || '',
    created_at: now, updated_at: now,
    pinned: payload.pinned === true,
    photo_url
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

function apiUpdateNote(payload) {
  if (!payload.note_id) throw new Error('note_id is required');
  // 本文だけは特別:updated_at も同時に更新
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.NOTES);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idxId = headers.indexOf('note_id');
  const colMap = {};
  headers.forEach(function (h, i) { colMap[h] = i; });
  for (let r = 1; r < values.length; r++) {
    if (values[r][idxId] === payload.note_id) {
      ['content', 'pinned'].forEach(function (k) {
        if (payload[k] !== undefined && colMap[k] !== undefined) {
          sheet.getRange(r + 1, colMap[k] + 1).setValue(payload[k]);
        }
      });
      if (colMap['updated_at'] !== undefined) {
        sheet.getRange(r + 1, colMap['updated_at'] + 1).setValue(new Date().toISOString());
      }
      return { note_id: payload.note_id, updated: true };
    }
  }
  throw new Error('note_id not found: ' + payload.note_id);
}

function apiDeleteNote(payload) {
  return _deleteByIdInSheet(SHEET_NAMES.NOTES, 'note_id', payload.note_id);
}
