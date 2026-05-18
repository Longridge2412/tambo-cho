/**
 * 田んぼ帳 - 設定定数
 *
 * GAS の Web App URL はここに記述。
 * URLが変わった時はここを書き換えるだけ。
 */

export const GAS_URL = 'https://script.google.com/macros/s/AKfycbyS9F6q2jj9hp3R6L5ukEMKPxC3yo4rBe40-rBpj0b8QD306nCfMjmOOPoF1wQTNaWCuQ/exec';

export const APP_VERSION = '田んぼ帳 v0.5 / Step 1';

// 画像圧縮の設定
export const IMAGE_COMPRESSION = {
  MAX_LONG_EDGE: 1920,   // 長辺の最大ピクセル
  JPEG_QUALITY: 0.8      // JPEG 品質 0-1
};

// 朝/夕の境界(時間で判定)
export const TIME_PERIODS = {
  MORNING_START: 5,    // 5時以降を朝とみなす
  MORNING_END: 11,     // 11時前まで朝
  EVENING_START: 16,   // 16時以降を夕
  EVENING_END: 21      // 21時前まで夕
};
