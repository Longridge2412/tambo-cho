/**
 * 投稿カード(共通)
 *
 * Home / Calendar の両方で使う、見回り・堤の操作・覚書を表示するカード。
 * 写真タップで onPhotoClick(url) を呼ぶ。
 * 編集/削除ボタンは onEdit/onDelete が渡された時のみ表示。
 */

const { createElement: h } = React;
const html = htm.bind(h);

import { formatShort, evalSymbol, cardColorClass } from '../utils.js';
import { avatarFor } from '../data/member_avatars.js';

function convertDriveUrl(url) {
  if (!url) return '';
  const m = String(url).match(/\/file\/d\/([^/]+)\//);
  if (!m) return url;
  return `https://lh3.googleusercontent.com/d/${m[1]}=w600`;
}
function truncate(s, n) {
  if (!s) return '';
  s = String(s);
  return s.length > n ? s.slice(0, n) + '…' : s;
}

export function PostCard({ item, onEdit, onDelete, onPhotoClick }) {
  const v = item.data;
  const initial = (item.by || '?').charAt(0);
  const avatarUrl = avatarFor(item.by);
  const colorClass = cardColorClass(item.ts);

  // 写真
  const photos = [];
  if (item.type === 'visit') {
    if (v.water_level_photo_url) photos.push({ label: '三畝', url: convertDriveUrl(v.water_level_photo_url) });
    if (v.field2_photo_url)      photos.push({ label: '一反', url: convertDriveUrl(v.field2_photo_url) });
  } else if (item.type === 'facility' && v.photo_url) {
    photos.push({ label: '', url: convertDriveUrl(v.photo_url) });
  } else if (item.type === 'note' && v.photo_url) {
    photos.push({ label: '', url: convertDriveUrl(v.photo_url) });
  }

  // タグ
  const tags = [];
  if (item.type === 'visit') {
    if (v.water_level_eval) tags.push(`三畝 ${evalSymbol(v.water_level_eval)}`);
    if (v.field2_eval)      tags.push(`一反 ${evalSymbol(v.field2_eval)}`);
    if (v.stream_status)    tags.push(`疎水 ${v.stream_status}`);
  } else if (item.type === 'facility') {
    tags.push(`${v.target}${v.action ? ' ' + v.action : ''}`);
  }

  // 本文
  let body = '';
  if (item.type === 'visit')          body = v.free_note || '';
  else if (item.type === 'facility')  body = v.reason || v.coordination_note || '';
  else if (item.type === 'note')      body = v.content || v.body || '';

  return html`
    <article class=${`post ${colorClass}`}>
      <header class="post-head">
        ${avatarUrl
          ? html`<img class="post-avatar-img" src=${avatarUrl} alt=${item.by}/>`
          : html`<div class="post-avatar">${initial}</div>`
        }
        <div class="post-meta">
          <div class="post-by">${item.by}</div>
          <div class="post-time">${formatShort(item.ts)}</div>
        </div>
      </header>

      ${photos.length > 0 && html`
        <div class=${`post-photos count-${photos.length}`}>
          ${photos.map(p => html`
            <div class="post-photo-cell" key=${p.url}
              onClick=${() => onPhotoClick && onPhotoClick(p.url)}>
              <img class="post-photo" src=${p.url} alt=${p.label}/>
              ${p.label && html`<span class="post-photo-label">${p.label}</span>`}
            </div>
          `)}
        </div>
      `}

      ${tags.length > 0 && html`
        <div class="post-tags">
          ${tags.map(t => html`<span class="post-tag" key=${t}>${t}</span>`)}
        </div>
      `}

      ${body && html`<div class="post-body">${body}</div>`}

      ${(onEdit || onDelete) && html`
        <div class="post-foot">
          ${onEdit && html`<button class="post-edit-btn" type="button"
            onClick=${() => onEdit(item)}>編集</button>`}
          ${onDelete && html`<button class="post-delete-btn" type="button"
            onClick=${() => onDelete(item)}>削除</button>`}
        </div>
      `}
    </article>
  `;
}
