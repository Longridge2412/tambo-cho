/**
 * トグルボタン群(高/適/低、開けた/閉めた など)
 *
 * 同じ値をもう一度タップすると解除('')になる。
 * Compose / EditPost で共用。
 */

const { createElement: h } = React;
const html = htm.bind(h);

export function ToggleGroup({ options, value, onChange }) {
  return html`
    <div class="toggle-group">
      ${options.map(opt => html`
        <button key=${opt} type="button"
          class=${`toggle-btn ${value === opt ? 'active' : ''}`}
          onClick=${() => onChange(value === opt ? '' : opt)}>${opt}</button>
      `)}
    </div>
  `;
}
