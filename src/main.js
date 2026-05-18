/**
 * 田んぼ帳 - エントリポイント
 *
 * ハッシュベースの簡易ルーティング(#/ と #/visit のみ)。
 * 認証なしのオープン構成なのでルートガードも不要。
 */

const { createElement: h, useState, useEffect } = React;
const { createRoot } = ReactDOM;

import { HomePage } from './pages/Home.js';
import { VisitPage } from './pages/Visit.js';

const html = htm.bind(h);

function App() {
  const [route, setRoute] = useState(window.location.hash || '#/');

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash || '#/');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  switch (route) {
    case '#/visit':
      return html`<${VisitPage} />`;
    case '#/':
    default:
      return html`<${HomePage} />`;
  }
}

const root = createRoot(document.getElementById('root'));
root.render(h(App));
