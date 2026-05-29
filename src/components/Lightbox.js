/**
 * ライトボックス(投稿写真の全画面拡大表示)
 *
 *   - 背景タップ・✕ボタン・ESC キーで閉じる
 *   - Drive の高解像度URL(=w1600)で表示
 */

const { createElement: h, useEffect } = React;
const html = htm.bind(h);

export function Lightbox({ url, onClose }) {
  useEffect(() => {
    if (!url) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    // body スクロールを止める
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [url, onClose]);

  if (!url) return null;

  return html`
    <div class="lightbox" onClick=${onClose}>
      <button class="lightbox-close" type="button"
        onClick=${(e) => { e.stopPropagation(); onClose(); }}>✕</button>
      <img class="lightbox-img" src=${url} alt="拡大写真"/>
    </div>
  `;
}

/**
 * 投稿カードの thumb URL(=w600 など) を、拡大表示用の高解像度URL(=w1600) に変換。
 */
export function toLightboxUrl(url) {
  if (!url) return '';
  // /file/d/{id}/view 形式
  const m = String(url).match(/\/file\/d\/([^/]+)\//);
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w1600`;
  // 既に lh3 形式(=w600 など)
  return String(url).replace(/=w\d+$/, '=w1600').replace(/=s\d+$/, '=s2000');
}
