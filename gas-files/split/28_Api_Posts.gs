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
 * ★ 冪等性(2026-08 追加):
 *   フロントは送信1回につき client_batch_id を1つ作り、再送でも同じものを送る。
 *   ここでは各シートに「その batch_id の行がもうあるか」を確認し、あれば書かない。
 *   これで「通信が切れて失敗に見えたが実は保存されていた」→「もう一度押した」
 *   による二重投稿が起きなくなる。
 *
 *   また、ID採番(generateId は最終行番号を使う)が同時送信で衝突しないよう、
 *   処理全体を ScriptLock で直列化する。
 *
 * 前提: visits / facility_ops / notes(できれば todos にも)に batch_id 列があること。
 *       列が無い場合も動作はする(重複チェックが効かないだけ)。
 */

function apiAddPost(payload) {
  if (!payload.member_id) throw new Error('member_id is required');
  if (!payload.visit && !payload.facility && !payload.note && !payload.todo) {
    throw new Error('visit / facility / note / todo のいずれかが必要です');
  }

  // フロントが作った ID を優先(再送でも同じ値が来る)
  const batch_id = String(payload.client_batch_id || '').trim() ||
    ('b' + new Date().getTime() + '_' + Math.floor(Math.random() * 1000));

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    throw new Error('ほかの人の送信と重なりました。少し待ってからもう一度お試しください');
  }

  try {
    const created = [];    // 今回書いたもの
    const skipped = [];    // すでに保存済みだったもの(再送)
    const result = { batch_id: batch_id, created: created, skipped: skipped };

    try {
      if (payload.visit) {
        if (batchIdExists(SHEET_NAMES.VISITS, batch_id)) {
          skipped.push('見回り');
          created.push('見回り');   // 利用者から見れば「記録済み」
        } else {
          result.visit = apiAddVisit(Object.assign({}, payload.visit, {
            member_id: payload.member_id, batch_id: batch_id
          }));
          created.push('見回り');
        }
      }
      if (payload.facility) {
        const label = (payload.facility.target || '設備') + 'の操作';
        if (batchIdExists(SHEET_NAMES.FACILITY_OPS, batch_id)) {
          skipped.push(label);
          created.push(label);
        } else {
          result.facility = apiAddFacilityOp(Object.assign({}, payload.facility, {
            member_id: payload.member_id, batch_id: batch_id
          }));
          created.push(label);
        }
      }
      if (payload.note) {
        if (batchIdExists(SHEET_NAMES.NOTES, batch_id)) {
          skipped.push('覚書');
          created.push('覚書');
        } else {
          result.note = apiAddNote(Object.assign({}, payload.note, {
            created_by: payload.member_id, batch_id: batch_id
          }));
          created.push('覚書');
        }
      }
      if (payload.todo) {
        if (batchIdExists('todos', batch_id)) {
          skipped.push('Todo');
          created.push('Todo');
        } else {
          result.todo = apiAddTodo(Object.assign({}, payload.todo, {
            created_by: payload.member_id, batch_id: batch_id
          }));
          created.push('Todo');
        }
      }
    } catch (err) {
      const saved = created.length
        ? '【保存済み: ' + created.join('・') + '】'
        : '【まだ何も保存されていません】';
      throw new Error('送信の途中で失敗しました。' + saved +
        'もう一度「送る」を押せば、足りない分だけが保存されます。 原因: ' + err.message);
    }

    return result;

  } finally {
    lock.releaseLock();
  }
}
