/**
 * 田んぼ定義(ハードコード)
 *
 * 田植え日・品種などはここで管理。
 * 出穂・収穫の予測はこの transplant_date を起点に計算される。
 * 値を変えるときはこのファイルを編集して push してください。
 */

export const PADDIES = [
  {
    paddy_key:       'three_se',
    paddy_name:      '三畝の田',
    variety:         'コシヒカリ',
    transplant_date: '2026-05-15',
    heading_date:    '',
    harvest_date:    ''
  },
  {
    paddy_key:       'one_tan',
    paddy_name:      '一反の田',
    variety:         'コシヒカリ',
    transplant_date: '2026-05-15',
    heading_date:    '',
    harvest_date:    ''
  }
];
