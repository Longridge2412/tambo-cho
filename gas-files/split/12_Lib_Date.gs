/**
 * Lib_Date.gs — 日付ユーティリティ
 */

function formatYmd_(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 指定週(7日間)の当番を返す。
 * duty_master(曜日固定)をベースに、duty_week の特例で上書き。
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

// ─────────────────────────────────────────
// Todo API
//   sheet: todos
//   columns: todo_id, content, due_date, created_by, created_at, status, completed_at, completed_by
// ─────────────────────────────────────────

function isWithin(today_md, start_md, end_md) {
  if (start_md <= end_md) {
    return start_md <= today_md && today_md <= end_md;
  }
  return today_md >= start_md || today_md <= end_md;
}

/**
 * Date オブジェクトまたは文字列を "MM-DD" 形式に正規化。
 */
