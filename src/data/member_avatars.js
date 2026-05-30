/**
 * メンバー別のアバター画像(LINEアイコンを 400×400 正方形に揃えたもの)
 *
 * 投稿カードの右下に「落款」として表示する。
 * 画像が見つからない場合は頭文字円アバターにフォールバック。
 */

const MAP = {
  'さえ':     './assets/avatars/sae.png',
  'みさき':   './assets/avatars/misaki.png',
  'カトケン': './assets/avatars/katoken.png',
  'こうすけ': './assets/avatars/kousuke.png',
  'しゅんき': './assets/avatars/shunki.png',
  'ことり':   './assets/avatars/kotori.png',
  'ゆうた':   './assets/avatars/yuta.png',
  'ながはし': './assets/avatars/nagahashi.png'
};

export function avatarFor(displayName) {
  return MAP[displayName] || '';
}
