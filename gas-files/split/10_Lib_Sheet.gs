/**
 * Lib_Sheet.gs — シート読み書きの共通関数
 */

/**
 * シートタブ名で検索(余白・ノーブレークスペース・ゼロ幅文字を吸収)。
 *   厳密一致 → trim 一致 の順で探す。見つからなければ null。
 */
function _findSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (sheet) return sheet;
  const target = String(sheetName)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .trim();
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    const nm = String(sheets[i].getName())
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\u00A0/g, ' ')
      .trim();
    if (nm === target) return sheets[i];
  }
  return null;
}

function readSheet(sheetName) {
  const sheet = _findSheet(sheetName);
  if (!sheet) {
    const all = SpreadsheetApp.getActiveSpreadsheet().getSheets()
      .map(s => '「' + s.getName() + '」').join(', ');
    throw new Error('Sheet not found: ' + sheetName + ' / 既存シート: ' + all);
  }
  const range = sheet.getDataRange();
  const values = range.getValues();
  if (values.length <= 1) return [];
  const headers = values[0];
  return values.slice(1).map(row => rowToObject(headers, row));
}

function rowToObject(headers, row) {
  const obj = {};
  headers.forEach((h, i) => {
    // ヘッダの揺れ(前後空白・ノーブレークスペース\u00a0・ゼロ幅文字)を吸収して
    // クリーンなキーを obj に登録する
    const key = String(h == null ? '' : h)
      .replace(/[\u200B-\u200D\uFEFF]/g, '')  // ゼロ幅
      .replace(/\u00A0/g, ' ')                   // ノーブレークスペース → 通常空白
      .trim();                                    // 前後空白除去
    if (key) obj[key] = row[i];
  });
  return obj;
}

/**
 * ヘッダ名にもとづいて1行を追記する(列順に依存しない)。
 * obj のキーとヘッダ(余白・ゼロ幅文字を正規化)を突き合わせ、
 * 一致しないヘッダは空文字で埋める。obj 側にしかないキーは無視される
 * (例: batch_id 列が未追加のシートでも安全に動く)。
 */
function appendRowByHeaders(sheet, obj) {
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) throw new Error('ヘッダ行がありません: ' + sheet.getName());
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const row = headers.map(function (h) {
    const key = String(h == null ? '' : h)
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\u00A0/g, ' ')
      .trim();
    return (key && obj[key] !== undefined && obj[key] !== null) ? obj[key] : '';
  });
  sheet.appendRow(row);
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
  const target = String(idValue).trim();
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][idxId] == null ? '' : values[r][idxId]).trim() === target) {
      sheet.deleteRow(r + 1);
      return { id: idValue, deleted: true };
    }
  }
  throw new Error(idCol + ' not found: ' + target);
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
  const target = String(idValue).trim();
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][idxId] == null ? '' : values[r][idxId]).trim() === target) {
      allowedFields.forEach(function (k) {
        if (payload[k] !== undefined && colMap[k] !== undefined) {
          sheet.getRange(r + 1, colMap[k] + 1).setValue(payload[k]);
        }
      });
      return { id: idValue, updated: true };
    }
  }
  throw new Error(idCol + ' not found: ' + target);
}
