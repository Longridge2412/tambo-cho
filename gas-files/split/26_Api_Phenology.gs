/**
 * Api_Phenology.gs — 田植え日(paddy_phenology)
 */

function apiListPaddyPhenology() {
  return readSheet('paddy_phenology').map(function (r) {
    return {
      paddy_key:       r.paddy_key,
      paddy_name:      r.paddy_name,
      variety:         r.variety || '',
      transplant_date: toYmd_(r.transplant_date),
      heading_date:    toYmd_(r.heading_date),
      harvest_date:    toYmd_(r.harvest_date)
    };
  });
}

function apiUpdatePaddyPhenology(payload) {
  if (!payload.paddy_key) throw new Error('paddy_key is required');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('paddy_phenology');
  if (!sheet) throw new Error('paddy_phenology シートがありません');
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => String(h == null ? '' : h)
    .replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\u00A0/g, ' ').trim());
  const idxKey       = headers.indexOf('paddy_key');
  const idxTrans     = headers.indexOf('transplant_date');
  const idxHeading   = headers.indexOf('heading_date');
  const idxHarvest   = headers.indexOf('harvest_date');
  if (idxKey < 0) throw new Error('paddy_phenology ヘッダに paddy_key 列がありません(現状: ' + headers.join(', ') + ')');
  const target = String(payload.paddy_key).trim();
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][idxKey] == null ? '' : values[r][idxKey]).trim() === target) {
      if (idxTrans   >= 0 && payload.transplant_date !== undefined) sheet.getRange(r+1, idxTrans+1).setValue(payload.transplant_date || '');
      if (idxHeading >= 0 && payload.heading_date    !== undefined) sheet.getRange(r+1, idxHeading+1).setValue(payload.heading_date || '');
      if (idxHarvest >= 0 && payload.harvest_date    !== undefined) sheet.getRange(r+1, idxHarvest+1).setValue(payload.harvest_date || '');
      return { paddy_key: payload.paddy_key, updated: true };
    }
  }
  const sample = values.slice(1, 4).map(v => String(v[idxKey])).join(' / ');
  throw new Error('paddy_key not found: 探したキー=「' + target + '」, 先頭3件=「' + sample + '」');
}

/** YYYY-MM-DD 文字列に正規化(空・null・Date・文字列いずれも対応) */
