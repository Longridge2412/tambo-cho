/**
 * Todo タブ — プレースホルダ(Phase B で実装)
 */
const { createElement: h } = React;
const html = htm.bind(h);
import { Header } from '../components/Header.js';
import { BottomNav } from '../components/BottomNav.js';

export function TodoPage() {
  return html`
    <div class="screen">
      <${Header} title="T o d o" subtitle="健さんに言われたこと・忘れないこと" />
      <main class="screen-body">
        <section class="placeholder-card">
          <div class="placeholder-mark">✓</div>
          <div class="placeholder-title">準備中です</div>
          <div class="placeholder-text">
            この画面は次の更新で動くようになります。<br/>
            共有(＋)フォームの「Todoに追加」欄も同時に対応します。<br/><br/>
            今は<a href="#/">ホーム</a>か共有(＋)からどうぞ。
          </div>
        </section>
      </main>
      <${BottomNav} current="#/todo" />
    </div>
  `;
}
