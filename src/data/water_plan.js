/**
 * 水位の理想プラン(コシヒカリ・西会津・寒冷地)
 *
 * 田植え日(transplant_date)からの経過日数で、その時期の理想的な水深と
 * 段階名を返す。デザイナーさんのモックにあった階段+ジグザグチャートのデータ源。
 */

// 田植え日からのオフセット(日)、水深(cm)、段階名、パターン
//   pattern:'flood'(湛水) / 'shallow'(浅水) / 'dry'(落水) /
//           'saturate'(飽水) / 'intermittent'(間断灌漑)
export const WATER_PLAN = [
  { day_offset:   0, depth_cm: 5,   pattern: 'flood',         label: '田植え' },
  { day_offset:   1, depth_cm: 4,   pattern: 'flood',         label: '活着〜分げつ初期' },
  { day_offset:  15, depth_cm: 2.5, pattern: 'shallow',       label: '分げつ促進' },
  { day_offset:  41, depth_cm: 2.5, pattern: 'shallow',       label: '分げつ最終' },
  { day_offset:  51, depth_cm: 0,   pattern: 'dry',           label: '中干し' },
  { day_offset:  66, depth_cm: 4.5, pattern: 'flood',         label: '穂ばらみ' },
  { day_offset:  81, depth_cm: 5,   pattern: 'saturate',      label: '出穂・開花' },
  { day_offset:  96, depth_cm: 3,   pattern: 'intermittent', label: '登熟' },
  { day_offset: 131, depth_cm: 0,   pattern: 'dry',           label: '落水(収穫準備)' },
  { day_offset: 141, depth_cm: 0,   pattern: 'dry',           label: '収穫' }
];

/** 田植え日からの経過日数で「今のステージ」を返す */
export function currentWaterStage(transplantYmd, today) {
  if (!transplantYmd) return null;
  const t = new Date(transplantYmd + 'T00:00:00');
  const n = today || new Date();
  const days = Math.floor((n - t) / 86400000);
  let stage = WATER_PLAN[0];
  for (const s of WATER_PLAN) {
    if (days >= s.day_offset) stage = s;
    else break;
  }
  return { ...stage, days_since_transplant: days };
}
