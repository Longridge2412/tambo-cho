/**
 * 田んぼ帳 - GAS API ラッパー
 *
 * すべての API 呼び出しはここを通す。
 * CORS 回避のため Content-Type は text/plain で送る(GAS 側で JSON.parse)。
 *
 * 送信失敗対策(2026-08):
 *   - action ごとにタイムアウトを変える(写真アップは90秒)
 *   - 通信エラー/タイムアウト/5xx は自動で指数バックオフ再試行
 *   - 再試行しても安全な action だけを retry 対象にする(GAS 側が batch_id で
 *     二重書き込みを弾くため、addPost / uploadPhoto は再試行してよい)
 *   - 圏外(navigator.onLine === false)は通信せず即座に分かる文言で返す
 */

import { GAS_URL, TIMEOUTS, RETRY } from './config.js';

/** 再試行しても二重登録にならない action(冪等 or 読み取り専用) */
const RETRY_SAFE = {
  ping: true, listMembers: true, listDutyMaster: true, listSeasonTargets: true,
  getTodayContext: true, listVisits: true, listFacilityOps: true, listNotes: true,
  listDutyWeek: true, listDutySwaps: true, listTodos: true,
  uploadPhoto: true,   // Drive にファイルが増えるだけで行は増えない
  addPost: true        // client_batch_id で GAS 側が重複を弾く
};

/** action ごとのタイムアウト */
function timeoutFor(action) {
  if (action === 'uploadPhoto') return TIMEOUTS.UPLOAD;
  if (action === 'addPost') return TIMEOUTS.POST;
  return TIMEOUTS.DEFAULT;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * ネットワーク由来(=再試行する価値がある)のエラーに印をつけるための判定。
 * サーバーが「ヘッダが無い」等のロジックエラーを返した場合は再試行しない。
 */
function isTransient(err) {
  return !!err && err.transient === true;
}

function transient(message) {
  const e = new Error(message);
  e.transient = true;
  return e;
}

/**
 * GAS を1回だけ叩く(再試行なし)。
 */
async function callOnce(action, payload, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify({ action, payload }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      redirect: 'follow',
      signal: controller.signal
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw transient(`${Math.round(timeoutMs / 1000)}秒以内に応答がありませんでした(電波が弱いか、サーバーが混んでいます)`);
    }
    throw transient(`通信できませんでした: ${err.message}`);
  }
  clearTimeout(timeoutId);

  if (!res.ok) {
    // 5xx / 429 は一時的とみなす。4xx はコード側の問題なので再試行しない。
    const msg = `HTTP ${res.status}: ${res.statusText}`;
    if (res.status >= 500 || res.status === 429) throw transient(msg);
    throw new Error(msg);
  }

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    const head = text.slice(0, 160).replace(/\s+/g, ' ');
    // GAS が落ちている/再デプロイ中は HTML のエラーページが返る = 一時的
    throw transient(`サーバーが JSON 以外を返しました。先頭160字: ${head}`);
  }

  if (!json.ok) {
    throw new Error(json.error || 'Unknown API error');
  }
  return json.data;
}

/**
 * GAS の任意のアクションを呼び出す。
 * @param {string} action - dispatch される action 名
 * @param {object} payload - パラメータ
 * @param {object} [opts] - { onRetry(attempt, totalAttempts, err) }
 * @returns {Promise<any>} レスポンスの data 部分
 */
export async function callApi(action, payload = {}, opts = {}) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error(`[${action}] 圏外です。電波の届く場所でもう一度お試しください`);
  }

  const attempts = RETRY_SAFE[action] ? RETRY.ATTEMPTS : 1;
  const timeoutMs = timeoutFor(action);
  let lastErr;

  for (let i = 1; i <= attempts; i++) {
    try {
      return await callOnce(action, payload, timeoutMs);
    } catch (err) {
      lastErr = err;
      const canRetry = i < attempts && isTransient(err);
      if (!canRetry) break;
      if (opts.onRetry) opts.onRetry(i + 1, attempts, err);
      await sleep(RETRY.BASE_DELAY * Math.pow(2, i - 1));
    }
  }

  const suffix = attempts > 1 ? `(${attempts}回試行)` : '';
  throw new Error(`[${action}] ${lastErr.message}${suffix}`);
}

// 個別 API のラッパー(タイポ防止・補完用)
export const api = {
  ping:               () => callApi('ping'),
  listMembers:        () => callApi('listMembers'),
  listDutyMaster:     () => callApi('listDutyMaster'),
  listSeasonTargets:  () => callApi('listSeasonTargets'),
  getTodayContext:    () => callApi('getTodayContext'),
  uploadPhoto:        (payload, opts) => callApi('uploadPhoto', payload, opts),
  addPost:            (payload, opts) => callApi('addPost', payload, opts),
  addVisit:           (payload) => callApi('addVisit', payload),
  listVisits:         (payload) => callApi('listVisits', payload),
  addFacilityOp:      (payload) => callApi('addFacilityOp', payload),
  listFacilityOps:    (payload) => callApi('listFacilityOps', payload),
  addNote:            (payload) => callApi('addNote', payload),
  listNotes:          () => callApi('listNotes'),
  listDutyWeek:       (payload) => callApi('listDutyWeek', payload),
  updateDutyWeek:     (payload) => callApi('updateDutyWeek', payload),
  listDutySwaps:      () => callApi('listDutySwaps'),
  addDutySwap:        (payload) => callApi('addDutySwap', payload),
  acceptDutySwap:     (payload) => callApi('acceptDutySwap', payload),
  updateDutyMaster:   (payload) => callApi('updateDutyMaster', payload),
  listTodos:            () => callApi('listTodos'),
  addTodo:              (payload) => callApi('addTodo', payload),
  updateTodo:           (payload) => callApi('updateTodo', payload),
  completeTodo:         (payload) => callApi('completeTodo', payload),
  deleteVisit:          (payload) => callApi('deleteVisit', payload),
  deleteFacilityOp:     (payload) => callApi('deleteFacilityOp', payload),
  deleteNote:           (payload) => callApi('deleteNote', payload),
  updateVisit:          (payload) => callApi('updateVisit', payload),
  updateFacilityOp:     (payload) => callApi('updateFacilityOp', payload),
  updateNote:           (payload) => callApi('updateNote', payload)
};
