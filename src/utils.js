/**
 * 田んぼ帳 - 共通ユーティリティ
 */

import { IMAGE_COMPRESSION, TIME_PERIODS } from './config.js';

// ───────────────────────────────────────
// 画像圧縮
// ───────────────────────────────────────

/**
 * File オブジェクトを Data URL に変換しつつ、長辺を MAX_LONG_EDGE に圧縮。
 * @param {File} file - input[type=file] からの File
 * @returns {Promise<string>} data:image/jpeg;base64,... 形式の文字列
 */
export async function compressImageToDataUrl(file) {
  if (!file) return null;

  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);

  const { MAX_LONG_EDGE, JPEG_QUALITY } = IMAGE_COMPRESSION;

  // 長辺基準でスケール計算
  const longEdge = Math.max(img.width, img.height);
  const scale = longEdge > MAX_LONG_EDGE ? MAX_LONG_EDGE / longEdge : 1;
  const targetW = Math.round(img.width * scale);
  const targetH = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, targetW, targetH);

  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ───────────────────────────────────────
// 日付フォーマット
// ───────────────────────────────────────

const KANSUJI = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const MONTHS_JP = ['睦月', '如月', '弥生', '卯月', '皐月', '水無月', '文月', '葉月', '長月', '神無月', '霜月', '師走'];

/**
 * 日付を「五月十六日 土」のような和暦調表記に。
 */
export function formatJapaneseDate(dateInput) {
  const d = new Date(dateInput);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dow = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];

  return `${kanjiNumber(month)}月${kanjiNumber(day)}日 ${dow}`;
}

function kanjiNumber(n) {
  if (n < 10) return KANSUJI[n];
  if (n === 10) return '十';
  if (n < 20) return `十${KANSUJI[n - 10]}`;
  if (n < 30) return `二十${n === 20 ? '' : KANSUJI[n - 20]}`;
  if (n < 32) return `三十${n === 30 ? '' : KANSUJI[n - 30]}`;
  return String(n);
}

/**
 * 経過時間を「○時間前」「○分前」表記に。
 */
export function formatElapsed(dateInput) {
  const d = new Date(dateInput);
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'たった今';
  if (min < 60) return `${min} 分前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} 時間前`;
  const day = Math.floor(hour / 24);
  return `${day} 日前`;
}

/**
 * 経過ミリ秒を「○時間○分」表記に。
 */
export function formatDuration(ms) {
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 1) return '1分未満';
  if (totalMin < 60) return `${totalMin}分`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `${h}時間` : `${h}時間${m}分`;
}

/**
 * 短い日付表記(5/15 7:15)
 */
