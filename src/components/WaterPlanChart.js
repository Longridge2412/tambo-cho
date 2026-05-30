/**
 * 水位ステップチャート(理想プラン + 現在位置)
 *
 *   - WATER_PLAN を時系列でステップ描画
 *   - 間断灌漑期はジグザグ
 *   - 田植え日から今日までの位置を橙ドットで表示
 */

const { createElement: h } = React;
const html = htm.bind(h);

import { WATER_PLAN } from '../data/water_plan.js';

const TOTAL_DAYS = 145;  // 田植え→収穫の総日数
const W = 320;           // SVG 幅
const H = 50;            // SVG 高
const PAD_T = 8;         // 上余白
const PAD_B = 14;        // 下余白
const CHART_H = H - PAD_T - PAD_B;

function depthToY(cm) {
  // 0cm = 一番下, 5cm = 一番上
  const maxCm = 5;
  return PAD_T + CHART_H * (1 - Math.min(cm, maxCm) / maxCm);
}

function dayToX(day) {
  return Math.max(0, Math.min(W, (day / TOTAL_DAYS) * W));
}

/** ステージのパスを構築 */
function buildPath() {
  const segments = [];
  for (let i = 0; i < WATER_PLAN.length; i++) {
    const cur = WATER_PLAN[i];
    const next = WATER_PLAN[i + 1];
    const x1 = dayToX(cur.day_offset);
    const x2 = next ? dayToX(next.day_offset) : W;
    const y  = depthToY(cur.depth_cm);

    if (cur.pattern === 'intermittent') {
      // ジグザグ(短い周期で上下)
      const steps = Math.max(4, Math.floor((x2 - x1) / 8));
      const high = depthToY(cur.depth_cm + 1.2);
      const low  = depthToY(Math.max(0, cur.depth_cm - 1.5));
      let path = `M ${x1} ${y} `;
      for (let s = 0; s < steps; s++) {
        const xs = x1 + (x2 - x1) * (s + 0.5) / steps;
        path += `L ${xs} ${s % 2 === 0 ? high : low} `;
      }
      path += `L ${x2} ${y}`;
      segments.push({ d: path, cur });
    } else {
      segments.push({ d: `M ${x1} ${y} L ${x2} ${y}`, cur });
    }
  }
  // ステップ間の縦線を別途追加
  const stepConnectors = [];
  for (let i = 0; i < WATER_PLAN.length - 1; i++) {
    const cur = WATER_PLAN[i];
    const next = WATER_PLAN[i + 1];
    const x = dayToX(next.day_offset);
    const y1 = depthToY(cur.depth_cm);
    const y2 = depthToY(next.depth_cm);
    stepConnectors.push(`M ${x} ${y1} L ${x} ${y2}`);
  }
  return { segments, stepConnectors };
}

export function WaterPlanChart({ transplantYmd }) {
  if (!transplantYmd) {
    return html`<div class="wp-chart-empty">田植え日が未設定</div>`;
  }

  const t = new Date(transplantYmd + 'T00:00:00');
  const today = new Date();
  const daysSince = Math.floor((today - t) / 86400000);
  const { segments, stepConnectors } = buildPath();
  const todayX = dayToX(Math.max(0, daysSince));

  // 現在の段階を特定して y を求める
  let curStage = WATER_PLAN[0];
  for (const s of WATER_PLAN) {
    if (daysSince >= s.day_offset) curStage = s;
    else break;
  }
  const todayY = depthToY(curStage.depth_cm);

  return html`
    <svg class="wp-chart-svg" viewBox=${`0 0 ${W} ${H}`} width="100%" height=${H}
      xmlns="http://www.w3.org/2000/svg">
      <!-- 土の線(底) -->
      <line x1="0" y1=${PAD_T + CHART_H} x2=${W} y2=${PAD_T + CHART_H}
        stroke="#c4b8a0" stroke-width="0.5"/>
      <!-- ステップ間の縦線 -->
      ${stepConnectors.map((d, i) => html`
        <path key=${'c'+i} d=${d} stroke="#7a9aa0" stroke-width="1" fill="none" opacity="0.4"/>
      `)}
      <!-- ステージごとの水位線 -->
      ${segments.map((seg, i) => html`
        <path key=${'s'+i} d=${seg.d} stroke="#5a7a8a" stroke-width="1.5" fill="none"/>
      `)}
      <!-- 現在位置のドット -->
      ${daysSince >= 0 && daysSince <= TOTAL_DAYS && html`
        <circle cx=${todayX} cy=${todayY} r="3.5" fill="#c66d3f"/>
        <circle cx=${todayX} cy=${todayY} r="6" fill="#c66d3f" opacity="0.25"/>
      `}
    </svg>
  `;
}
