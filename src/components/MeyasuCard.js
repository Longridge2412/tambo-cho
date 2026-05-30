/**
 * 「今の目安」カード(独立コンポーネント)
 *
 *   - 苗イラスト + 現在ステージ(中干し等) + 田植え◯日目
 *   - 水位ステップチャート
 *   - 田植え日の編集 UI
 *
 * props:
 *   - phenology: api.listPaddyPhenology() の結果配列
 *   - onSaveTransplant: (editsObj) => Promise — Home.js が更新+再フェッチを担当
 */

const { createElement: h, useState, useEffect } = React;
const html = htm.bind(h);

import { PaddyIllustration } from './PaddyIllustration.js';
import { WaterPlanChart } from './WaterPlanChart.js';
import { currentWaterStage } from '../data/water_plan.js';

function stageToLevel(stage) {
  if (!stage) return 0.5;
  const cm = stage.depth_cm || 0;
  return Math.min(1, cm / 5);
}

export function MeyasuCard({ phenology, onSaveTransplant }) {
  const [editing, setEditing] = useState(false);
  const [edits, setEdits] = useState({});
  const [busy, setBusy] = useState(false);

  // 編集モードに切り替わったとき、現在値で初期化
  useEffect(() => {
    if (phenology && editing) {
      const o = {};
      phenology.forEach(p => { o[p.paddy_key] = p.transplant_date || ''; });
      setEdits(o);
    }
  }, [editing, phenology]);

  // 田植え日(三畝・一反は同じ前提で1つ目を使う)
  const transplantYmd = phenology && phenology.length > 0 ? phenology[0].transplant_date : '';
  const currentStage = transplantYmd ? currentWaterStage(transplantYmd) : null;

  const handleSave = async () => {
    setBusy(true);
    try {
      await onSaveTransplant(edits);
      setEditing(false);
    } catch (e) {
      // 親でエラーフラッシュを出す想定。ここはサイレント。
    } finally {
      setBusy(false);
    }
  };

  return html`
    <section class="meyasu-card">
      <div class="meyasu-row meyasu-row-v2">
        <div class="meyasu-visual">
          <${PaddyIllustration} waterLevel=${stageToLevel(currentStage)} />
        </div>
        <div class="meyasu-text">
          <div class="meyasu-label">目 安</div>
          <div class="meyasu-main-v2">${currentStage ? currentStage.label : '田植え日未設定'}</div>
          ${currentStage && html`<div class="meyasu-sub">田植え${currentStage.days_since_transplant}日目</div>`}
        </div>
      </div>
      <${WaterPlanChart} transplantYmd=${transplantYmd} />

      <!-- 田植え日編集 -->
      <div class="meyasu-edit-row">
        ${editing
          ? html`
            <div class="transplant-edit">
              ${(phenology || []).map(p => html`
                <div class="transplant-edit-row" key=${p.paddy_key}>
                  <span class="transplant-edit-label">${p.paddy_name}</span>
                  <input type="date" class="f-input f-date"
                    value=${edits[p.paddy_key] || ''}
                    onChange=${e => setEdits({...edits, [p.paddy_key]: e.target.value})}/>
                </div>
              `)}
              <div class="transplant-edit-actions">
                <button class="btn-ghost" disabled=${busy}
                  onClick=${() => setEditing(false)}>キャンセル</button>
                <button class="btn-primary" disabled=${busy}
                  onClick=${handleSave}>${busy ? '保存中…' : '保存'}</button>
              </div>
            </div>
          `
          : html`<button class="meyasu-edit-link"
              onClick=${() => setEditing(true)}>田植え日を編集</button>`
        }
      </div>
    </section>
  `;
}
