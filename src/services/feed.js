/**
 * 投稿フィードのグルーピング
 *
 * visits / facility_ops / notes の3シートのレコードを、
 * batch_id(共有フォーム1回の送信に付く共通ID)で1つの「投稿グループ」に束ねる。
 * batch_id が無い古いレコードは従来どおり1レコード=1グループ。
 *
 * グループの形:
 *   {
 *     key:   React key 兼 編集状態の識別子
 *     ts:    代表時刻(グループ内の最新)
 *     by:    表示名
 *     parts: { visit?, facility?, note? }   ← 各シートの生レコード
 *   }
 *
 * Home / Calendar で共用。
 */

function normBatchId(v) {
  return String(v == null ? '' : v).trim();
}

export function buildFeedGroups({ visits = [], ops = [], notes = [], memberMap = {} }) {
  const groups = [];
  const byBatch = {};

  const place = (type, id, ts, memberId, batchId, data) => {
    if (!ts) return;
    const bid = normBatchId(batchId);
    const existing = bid ? byBatch[bid] : null;

    // 既存グループに同型がまだ無ければ合流
    if (existing && !existing.parts[type]) {
      existing.parts[type] = data;
      if (String(ts) > String(existing.ts)) existing.ts = ts;
      return;
    }

    // 新規グループ(batch_id 無し / 同型重複は単独グループに逃がす)
    const isNewBatchGroup = !!bid && !existing;
    const g = {
      key: isNewBatchGroup ? `b:${bid}` : `${type}:${id}`,
      ts,
      by: memberMap[memberId] || '?',
      parts: {}
    };
    g.parts[type] = data;
    groups.push(g);
    if (isNewBatchGroup) byBatch[bid] = g;
  };

  visits.forEach(v => place('visit', v.visit_id, v.visited_at, v.member_id, v.batch_id, v));
  ops.forEach(o => place('facility', o.op_id, o.operated_at, o.member_id, o.batch_id, o));
  notes.forEach(n => place('note', n.note_id, n.created_at, n.created_by, n.batch_id, n));

  groups.sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
  return groups;
}

/**
 * グループの構成ラベル(削除確認などの文言用)。例: ['見回り', '堤の操作']
 */
export function groupPartLabels(group) {
  const labels = [];
  if (group.parts.visit) labels.push('見回り');
  if (group.parts.facility) labels.push(`${group.parts.facility.target || '設備'}の操作`);
  if (group.parts.note) labels.push('覚書');
  return labels;
}
