/**
 * Lib_Sheet.gs — シート読み書きの共通関数
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

function _deleteByIdInSheet(sheetName, idCol, idValue) {
  if (!idValue) throw new Error(idCol + ' is required');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('sheet not found: ' + sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idxId = headers.indexOf(idCol);
  if (idxId < 0) throw new Error('header ' + idCol + ' not found');
  for (let r = 1; r < values.length; r++) {
    if (values[r][idxId] === idValue) {
      sheet.deleteRow(r + 1);
      return { id: idValue, deleted: true };
    }
  }
  throw new Error(idCol + ' not found: ' + idValue);
}

// ─────────────────────────────────────────
// 更新API(投稿の編集用)
// ─────────────────────────────────────────

function _updateByIdInSheet(sheetName, idCol, idValue, payload, allowedFields) {
  if (!idValue) throw new Error(idCol + ' is required');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('sheet not found: ' + sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idxId = headers.indexOf(idCol);
  if (idxId < 0) throw new Error('header ' + idCol + ' not found');
  const colMap = {};
  headers.forEach(function (h, i) { colMap[h] = i; });
  for (let r = 1; r < values.length; r++) {
    if (values[r][idxId] === idValue) {
      allowedFields.forEach(function (k) {
        if (payload[k] !== undefined && colMap[k] !== undefined) {
          sheet.getRange(r + 1, colMap[k] + 1).setValue(payload[k]);
        }
      });
      return { id: idValue, updated: true };
    }
  }
  throw new Error(idCol + ' not found: ' + idValue);
}
