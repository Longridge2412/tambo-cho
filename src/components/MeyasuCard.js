/**
 * 「今の目安」カード(表示専用)
 *
 *   - 苗イラスト + 現在ステージ(中干し等) + 田植え◯日目
 *   - 水位ステップチャート
 *
 * 田植え日は src/data/paddies.js でハードコード管理。編集UIは無し。
 *
 * props:
 *   - phenology: { paddy_key, paddy_name, transplant_date, ... }[] — 親で組み立てたもの
 */

const { createElement: h } = React;
const html = htm.bind(h);

import { PaddyIllustration } from './PaddyIllustration.js';
import { WaterPlanChart } from './WaterPlanChart.js';
import { currentWaterStage } from '../data/water_plan.js';

function stageToLevel(stage) {
  if (!stage) return 0.5;
  const cm = stage.depth_cm || 0;
  return Math.min(1, cm / 5);
}

export function MeyasuCard({ phenology }) {
  // 田植え日(三畝・一反は同じ前提で1つ目を使う)
  const transplantYmd = phenology && phenology.length > 0 ? phenology[0].transplant_date : '';
  const currentStage = transplantYmd ? currentWaterStage(transplantYmd) : null;

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
    </section>
  `;
}
