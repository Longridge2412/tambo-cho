/**
 * 苗が水に浸かる小イラスト
 *   苗半分 ≒ 水位 50% を想定。waterLevel(0=なし, 1=満水)で水位を調整。
 */
const { createElement: h } = React;
const html = htm.bind(h);

export function PaddyIllustration({ waterLevel = 0.5 }) {
  // viewBox 0..100  (横) × 0..60 (縦)
  // 0=底, 50=苗中央, 60=最上苗先
  const waterTop = 50 - waterLevel * 30;  // 0 = 50(完全に乾), 1 = 20(深水)

  return html`
    <svg viewBox="0 0 100 60" width="100" height="60" xmlns="http://www.w3.org/2000/svg">
      <!-- 土 -->
      <rect x="0" y="50" width="100" height="10" fill="#8b6f47"/>
      <!-- 水 -->
      <rect x="0" y=${waterTop} width="100" height=${50 - waterTop}
        fill="#7a9aa0" opacity="0.55"/>
      <line x1="0" y1=${waterTop} x2="100" y2=${waterTop}
        stroke="#5a7a80" stroke-width="0.6" stroke-dasharray="2,2"/>
      <!-- 苗 4本(水面から上下に出ている) -->
      <g stroke="#5a7a3a" stroke-width="1.4" fill="none" stroke-linecap="round">
        <path d="M 18 50 L 18 8"/>
        <path d="M 18 14 L 14 10"/>
        <path d="M 18 18 L 22 14"/>
        <path d="M 40 50 L 40 6"/>
        <path d="M 40 12 L 36 8"/>
        <path d="M 40 16 L 44 12"/>
        <path d="M 60 50 L 60 10"/>
        <path d="M 60 16 L 56 12"/>
        <path d="M 60 20 L 64 16"/>
        <path d="M 82 50 L 82 8"/>
        <path d="M 82 14 L 78 10"/>
        <path d="M 82 18 L 86 14"/>
      </g>
    </svg>
  `;
}
