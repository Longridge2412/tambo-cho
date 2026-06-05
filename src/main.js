/**
 * 田んぼ帳 - エントリポイント
 *
 * ハッシュベースの簡易ルーティング + ErrorBoundary。
 * 起動時のスプラッシュ(白地 NEO百ロゴ)は index.html 側の closeSplash で閉じる。
 */

const { createElement: h, useState, useEffect, Component } = React;
const { createRoot } = ReactDOM;

import { HomePage } from './pages/Home.js';
import { ComposePage } from './pages/Compose.js';
import { TodoPage } from './pages/Todo.js';
import { CalendarPage } from './pages/Calendar.js';

const html = htm.bind(h);

// React のレンダリング時エラーを赤バーに転送する Error Boundary
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error: error };
  }
  componentDidCatch(error, info) {
    console.error('[ReactErr]', error, info && info.componentStack);
  }
  render() {
    if (this.state.error) {
      return h('div', { style: { padding: '24px', fontFamily: 'sans-serif' } },
        '画面の描画に失敗しました。上の赤いバーに原因が表示されています。'
      );
    }
    return this.props.children;
  }
}

function App() {
  const [route, setRoute] = useState(window.location.hash || '#/');

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash || '#/');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  let page;
  switch (route) {
    case '#/compose':  page = html`<${ComposePage} />`; break;
    case '#/todo':     page = html`<${TodoPage} />`;    break;
    case '#/calendar': page = html`<${CalendarPage} />`; break;
    case '#/':
    default:           page = html`<${HomePage} />`;
  }
  return html`<${ErrorBoundary}>${page}</${ErrorBoundary}>`;
}

const root = createRoot(document.getElementById('root'));
root.render(h(App));
