/**
 * 田んぼ帳 - GAS API ラッパー
 *
 * すべての API 呼び出しはここを通す。
 * CORS 回避のため Content-Type は text/plain で送る(GAS 側で JSON.parse)。
 */

import { GAS_URL } from './config.js';

/**
 * GAS の任意のアクションを呼び出す。
 * @param {string} action - dispatch される action 名
 * @param {object} payload - パラメータ
 * @returns {Promise<any>} レスポンスの data 部分
 */
export async function callApi(action, payload = {}) {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    body: JSON.stringify({ action, payload }),
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    redirect: 'follow'
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  const json = await res.json();
  if (!json.ok) {
    throw new Error(json.error || 'Unknown API error');
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
  listVisits:         (payload) => callApi('listVisits', payload)
};
