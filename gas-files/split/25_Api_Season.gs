/**
 * Api_Season.gs — 季節目標 + ホームコンテキスト
 */

function apiListSeasonTargets() {
  return readSheet(SHEET_NAMES.SEASON_TARGETS);
}

/**
 * ホーム画面用の今日のコンテキストを一括取得。
 * 1リクエストで済むようにまとめる(田んぼでの通信を減らす目的)。
 *
 * パフォーマンス最適化:
 * - 全シートを1回ずつだけ読む(readSheet の呼び出しを最小化)
 * - members を1回だけ読んでマップ化、複数箇所で再利用
 */

function apiGetTodayContext() {
  const now = new Date();
  const dayOfWeekMap = ['日', '月', '火', '水', '木', '金', '土'];
  const dayJp = dayOfWeekMap[now.getDay()];
  const tomorrowJp = dayOfWeekMap[(now.getDay() + 1) % 7];

  // 全シートを1回ずつだけ読む
  const members       = readSheet(SHEET_NAMES.MEMBERS);
  const dutyMaster    = readSheet(SHEET_NAMES.DUTY_MASTER);
  const seasonTargets = readSheet(SHEET_NAMES.SEASON_TARGETS);
  const visits        = readSheet(SHEET_NAMES.VISITS);
  const facilityOps   = readSheet(SHEET_NAMES.FACILITY_OPS);

  const memberMap = {};
  members.forEach(m => { memberMap[m.member_id] = m.display_name; });

  // 1. 本日の当番
  const todayDuty = dutyMaster
    .filter(r => r.day_of_week === dayJp)
    .map(r => ({ ...r, display_name: memberMap[r.member_id] || '?' }))
    .sort((a, b) => Number(a.slot) - Number(b.slot));

  // 1.5. 明日の当番
  const tomorrowDuty = dutyMaster
    .filter(r => r.day_of_week === tomorrowJp)
    .map(r => ({ ...r, display_name: memberMap[r.member_id] || '?' }))
    .sort((a, b) => Number(a.slot) - Number(b.slot));

  // 2. 季節別目標
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const today_md = `${mm}-${dd}`;
  let target = null;
  for (const t of seasonTargets) {
    const startMd = toMd_(t.start_md);
    const endMd   = toMd_(t.end_md);
    if (isWithin(today_md, startMd, endMd)) {
      target = {
        target_label: t.target_label,
        period_label: t.period_label,
        description: t.description
      };
      break;
    }
  }

  // 3. 直近の見回り(新しい順、3件)
  const sortedVisits = visits.slice().sort((a, b) =>
    String(b.visited_at || '').localeCompare(String(a.visited_at || ''))
  );
  const recentVisits = sortedVisits.slice(0, 3).map(v => ({
    ...v,
    display_name: memberMap[v.member_id] || '?'
  }));

  // 4. 未完了の堤(開けたまま閉めていない)
  const pairedSet = {};
  facilityOps.forEach(o => {
    if (o.target === '堤' && o.action === '閉めた' && o.paired_op_id) {
      pairedSet[o.paired_op_id] = true;
    }
  });
  const pendingTsutsumi = facilityOps
    .filter(o => o.target === '堤' && o.action === '開けた' && !pairedSet[o.op_id])
    .map(o => ({ ...o, display_name: memberMap[o.member_id] || '?' }))
    .sort((a, b) => String(b.operated_at || '').localeCompare(String(a.operated_at || '')));

  // 5. 共用設備の動き(直近2件)
  const recentFacilityOps = facilityOps
    .slice()
    .sort((a, b) => String(b.operated_at || '').localeCompare(String(a.operated_at || '')))
    .slice(0, 2)
    .map(o => ({ ...o, display_name: memberMap[o.member_id] || '?' }));

  return {
    today: {
      date_iso: now.toISOString(),
      day_of_week: dayJp,
      today_duty: todayDuty,
      tomorrow_day_of_week: tomorrowJp,
      tomorrow_duty: tomorrowDuty
    },
    target: target,
    latest_visit: recentVisits[0] || null,
    recent_visits: recentVisits,
    pending_tsutsumi: pendingTsutsumi,
    recent_facility_ops: recentFacilityOps
  };
}

/**
 * MM-DD 形式の3つの値を比較し、today が start..end の期間内かを判定。
 * 期間が年をまたぐケース(例: 12-15 から 01-15)にも対応。
 */
