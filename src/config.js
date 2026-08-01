/**
 * 田んぼ帳 - 設定定数
 *
 * GAS の Web App URL はここに記述。
 * URLが変わった時はここを書き換えるだけ。
 */

export const GAS_URL = 'https://script.google.com/macros/s/AKfycbyS9F6q2jj9hp3R6L5ukEMKPxC3yo4rBe40-rBpj0b8QD306nCfMjmOOPoF1wQTNaWCuQ/exec';

export const APP_VERSION = '田んぼ帳 v0.5 / Step 1';

// 画像圧縮の設定
// 田んぼの電波は弱い。写真1枚が大きいほど「送信失敗」が増えるので、
// 長辺・品質の初期値に加えて「これ以上は許さない」バイト数の上限を持つ。
// 上限を超えた場合は品質→サイズの順に自動で落として収める(utils.js)。
export const IMAGE_COMPRESSION = {
  MAX_LONG_EDGE: 1280,     // 長辺の最大ピクセル(水位の判別には十分)
  JPEG_QUALITY: 0.72,      // JPEG 品質 0-1
  MAX_BYTES: 400 * 1024,   // 圧縮後 data URL の目標上限(約400KB)
  MIN_QUALITY: 0.45,       // これ以下には落とさない
  MIN_LONG_EDGE: 800       // これ以下には縮めない
};

// 通信のタイムアウト(ミリ秒)
// 写真アップロードは Drive 書き込みを伴うので長めに取る。
export const TIMEOUTS = {
  DEFAULT: 20000,      // 一覧取得など
  UPLOAD: 90000,       // uploadPhoto(写真1枚)
  POST: 45000          // addPost(写真URLのみなので本来は速い)
};

// 送信の自動リトライ
export const RETRY = {
  ATTEMPTS: 3,         // 初回 + 2回リトライ
  BASE_DELAY: 1200     // 1.2秒 → 2.4秒 と指数バックオフ
};

// 朝/夕の境界(時間で判定)
export const TIME_PERIODS = {
  MORNING_START: 5,    // 5時以降を朝とみなす
  MORNING_END: 11,     // 11時前まで朝
  EVENING_START: 16,   // 16時以降を夕
  EVENING_END: 21      // 21時前まで夕
};
