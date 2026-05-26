/**
 * カレンダー タブ — プレースホルダ(Phase C で実装)
 *   - 月表示・投稿量ヒートマップ
 *   - 日付タップで該当日の投稿
 *   - 当番表示も統合
 */
const { createElement: h } = React;
const html = htm.bind(h);
import { Header } from '../components/Header.js';
import { BottomNav } from '../components/BottomNav.js';

export function CalendarPage() {
  return html`
    <div class="screen">
      <${Header} title="カ レ ン ダ ー" subtitle="月ごとに 過去を辿る" />
      <main class="screen-body">
        <section class="placeholder-card">
          <div class="placeholder-mark">田</div>
          <div class="placeholder-title">準備中です</div>
          <div class="placeholder-text">
            月表示・投稿量ヒートマップ・日付タップで投稿閲覧・当番統合 を次の更新で実装します。<br/><br/>
            今は<a href="#/">ホーム</a>からタイムラインを辿ってください。
          </div>
        </section>
      </main>
      <${BottomNav} current="#/calendar" />
    </div>
  `;
}
