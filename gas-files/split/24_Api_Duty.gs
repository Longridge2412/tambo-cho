/**
 * Api_Duty.gs — 当番マスター/週/代行
 */

function apiListDutyMaster() {
  const rows = readSheet(SHEET_NAMES.DUTY_MASTER);
  const members = readSheet(SHEET_NAMES.MEMBERS);
  const memberMap = {};
  members.forEach(m => { memberMap[m.member_id] = m.display_name; });

  return rows.map(r => ({
    day_of_week: r.day_of_week,
    member_id: r.member_id,
    display_name: memberMap[r.member_id] || '?',
    slot: r.slot
  }));
}

function apiUpdateDutyMaster(payload) {
  if (!payload.day_of_week) throw new Error('day_of_week is required');
  if (!payload.slot) throw new Error('slot is required');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.DUTY_MASTER);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idxDow = headers.indexOf('day_of_week');
  const idxSlot = headers.indexOf('slot');
  const idxMember = headers.indexOf('member_id');
  const slot = Number(payload.slot);
  for (let r = 1; r < values.length; r++) {
    if (values[r][idxDow] === payload.day_of_week && Number(values[r][idxSlot]) === slot) {
      sheet.getRange(r + 1, idxMember + 1).setValue(payload.member_id || '');
      return { day_of_week: payload.day_of_week, slot: slot, member_id: payload.member_id, updated: true };
    }
  }
  sheet.appendRow([payload.day_of_week, payload.member_id || '', slot]);
  return { day_of_week: payload.day_of_week, slot: slot, member_id: payload.member_id, created: true };
}


/**
 * 指定日に member_id が担当している slot(1 or 2)を返す。無ければ null。
 */

function apiListDutyWeek(payload) {
  const weekStart = payload && payload.week_start;
  if (!weekStart) throw new Error('week_start is required (YYYY-MM-DD)');

  const members = readSheet(SHEET_NAMES.MEMBERS);
  const memberMap = {};
  members.forEach(m => { memberMap[m.member_id] = m.display_name; });

  const dutyMaster = readSheet(SHEET_NAMES.DUTY_MASTER);
  const dutyWeek = readSheet(SHEET_NAMES.DUTY_WEEK);

  const dowNames = ['日', '月', '火', '水', '木', '金', '土'];
  const base = new Date(weekStart + 'T00:00:00');

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(base.getTime() + i * 86400000);
    const dateStr = formatYmd_(d);
    const dowJp = dowNames[d.getDay()];

    const duties = [];
    for (let slot = 1; slot <= 2; slot++) {
      let override = null;
      for (const w of dutyWeek) {
        if (formatYmd_(new Date(w.target_date)) === dateStr && Number(w.slot) === slot) {
          override = w;
          break;
        }
      }
      let memberId = '', isModified = false, modifiedBy = '';
      if (override) {
        memberId = override.member_id;
        isModified = true;
        modifiedBy = override.modified_by || '';
      } else {
        const m = dutyMaster.find(r => r.day_of_week === dowJp && Number(r.slot) === slot);
        memberId = m ? m.member_id : '';
      }
      duties.push({
        slot: slot,
        member_id: memberId,
        display_name: memberMap[memberId] || '',
        is_modified: isModified,
        modified_by: modifiedBy
      });
    }
    days.push({ date: dateStr, day_of_week: dowJp, duties: duties });
  }
  return { week_start: weekStart, days: days };
}

/**
 * 今週の当番を変更(duty_week に特例を記録)。
 */

function apiUpdateDutyWeek(payload) {
  if (!payload.target_date) throw new Error('target_date is required');
  if (!payload.slot) throw new Error('slot is required');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.DUTY_WEEK);
  const now = new Date().toISOString();
  const targetDate = String(payload.target_date);
  const slot = Number(payload.slot);

  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idxDate = headers.indexOf('target_date');
  const idxSlot = headers.indexOf('slot');
  const idxMember = headers.indexOf('member_id');
  const idxModFlag = headers.indexOf('is_modified');
  const idxModBy = headers.indexOf('modified_by');
  const idxModAt = headers.indexOf('modified_at');

  for (let r = 1; r < values.length; r++) {
    const rowDate = formatYmd_(new Date(values[r][idxDate]));
    if (rowDate === targetDate && Number(values[r][idxSlot]) === slot) {
      const rowNum = r + 1;
      sheet.getRange(rowNum, idxMember + 1).setValue(payload.member_id || '');
      sheet.getRange(rowNum, idxModFlag + 1).setValue(true);
      sheet.getRange(rowNum, idxModBy + 1).setValue(payload.modified_by || '');
      sheet.getRange(rowNum, idxModAt + 1).setValue(now);
      return { target_date: targetDate, slot: slot, member_id: payload.member_id, updated: true };
    }
  }
  const duty_id = generateId('d', sheet);
  sheet.appendRow([
    duty_id, targetDate, payload.member_id || '', slot,
    true, payload.modified_by || '', now
  ]);
  return { target_date: targetDate, slot: slot, member_id: payload.member_id, created: true };
}

