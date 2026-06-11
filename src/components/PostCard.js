/**
 * 投稿カード(共通)
 *
 * Home / Calendar の両方で使う投稿グループ表示カード。
 * item は services/feed.js の buildFeedGroups が作るグループ:
 *   { key, ts, by, parts: { visit?, facility?, note? } }
 * 1回の共有(batch_id)で作られた見回り・堤の操作・覚書を1枚にまとめて表示する。
 *
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

export function PostCard({ item, onEdit, onDelete, onPhotoClick }) {
  const { visit, facility, note } = item.parts;
  const initial = (item.by || '?').charAt(0);
  const avatarUrl = avatarFor(item.by);
  const colorClass = cardColorClass(item.ts);

  // 写真(visit の2枚 + facility/note の1枚ずつ)
  const photos = [];
  if (visit) {
    if (visit.water_level_photo_url) photos.push({ label: '三畝', url: convertDriveUrl(visit.water_level_photo_url) });
    if (visit.field2_photo_url)      photos.push({ label: '一反', url: convertDriveUrl(visit.field2_photo_url) });
  }
  if (facility && facility.photo_url) photos.push({ label: '', url: convertDriveUrl(facility.photo_url) });
  if (note && note.photo_url)         photos.push({ label: '', url: convertDriveUrl(note.photo_url) });

  // タグ
  const tags = [];
  if (visit) {
    if (visit.water_level_eval) tags.push(`三畝 ${evalSymbol(visit.water_level_eval)}`);
    if (visit.field2_eval)      tags.push(`一反 ${evalSymbol(visit.field2_eval)}`);
    if (visit.stream_status)    tags.push(`疎水 ${visit.stream_status}`);
  }
  if (facility) {
    tags.push(`${facility.target}${facility.action ? ' ' + facility.action : ''}`);
  }

  // 本文(通常はどれか1つだけ入っている)
  const bodies = [];
  if (visit && visit.free_note) bodies.push(visit.free_note);
  if (facility && (facility.reason || facility.coordination_note)) {
    bodies.push(facility.reason || facility.coordination_note);
  }
  if (note && (note.content || note.body)) bodies.push(note.content || note.body);

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

      ${bodies.map((b, i) => html`<div class="post-body" key=${i}>${b}</div>`)}

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
