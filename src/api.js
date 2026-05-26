/**
 * 田んぼ帳 - GAS API ラッパー
 *
 * すべての API 呼び出しはここを通す。
 * CORS 回避のため Content-Type は text/plain で送る(GAS 側で JSON.parse)。
 */

import { GAS_URL } from './config.js';

/**
 * GAS の任意のアクションを呼び出す。20秒でタイムアウト。
 */
export async function callApi(action, payload = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

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
      throw new Error(`[${action}] 20秒以内に応答がありませんでした。GAS が遅いか、URL が違う可能性。`);
    }
    throw new Error(`[${action}] 通信できませんでした: ${err.message}`);
  }
  clearTimeout(timeoutId);

  if (!res.ok) {
    throw new Error(`[${action}] HTTP ${res.status}: ${res.statusText}`);
  }

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    const head = text.slice(0, 160).replace(/\s+/g, ' ');
    throw new Error(`[${action}] サーバーが JSON 以外を返しました。先頭160字: ${head}`);
  }

  if (!json.ok) {
    throw new Error(`[${action}] ${json.error || 'Unknown API error'}`);
  }
  return json.data;
}

// 個別 API のラッパー(タイポ防止・補完用)
export const api = {
  ping:               () => callApi('ping'),
  listMembers:        () => callApi('listMembers'),
  listDutyMaster:     () => callApi('listDutyMaster'),
  listSeasonTargets:  () => callApi('listSeasonTargets'),
  getTodayContext:    () => callApi('getTodayContext'),
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
  listPaddyPhenology:   () => callApi('listPaddyPhenology'),
  updatePaddyPhenology: (payload) => callApi('updatePaddyPhenology', payload),
  listTodos:            () => callApi('listTodos'),
  addTodo:              (payload) => callApi('addTodo', payload),
  updateTodo:           (payload) => callApi('updateTodo', payload),
  completeTodo:         (payload) => callApi('completeTodo', payload)
};
