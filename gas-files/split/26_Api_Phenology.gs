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
  const headers = values[0];
  const idxKey       = headers.indexOf('paddy_key');
  const idxTrans     = headers.indexOf('transplant_date');
  const idxHeading   = headers.indexOf('heading_date');
  const idxHarvest   = headers.indexOf('harvest_date');
  if (idxKey < 0) throw new Error('paddy_phenology ヘッダ不備');
  for (let r = 1; r < values.length; r++) {
    if (values[r][idxKey] === payload.paddy_key) {
      if (idxTrans   >= 0 && payload.transplant_date !== undefined) sheet.getRange(r+1, idxTrans+1).setValue(payload.transplant_date || '');
      if (idxHeading >= 0 && payload.heading_date    !== undefined) sheet.getRange(r+1, idxHeading+1).setValue(payload.heading_date || '');
      if (idxHarvest >= 0 && payload.harvest_date    !== undefined) sheet.getRange(r+1, idxHarvest+1).setValue(payload.harvest_date || '');
      return { paddy_key: payload.paddy_key, updated: true };
    }
  }
  throw new Error('paddy_key not found: ' + payload.paddy_key);
}

/** YYYY-MM-DD 文字列に正規化(空・null・Date・文字列いずれも対応) */
