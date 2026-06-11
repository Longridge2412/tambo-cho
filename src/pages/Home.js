/**
 * ホーム画面(投稿フィード)
 *
 * 構成:
 *   - 上部固定:今の目安(目標水位 + 稲の暦/積算温度)
 *   - 下部:投稿フィード(見回り + 共用設備 + 覚書 を batch_id で1カードに統合)
 */

const { createElement: h, useState, useEffect } = React;
const html = htm.bind(h);

import { api } from '../api.js';
import { getPaddyProgress } from '../services/phenology.js';
import { getCurrentUser, setCurrentUser } from '../services/currentUser.js';
import { buildFeedGroups, groupPartLabels } from '../services/feed.js';
import { PADDIES } from '../data/paddies.js';
import { Lightbox, toLightboxUrl } from '../components/Lightbox.js';
import { HomeHeader } from '../components/HomeHeader.js';
import { PostCard } from '../components/PostCard.js';
import { EditPost } from '../components/EditPost.js';
import { MeyasuCard } from '../components/MeyasuCard.js';
import { TsutsumiReminder } from '../components/TsutsumiReminder.js';
import { GddSection } from '../components/GddSection.js';
import { BottomNav } from '../components/BottomNav.js';

export function HomePage() {
  const [ctx, setCtx] = useState(null);
  const [visits, setVisits] = useState([]);
  const [ops, setOps] = useState([]);
  const [notes, setNotes] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [phenology, setPhenology] = useState(null);
  const [phenologyError, setPhenologyError] = useState(null);
  const [operatorId, setOperatorId] = useState(getCurrentUser());
  const [actionMsg, setActionMsg] = useState('');
  const [editingKey, setEditingKey] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState('');

  useEffect(() => {
    const load = () => Promise.all([
      api.getTodayContext(),
      api.listVisits({ limit: 50 }),
      api.listFacilityOps({ limit: 50 }),
      api.listNotes(),
      api.listMembers()
    ])
      .then(([c, v, o, n, m]) => {
        setCtx(c); setVisits(v); setOps(o); setNotes(n); setMembers(m);
        setLoading(false);
      });
    load().catch(err => { setError(err.message); setLoading(false); });

    // 画面が再表示されたら 60 秒スロットルで自動再取得
    let lastVisRefresh = Date.now();
    const onVis = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastVisRefresh < 60000) return;
      lastVisRefresh = now;
      load().catch(err => console.warn('home revisit refresh failed:', err));
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const withProgress = [];
      let lastErr = null;
      for (const r of PADDIES) {
        let progress = null;
        if (r.transplant_date) {
          try {
            progress = await getPaddyProgress(r.transplant_date, r.heading_date);
          } catch (err) {
            console.warn('getPaddyProgress failed for', r.paddy_key, err);
            lastErr = err.message;
          }
        }
        withProgress.push({ ...r, progress });
      }
      if (!cancelled) {
        setPhenology(withProgress);
        if (lastErr) setPhenologyError('一部の積算温度取得に失敗: ' + lastErr);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const updateOperator = (id) => {
    setOperatorId(id);
    setCurrentUser(id);
  };

  const flash = (text) => {
    setActionMsg(text);
    setTimeout(() => setActionMsg(''), 2500);
  };

  const handleCloseTsutsumi = async (opId) => {
    try {
      await api.addFacilityOp({
        member_id: operatorId,
        target: '堤',
        action: '閉めた',
        reason: '',
        coordination_note: '',
        paired_op_id: opId
      });
      const [c, o] = await Promise.all([
        api.getTodayContext(),
        api.listFacilityOps({ limit: 50 })
      ]);
      setCtx(c); setOps(o);
      flash('閉めました');
    } catch (err) {
      flash(`閉める処理に失敗: ${err.message}`);
    }
  };

  const handleEditStart = (item) => setEditingKey(item.key);
  const handleEditCancel = () => setEditingKey(null);

  // グループ単位の保存(含まれる部分だけ順に更新)
  const handleEditSave = async (item, updates) => {
    try {
      if (updates.visit) {
        const id = item.parts.visit.visit_id;
        await api.updateVisit({ visit_id: id, ...updates.visit });
        setVisits(prev => prev.map(v => v.visit_id === id ? { ...v, ...updates.visit } : v));
      }
      if (updates.facility) {
        const id = item.parts.facility.op_id;
        await api.updateFacilityOp({ op_id: id, ...updates.facility });
        setOps(prev => prev.map(o => o.op_id === id ? { ...o, ...updates.facility } : o));
      }
      if (updates.note) {
        const id = item.parts.note.note_id;
        await api.updateNote({ note_id: id, ...updates.note });
        setNotes(prev => prev.map(n => n.note_id === id ? { ...n, ...updates.note } : n));
      }
      setEditingKey(null);
      flash('保存しました');
    } catch (err) {
      flash(`保存失敗: ${err.message}`);
    }
  };

  // グループ単位の削除(まとめて消す)
  const handleDeletePost = async (item) => {
    const labels = groupPartLabels(item).join(' + ');
    if (!confirm(`この投稿(${labels})を削除しますか?\n取り消せません。`)) return;
    try {
      if (item.parts.visit) {
        const id = item.parts.visit.visit_id;
        await api.deleteVisit({ visit_id: id });
        setVisits(prev => prev.filter(v => v.visit_id !== id));
      }
      if (item.parts.facility) {
        const id = item.parts.facility.op_id;
        await api.deleteFacilityOp({ op_id: id });
        setOps(prev => prev.filter(o => o.op_id !== id));
      }
      if (item.parts.note) {
        const id = item.parts.note.note_id;
        await api.deleteNote({ note_id: id });
        setNotes(prev => prev.filter(n => n.note_id !== id));
      }
      // 開けっぱリマインダーも変わる可能性があるので ctx 再取得
      const c = await api.getTodayContext();
      setCtx(c);
      flash('削除しました');
    } catch (err) {
      flash(`削除失敗: ${err.message}`);
    }
  };

  if (loading) return html`<div class="loading"><div class="loading-text">読み込み中</div></div>`;
  if (error) return html`
    <div class="error-screen">
      <div class="error-title">うまく読み込めませんでした</div>
      <div class="error-detail">${error}</div>
      <button class="btn-ghost error-retry" onClick=${() => window.location.reload()}>もう一度ためす</button>
    </div>
  `;

  const pendingTsutsumi = ctx.pending_tsutsumi || [];

  // メンバーID → 表示名
  const memberMap = {};
  members.forEach(m => { memberMap[m.member_id] = m.display_name; });

  // 統合フィード(batch_id で1カードに統合)
  const feed = buildFeedGroups({ visits, ops, notes, memberMap });

  return html`
    <div class="screen">
      <${HomeHeader} />

      <main class="screen-body home-v2">

        <${MeyasuCard} phenology=${phenology} />

        <${GddSection} phenology=${phenology} error=${phenologyError} />

        <!-- 堤の未完了リマインダー(該当時のみ・インラインで閉められる) -->
        <${TsutsumiReminder}
          items=${pendingTsutsumi}
          members=${members}
          operatorId=${operatorId}
          onOperatorChange=${updateOperator}
          onClose=${(opId) => operatorId
            ? handleCloseTsutsumi(opId)
            : (flash('「あなた」を選んでください'), Promise.resolve())} />

        ${actionMsg && html`<div class="duty-flash">${actionMsg}</div>`}

        <!-- 投稿フィード -->
        <section class="feed">
          ${feed.length === 0
            ? html`<div class="empty-note">まだ投稿がありません</div>`
            : feed.map(item => {
                if (editingKey === item.key) {
                  return html`<${EditPost} key=${item.key} item=${item}
                    onSave=${handleEditSave} onCancel=${handleEditCancel} />`;
                }
                return html`<${PostCard} key=${item.key} item=${item}
                  onEdit=${handleEditStart} onDelete=${handleDeletePost}
                  onPhotoClick=${(url) => setLightboxUrl(toLightboxUrl(url))} />`;
              })
          }
        </section>

      </main>

      <${BottomNav} current="#/" />
      <${Lightbox} url=${lightboxUrl} onClose=${() => setLightboxUrl('')} />
    </div>
  `;
}
