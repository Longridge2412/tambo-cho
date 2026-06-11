/**
 * Api_Posts.gs — 一括投稿API
 *
 * 共有フォーム1回の送信を1リクエストで受け、visit / facility / note / todo を
 * まとめて書き込む。作成されたレコードには共通の batch_id を付与し、
 * フロントのフィードはこれを手がかりに1カードへ統合表示する。
 *
 * 利点:
 *   - POST 1回 = タイムアウト抽選1回(従来は最大4回直列)
 *   - 途中失敗時も「どこまで保存されたか」をエラーメッセージで返す
 *
 * 前提: visits / facility_ops / notes シートに batch_id 列(ヘッダ)があること。
 *       列が無い場合も動作はする(batch_id が保存されず、従来どおり別カード表示)。
 */

function apiAddPost(payload) {
  if (!payload.member_id) throw new Error('member_id is required');
  if (!payload.visit && !payload.facility && !payload.note && !payload.todo) {
    throw new Error('visit / facility / note / todo のいずれかが必要です');
  }

  const batch_id = 'b' + new Date().getTime() + '_' + Math.floor(Math.random() * 1000);
  const created = [];
  const result = { batch_id: batch_id, created: created };

  try {
    if (payload.visit) {
      result.visit = apiAddVisit(Object.assign({}, payload.visit, {
        member_id: payload.member_id, batch_id: batch_id
      }));
      created.push('見回り');
    }
    if (payload.facility) {
      result.facility = apiAddFacilityOp(Object.assign({}, payload.facility, {
        member_id: payload.member_id, batch_id: batch_id
      }));
      created.push((payload.facility.target || '設備') + 'の操作');
    }
    if (payload.note) {
      result.note = apiAddNote(Object.assign({}, payload.note, {
        created_by: payload.member_id, batch_id: batch_id
      }));
      created.push('覚書');
    }
    if (payload.todo) {
      result.todo = apiAddTodo(Object.assign({}, payload.todo, {
        created_by: payload.member_id
      }));
      created.push('Todo');
    }
  } catch (err) {
    const saved = created.length
      ? '【保存済み: ' + created.join('・') + '】この分は再送信しないでください。'
      : '【何も保存されていません】そのまま再送信できます。';
    throw new Error('送信の途中で失敗しました。' + saved + ' 原因: ' + err.message);
  }

  return result;
}
