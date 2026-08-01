/**
 * 田んぼ帳 - 共通ユーティリティ
 */

import { IMAGE_COMPRESSION } from './config.js';

// ───────────────────────────────────────
// 画像圧縮
// ───────────────────────────────────────

/**
 * File オブジェクトを Data URL に変換しつつ、長辺を MAX_LONG_EDGE に圧縮。
 *
 * さらに、圧縮後のサイズが MAX_BYTES を超えている間は
 *   品質を 0.1 ずつ下げる → それでも駄目なら長辺を 0.8 倍にする
 * を繰り返して収める。電波の弱い田んぼからの送信を通すための保険。
 *
 * @param {File} file - input[type=file] からの File
 * @returns {Promise<string>} data:image/jpeg;base64,... 形式の文字列
 */
export async function compressImageToDataUrl(file) {
  if (!file) return null;

  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);

  const { MAX_LONG_EDGE, JPEG_QUALITY, MAX_BYTES, MIN_QUALITY, MIN_LONG_EDGE } = IMAGE_COMPRESSION;

  let longEdgeLimit = MAX_LONG_EDGE;
  let quality = JPEG_QUALITY;
  let out = renderToJpeg(img, longEdgeLimit, quality);

  // 目標サイズに収まるまで、品質 → 解像度 の順に落とす
  while (dataUrlBytes(out) > MAX_BYTES) {
    if (quality > MIN_QUALITY) {
      quality = Math.max(MIN_QUALITY, quality - 0.1);
    } else if (longEdgeLimit > MIN_LONG_EDGE) {
      longEdgeLimit = Math.max(MIN_LONG_EDGE, Math.round(longEdgeLimit * 0.8));
      quality = JPEG_QUALITY;  // 解像度を落としたら品質は戻す
    } else {
      break;  // これ以上は落とさない(元画像がよほど大きい場合)
    }
    out = renderToJpeg(img, longEdgeLimit, quality);
  }

  return out;
}

/**
 * 長辺 limit・品質 quality で JPEG の data URL にする。
 */
function renderToJpeg(img, longEdgeLimit, quality) {
  const longEdge = Math.max(img.width, img.height);
  const scale = longEdge > longEdgeLimit ? longEdgeLimit / longEdge : 1;
  const targetW = Math.max(1, Math.round(img.width * scale));
  const targetH = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, targetW, targetH);

  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * data URL の実バイト数(base64 部分から概算)。
 */
export function dataUrlBytes(dataUrl) {
  if (!dataUrl) return 0;
  const idx = dataUrl.indexOf(',');
  const b64 = idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
  return Math.round(b64.length * 3 / 4);
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
// LINE 共有テキスト生成
// ───────────────────────────────────────

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

/**
 * 水位評価の表示記号化(◎=適, ○=高, △=低)
 */
export function evalSymbol(text) {
  if (text === '適') return '◎';
  if (text === '高') return '○';
  if (text === '低') return '△';
  return text || '';
}

/**
 * 投稿の日時から、カード背景色クラスを決める。
 *   日の偶奇 × 時間帯(朝〜15時 / 夕16時〜) = 4パターン
 *   - A日 朝: card-c1 (スレートブルー)
 *   - A日 夕: card-c2 (テラコッタ)
 *   - B日 朝: card-c3 (スレートグリーン)
 *   - B日 夕: card-c4 (バーガンディ)
 */
export function cardColorClass(ts) {
  if (!ts) return 'card-c1';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return 'card-c1';
  const dayParity = d.getDate() % 2;
  const isEvening = d.getHours() >= 16;
  if (dayParity === 0 && !isEvening) return 'card-c1';
  if (dayParity === 0 &&  isEvening) return 'card-c2';
  if (dayParity === 1 && !isEvening) return 'card-c3';
  return 'card-c4';
}