/**
 * 代行依頼の一覧(未受諾を上、その後 requested_at 新しい順)。
 */

function apiListDutySwaps() {
  const members = readSheet(SHEET_NAMES.MEMBERS);
  const memberMap = {};
  members.forEach(m => { memberMap[m.member_id] = m.display_name; });
  const rows = readSheet(SHEET_NAMES.DUTY_SWAPS);
  return rows
    .map(s => ({
      ...s,
      original_name: memberMap[s.original_member_id] || '',
      substitute_name: memberMap[s.substitute_member_id] || ''
    }))
    .sort((a, b) => {
      const aAcc = a.accepted_at ? 1 : 0;
      const bAcc = b.accepted_at ? 1 : 0;
      if (aAcc !== bAcc) return aAcc - bAcc;
      return String(b.requested_at || '').localeCompare(String(a.requested_at || ''));
    });
}

/**
 * 代行依頼を作成。
 */

function apiAddDutySwap(payload) {
  if (!payload.original_member_id) throw new Error('original_member_id is required');
  if (!payload.target_date) throw new Error('target_date is required');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.DUTY_SWAPS);
  const swap_id = generateId('s', sheet);
  const now = new Date().toISOString();
  sheet.appendRow([
    swap_id,
    String(payload.target_date),
    payload.original_member_id,
    '',
    now,
    '',
    payload.note || ''
  ]);
  return { swap_id, target_date: payload.target_date, original_member_id: payload.original_member_id };
}

/**
 * 代行依頼を受諾。
 */

function apiAcceptDutySwap(payload) {
  if (!payload.swap_id) throw new Error('swap_id is required');
  if (!payload.substitute_member_id) throw new Error('substitute_member_id is required');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.DUTY_SWAPS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idxId = headers.indexOf('swap_id');
  const idxOrig = headers.indexOf('original_member_id');
  const idxDate = headers.indexOf('target_date');
  const idxSub = headers.indexOf('substitute_member_id');
  const idxAcc = headers.indexOf('accepted_at');
  const now = new Date().toISOString();

  let targetDate = null, originalMember = null;
  for (let r = 1; r < values.length; r++) {
    if (values[r][idxId] === payload.swap_id) {
      const rowNum = r + 1;
      sheet.getRange(rowNum, idxSub + 1).setValue(payload.substitute_member_id);
      sheet.getRange(rowNum, idxAcc + 1).setValue(now);
      targetDate = formatYmd_(new Date(values[r][idxDate]));
      originalMember = values[r][idxOrig];
      break;
    }
  }
  if (targetDate === null) throw new Error('swap not found: ' + payload.swap_id);

  // 当番表も書き換え:その日に originalMember が担当している枠を substitute に
  const slot = findDutySlot_(targetDate, originalMember);
  let dutyUpdated = false;
  if (slot) {
    apiUpdateDutyWeek({
      target_date: targetDate,
      slot: slot,
      member_id: payload.substitute_member_id,
      modified_by: payload.substitute_member_id
    });
    dutyUpdated = true;
  }

  return { swap_id: payload.swap_id, accepted: true, duty_updated: dutyUpdated };
}

/**
 * マスター当番表を更新。
 */

function findDutySlot_(targetDate, memberId) {
  const dowNames = ['日', '月', '火', '水', '木', '金', '土'];
  const d = new Date(targetDate + 'T00:00:00');
  const dowJp = dowNames[d.getDay()];
  const dutyMaster = readSheet(SHEET_NAMES.DUTY_MASTER);
  const dutyWeek = readSheet(SHEET_NAMES.DUTY_WEEK);
  for (let slot = 1; slot <= 2; slot++) {
    let mid = null;
    for (const w of dutyWeek) {
      if (formatYmd_(new Date(w.target_date)) === targetDate && Number(w.slot) === slot) {
        mid = w.member_id;
        break;
      }
    }
    if (mid === null) {
      const m = dutyMaster.find(r => r.day_of_week === dowJp && Number(r.slot) === slot);
      mid = m ? m.member_id : '';
    }
    if (mid === memberId) return slot;
  }
  return null;
}

// ─────────────────────────────────────────
// 田んぼフェノロジー(田植え/出穂/収穫日)API
//   sheet: paddy_phenology
//   columns: paddy_key, paddy_name, variety, transplant_date, heading_date, harvest_date
// ─────────────────────────────────────────
