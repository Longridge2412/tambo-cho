/**
 * Api_Todos.gs — Todo
 */

function apiListTodos() {
  const rows = readSheet('todos');
  return rows.map(function (r) {
    return {
      todo_id:      r.todo_id,
      content:      r.content || '',
      due_date:     toYmd_(r.due_date),
      created_by:   r.created_by || '',
      created_at:   r.created_at || '',
      status:       r.status || 'open',
      completed_at: r.completed_at || '',
      completed_by: r.completed_by || ''
    };
  });
}

function apiAddTodo(payload) {
  if (!payload.content) throw new Error('content is required');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('todos');
  if (!sheet) throw new Error('todos シートがありません');
  const todo_id = generateId('t', sheet);
  const created_at = new Date().toISOString();
  sheet.appendRow([
    todo_id,
    payload.content,
    payload.due_date || '',
    payload.created_by || '',
    created_at,
    'open',
    '',
    ''
  ]);
  return {
    todo_id, content: payload.content,
    due_date: payload.due_date || '',
    created_by: payload.created_by || '',
    created_at, status: 'open'
  };
}

function apiUpdateTodo(payload) {
  if (!payload.todo_id) throw new Error('todo_id is required');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('todos');
  if (!sheet) throw new Error('todos シートが見つかりません');
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idxId = headers.indexOf('todo_id');
  if (idxId < 0) throw new Error('ヘッダーに todo_id 列がありません');
  const colMap = {};
  headers.forEach(function (h, i) { colMap[h] = i; });
  const target = String(payload.todo_id).trim();
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][idxId] == null ? '' : values[r][idxId]).trim() === target) {
      ['content', 'due_date', 'status'].forEach(function (k) {
        if (payload[k] !== undefined && colMap[k] !== undefined) {
          sheet.getRange(r + 1, colMap[k] + 1).setValue(payload[k]);
        }
      });
      return { todo_id: payload.todo_id, updated: true };
    }
  }
  throw new Error('todo_id not found: ' + target);
}

function apiCompleteTodo(payload) {
  if (!payload.todo_id) throw new Error('todo_id is required');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('todos');
  if (!sheet) throw new Error('todos シートが見つかりません');
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idxId  = headers.indexOf('todo_id');
  if (idxId < 0) throw new Error('ヘッダーに todo_id 列がありません(現状: ' + headers.join(', ') + ')');
  const colSt  = headers.indexOf('status');
  const colCAt = headers.indexOf('completed_at');
  const colCBy = headers.indexOf('completed_by');
  const target = String(payload.todo_id).trim();
  const now = new Date().toISOString();
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][idxId] == null ? '' : values[r][idxId]).trim() === target) {
      if (colSt  >= 0) sheet.getRange(r + 1, colSt  + 1).setValue('done');
      if (colCAt >= 0) sheet.getRange(r + 1, colCAt + 1).setValue(now);
      if (colCBy >= 0) sheet.getRange(r + 1, colCBy + 1).setValue(payload.completed_by || '');
      return { todo_id: payload.todo_id, completed: true };
    }
  }
  const sample = values.slice(1, 4).map(v => String(v[idxId])).join(' / ');
  throw new Error('todo_id not found: 探したID=「' + target + '」, 先頭3件=「' + sample + '」');
}

// ─────────────────────────────────────────
// 削除API(投稿の片付け用)
// ─────────────────────────────────────────
