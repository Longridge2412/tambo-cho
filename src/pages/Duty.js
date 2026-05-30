/**
 * 当番カレンダー画面(番)
 *
 * 構成:
 *   - 今週の当番(週送り + 直接編集)
 *   - マスター当番表の編集(別ビュー)
 *
 * 代行は LINE での直接連絡に任せ、アプリには載せない(シンプルさ優先)。
 * 当番の2枠に朝夕の役割分担はつけない(2人で協力)。
 */

const { createElement: h, useState, useEffect } = React;
const html = htm.bind(h);

import { api } from '../api.js';
import { Header } from '../components/Header.js';
import { BottomNav } from '../components/BottomNav.js';

function getMonday(d) {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
}
function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function shiftDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  return ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}
function mdLabel(v) {
  let d;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    d = new Date(v + 'T00:00:00');
  } else {
    d = new Date(v);
  }
  if (isNaN(d.getTime())) return String(v || '');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function DutyPage() {
  const [view, setView] = useState('week');
  const [operatorId, setOperatorId] = useState('');
  const [members, setMembers] = useState([]);
  const [weekStart, setWeekStart] = useState(ymd(getMonday(new Date())));
  const [weekData, setWeekData] = useState(null);
  const [masterRows, setMasterRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api.listMembers(), api.listDutyMaster()])
      .then(([m, dm]) => {
        setMembers(m);
        setMasterRows(dm);
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  useEffect(() => {
    api.listDutyWeek({ week_start: weekStart })
      .then(setWeekData)
      .catch(err => setError(err.message));
  }, [weekStart]);

  const flash = (text) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 2500);
  };

  const handleWeekChange = async (date, slot, memberId) => {
    setBusy(true);
    setError(null);
    try {
      await api.updateDutyWeek({
        target_date: date, slot: slot,
        member_id: memberId, modified_by: operatorId
      });
      const w = await api.listDutyWeek({ week_start: weekStart });
      setWeekData(w);
      flash('当番を書き換えました');
    } catch (err) {
      setError(`変更に失敗しました: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleMasterChange = async (dow, slot, memberId) => {
    setBusy(true);
    setError(null);
    try {
      await api.updateDutyMaster({ day_of_week: dow, slot: slot, member_id: memberId });
      const dm = await api.listDutyMaster();
      setMasterRows(dm);
      flash('マスター当番表を更新しました');
    } catch (err) {
      setError(`変更に失敗しました: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return html`<div class="loading"><div class="loading-text">読み込み中</div></div>`;
  }
  if (error && !weekData && view === 'week') {
    return html`
      <div class="error-screen">
        <div class="error-title">うまく読み込めませんでした</div>
        <div class="error-detail">${error}</div>
        <button class="btn-ghost error-retry" onClick=${() => window.location.reload()}>もう一度ためす</button>
      </div>
    `;
  }

  const operatorSelect = html`
    <div class="duty-operator">
      <span class="duty-operator-label">あ な た</span>
      <select class="f-input f-select duty-operator-select"
        value=${operatorId} onChange=${e => setOperatorId(e.target.value)}>
        <option value="">── 選択 ──</option>
        ${members.map(m => html`<option key=${m.member_id} value=${m.member_id}>${m.display_name}</option>`)}
      </select>
    </div>
  `;

  // ── マスター編集ビュー ──
  if (view === 'master') {
    const orderedDow = ['月', '火', '水', '木', '金', '土', '日'];
    return html`
      <div class="screen">
        <${Header} title="マスター当番表" subtitle="曜日ごとの 基本の割り当て" />
        <main class="screen-body">
          ${operatorSelect}
          <div class="duty-note-line">ここを変えると、以降の「今週の当番」の初期値になります</div>
          <div class="duty-grid">
            ${orderedDow.map(dow => html`
              <div class="duty-row" key=${dow}>
                <div class="duty-dow">${dow}</div>
                ${[1, 2].map(slot => {
                  const row = masterRows.find(r => r.day_of_week === dow && Number(r.slot) === slot);
                  return html`
                    <select key=${slot} class="duty-cell-select" disabled=${busy}
                      value=${row ? row.member_id : ''}
                      onChange=${e => handleMasterChange(dow, slot, e.target.value)}>
                      <option value="">──</option>
                      ${members.map(m => html`<option key=${m.member_id} value=${m.member_id}>${m.display_name}</option>`)}
                    </select>
                  `;
                })}
              </div>
            `)}
          </div>
          ${error && html`<div class="form-error">${error}</div>`}
          ${msg && html`<div class="duty-flash">${msg}</div>`}
          <button class="btn-ghost" onClick=${() => { setView('week'); setError(null); }}>今週の当番にもどる</button>
        </main>
        <${BottomNav} current="#/duty" />
      </div>
    `;
  }

  // ── 今週ビュー ──
  const days = weekData ? weekData.days : [];

  return html`
    <div class="screen">
      <${Header} title="当 番" subtitle="今週の当番" />
      <main class="screen-body">
        ${operatorSelect}

        <section class="section">
          <div class="sec-head">
            <div class="sec-mark"></div>
            <div class="sec-title">今 週 の 当 番</div>
            <div class="sec-line"></div>
          </div>
          <div class="week-nav">
            <button class="week-nav-btn" onClick=${() => setWeekStart(shiftDays(weekStart, -7))}>‹ 前の週</button>
            <button class="week-nav-btn now" onClick=${() => setWeekStart(ymd(getMonday(new Date())))}>今週</button>
            <button class="week-nav-btn" onClick=${() => setWeekStart(shiftDays(weekStart, 7))}>次の週 ›</button>
          </div>
          <div class="duty-grid">
            ${days.map(day => html`
              <div class="duty-row" key=${day.date}>
                <div class="duty-dow">${day.day_of_week}<span class="duty-md">${mdLabel(day.date)}</span></div>
                ${day.duties.map(d => html`
                  <select key=${d.slot}
                    class=${`duty-cell-select ${d.is_modified ? 'modified' : ''}`}
                    disabled=${busy}
                    value=${d.member_id}
                    onChange=${e => handleWeekChange(day.date, d.slot, e.target.value)}>
                    <option value="">──</option>
                    ${members.map(m => html`<option key=${m.member_id} value=${m.member_id}>${m.display_name}</option>`)}
                  </select>
                `)}
              </div>
            `)}
          </div>
          <div class="duty-legend">色のついた枠は、基本の割り当てから書き換えられています</div>
        </section>

        <div class="duty-note-line">
          急に行けなくなったときは、LINE でみんなに声をかけてください。
          代わってもらえたら、上の表をタップして書き換えておくと記録に残ります。
        </div>

        ${error && html`<div class="form-error">${error}</div>`}
        ${msg && html`<div class="duty-flash">${msg}</div>`}

        <button class="btn-ghost duty-master-link" onClick=${() => { setView('master'); setError(null); }}>
          マスター当番表を見直す ›
        </button>

      </main>
      <${BottomNav} current="#/duty" />
    </div>
  `;
}