export function formatShort(dateInput) {
  const d = new Date(dateInput);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${m}/${day} ${h}:${min}`;
}

// ───────────────────────────────────────
// 時間判定(朝/夕)
// ───────────────────────────────────────

/**
 * 現在時刻が朝・夕・その他のどれかを返す。
 * @returns {'morning' | 'evening' | 'other'}
 */
export function getCurrentPeriod() {
  const hour = new Date().getHours();
  const { MORNING_START, MORNING_END, EVENING_START, EVENING_END } = TIME_PERIODS;
  if (hour >= MORNING_START && hour < MORNING_END) return 'morning';
  if (hour >= EVENING_START && hour < EVENING_END) return 'evening';
  return 'other';
}

// ───────────────────────────────────────
// LINE 共有テキスト生成
// ───────────────────────────────────────

/**
 * 見回り記録から LINE 共有用のテキストを生成。
 * @param {object} visit - 見回り記録
 * @param {string} memberName - 訪問者名
 * @returns {string}
 */
export function buildVisitShareText(visit, memberName) {
  const d = new Date(visit.visited_at);
  const dateStr = `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`;
  const timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;

  const period = (() => {
    const h = d.getHours();
    if (h >= 5 && h < 11) return '朝の見回り';
    if (h >= 16 && h < 21) return '夕の見回り';
    return '見回り';
  })();

  const lines = [
    `🌾 田んぼ報告 ${memberName}`,
    `${dateStr} ${timeStr}(${period})`,
    ``,
    `【三畝の田】水位:${visit.water_level_eval || '?'}`,
    `【一反の田】水位:${visit.field2_eval || '?'}`,
    `カイヌマ疎水:${visit.stream_status || '?'}`
  ];

  if (visit.free_note && visit.free_note.trim()) {
    lines.push(``);
    lines.push(visit.free_note.trim());
  }

  return lines.join('\n');
}

/**
 * 共用設備操作から LINE 共有用のテキストを生成。
 * @param {object} op - facility_op
 * @param {string} memberName - 操作者名
 * @param {object|null} pairedOp - 紐付け元の「開けた」記録(閉めた時のみ)
 * @returns {string}
 */
export function buildFacilityShareText(op, memberName, pairedOp) {
  const d = new Date(op.operated_at);
  const dateStr = `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`;
  const timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;

  const lines = [
    `🚰 共用設備操作 ${memberName}`,
    `${dateStr} ${timeStr}`,
    ``
  ];

  // 対象 + 動作
  if (op.target === '堤') {
    lines.push(`堤を${op.action}`);
  } else if (op.target === '三つ又') {
    lines.push(op.action && op.action !== 'その他' ? `三つ又: ${op.action}` : `三つ又を操作`);
  } else {
    lines.push(op.action && op.action !== 'その他' ? `${op.target}: ${op.action}` : `${op.target}を操作`);
  }

  if (op.reason) lines.push(`理由:${op.reason}`);
  if (op.coordination_note) {
    lines.push(``);
    lines.push(op.coordination_note);
  }

  // 開けた → 閉め忘れ防止
  if (op.target === '堤' && op.action === '開けた') {
    lines.push(``);
    lines.push('※後で閉めるのを忘れずに');
  }
  // 閉めた → 対応する開けた記録への参照
  if (op.target === '堤' && op.action === '閉めた' && pairedOp) {
    const od = new Date(pairedOp.operated_at);
    const odStr = `${od.getMonth()+1}/${od.getDate()} ${String(od.getHours()).padStart(2,'0')}:${String(od.getMinutes()).padStart(2,'0')}`;
    const durMs = d.getTime() - od.getTime();
    lines.push('');
    lines.push(`(${pairedOp.display_name || pairedOp.member_id} が ${odStr} に開けたものに対応)`);
    if (durMs > 0) lines.push(`開けていた時間:${formatDuration(durMs)}`);
  }

  return lines.join('\n');
}

/**
 * テキストをクリップボードにコピー(モダンAPI、フォールバック付き)。
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    // フォールバック:textarea経由
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      return true;
    } catch (e2) {
      return false;
    } finally {
      document.body.removeChild(ta);
    }
  }
}

/**
 * 共有フォームから作られたレコード群を、LINE貼り付け用の1つのテキストにまとめる。
 *
 * @param {object} parts
 *   - memberName: 投稿者名
 *   - visit:    {water_level_eval, field2_eval, stream_status, free_note, photos: number} | null
 *   - facility: {action} | null  (堤前提)
 *   - note:     {content, has_photo: bool} | null
 *   - todo:     {content, due_date} | null
 */
export function buildComposeShareText(parts) {
  const d = new Date();
  const dateStr = `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`;
  const timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  const h = d.getHours();
  const period = (h >= 5 && h < 11) ? '朝' : (h >= 16 && h < 21) ? '夕' : '';
  const lines = [
    `🌾 NEO百 ${parts.memberName || ''}`,
    `${dateStr} ${timeStr}${period ? '(' + period + ')' : ''}`
  ];

  const v = parts.visit, f = parts.facility, n = parts.note, t = parts.todo;
  let bodyAdded = false;

  // 水位ブロック
  if (v) {
    const block = [];
    if (v.water_level_eval) block.push(`【三畝の田】水位:${v.water_level_eval}`);
    if (v.field2_eval)      block.push(`【一反の田】水位:${v.field2_eval}`);
    if (v.stream_status)    block.push(`カイヌマ疎水:${v.stream_status}`);
    if (v.photos)           block.push(`写真:${v.photos}枚`);
    if (block.length) { lines.push(''); lines.push(...block); }
  }

  // 堤ブロック
  if (f && f.action) {
    lines.push('');
    lines.push(`🚰 堤を${f.action}`);
  }

  // 本文(優先: visit.free_note → facility.reason → note.content)
  const body = (v && v.free_note) || (f && f.reason) || (n && n.content) || '';
  if (body) {
    lines.push('');
    lines.push(body);
    bodyAdded = true;
  }

  // 覚書写真
  if (n && n.has_photo && !bodyAdded) {
    lines.push('');
    lines.push('(写真あり)');
  } else if (n && n.has_photo) {
    lines.push('(写真あり)');
  }

  // Todo
  if (t && t.content) {
    lines.push('');
    lines.push(`✓ Todo追加: ${t.content}${t.due_date ? '(期日 ' + t.due_date + ')' : ''}`);
  }

  return lines.join('\n');
}
