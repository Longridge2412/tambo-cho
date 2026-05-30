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
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idxId = headers.indexOf('todo_id');
  const colMap = {};
  headers.forEach(function (h, i) { colMap[h] = i; });
  for (let r = 1; r < values.length; r++) {
    if (values[r][idxId] === payload.todo_id) {
      ['content', 'due_date', 'status'].forEach(function (k) {
        if (payload[k] !== undefined && colMap[k] !== undefined) {
          sheet.getRange(r + 1, colMap[k] + 1).setValue(payload[k]);
        }
      });
      return { todo_id: payload.todo_id, updated: true };
    }
  }
  throw new Error('todo_id not found: ' + payload.todo_id);
}

function apiCompleteTodo(payload) {
  if (!payload.todo_id) throw new Error('todo_id is required');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('todos');
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idxId  = headers.indexOf('todo_id');
  const colSt  = headers.indexOf('status');
  const colCAt = headers.indexOf('completed_at');
  const colCBy = headers.indexOf('completed_by');
  const now = new Date().toISOString();
  for (let r = 1; r < values.length; r++) {
    if (values[r][idxId] === payload.todo_id) {
      if (colSt  >= 0) sheet.getRange(r + 1, colSt  + 1).setValue('done');
      if (colCAt >= 0) sheet.getRange(r + 1, colCAt + 1).setValue(now);
      if (colCBy >= 0) sheet.getRange(r + 1, colCBy + 1).setValue(payload.completed_by || '');
      return { todo_id: payload.todo_id, completed: true };
    }
  }
  throw new Error('todo_id not found: ' + payload.todo_id);
}

// ─────────────────────────────────────────
// 削除API(投稿の片付け用)
// ─────────────────────────────────────────
