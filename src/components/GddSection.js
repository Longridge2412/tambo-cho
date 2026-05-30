/**
 * 稲の暦(積算温度)セクション(独立コンポーネント)
 *
 * props:
 *   - phenology: api.listPaddyPhenology() の結果配列 + progress
 *   - error: 取得エラー時の文字列
 */

const { createElement: h } = React;
const html = htm.bind(h);

function ymdToMd(ymd) {
  if (!ymd) return '';
  const d = new Date(ymd + 'T00:00:00');
  if (isNaN(d.getTime())) return ymd;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function GddSection({ phenology, error }) {
  return html`
    <section class="gdd-section">
      <div class="gdd-section-title">稲 の 暦</div>
      ${!phenology && !error && html`<div class="empty-note">気温データを読み込み中…</div>`}
      ${error && html`<div class="empty-note">気温データの取得に失敗しました</div>`}
      ${phenology && phenology.map(r => html`
        <div class="gdd-bigcard" key=${r.paddy_key}>
          <div class="gdd-bigcard-head">
            <span class="gdd-bigcard-name">${r.paddy_name}</span>
            ${r.progress && html`<span class="gdd-bigcard-days">田植え ${r.progress.days}日目</span>`}
          </div>
          ${r.progress
            ? html`
              <div class="gdd-bigcard-figure">${r.progress.gdd}<span class="gdd-bigcard-unit">°C·日</span></div>
              <div class="gdd-bigcard-bar"><div class="gdd-bigcard-bar-fill" style=${`width:${r.progress.pct}%`}></div></div>
              <div class="gdd-bigcard-meta">
                <span>目標 ${r.progress.target}°C·日</span>
                ${r.progress.predicted_date && html`
                  <span class="gdd-bigcard-pred">
                    ${r.progress.phase === 'transplant_to_heading' ? '出穂見込み' : '刈取り適期'}
                    ${ymdToMd(r.progress.predicted_date)}ごろ
                  </span>
                `}
              </div>
            `
            : html`<div class="gdd-bigcard-empty">田植え日が未設定</div>`
          }
        </div>
      `)}
    </section>
  `;
}
