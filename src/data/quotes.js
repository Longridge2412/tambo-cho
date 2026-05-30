/**
 * ネオ百姓 — 日替わりの格言
 *
 * 日付に応じて自動でローテーション(dayOfYear % QUOTES.length)。
 * 28個で4週間サイクル。
 *
 * 出典:福岡正信・二宮尊徳・宮沢賢治・会津農書・老子・良寛・寺田寅彦・
 *      安藤昌益・与謝蕪村・小林一茶・柿本人麻呂(万葉集)・石川啄木・道元(典座教訓)
 */

export const QUOTES = [
  { text: '天地自然の道に私なし', author: '福岡正信' },
  { text: '積小為大', author: '二宮尊徳' },
  { text: '雨ニモマケズ 風ニモマケズ', author: '宮沢賢治' },
  { text: '遠きをはかる者は富む', author: '二宮尊徳' },
  { text: '永久の未完成これ完成である', author: '宮沢賢治' },
  { text: '天地の心を心とせよ', author: '二宮尊徳' },
  { text: '半夏前を用ゆべし、半夏過ぎては悪し', author: '会津農書' },
  { text: '米と云う字は八十八と書く', author: '会津農書' },
  { text: '自然のしくみそのものが農のしくみ', author: '福岡正信' },
  { text: '世界がぜんたい幸福にならないうちは個人の幸福はあり得ない', author: '宮沢賢治' },
  { text: '稲草一品を限らず品々多く作りてよし', author: '会津農書' },
  { text: '苗の根深く植うべからず、浅く植えてよし', author: '会津農書' },
  { text: 'サウイフモノニワタシハナリタイ', author: '宮沢賢治' },
  { text: '経済を忘れた道徳は寝言、道徳を忘れた経済は罪悪', author: '二宮尊徳' },
  { text: '上善は水のごとし', author: '老子' },
  { text: '万人直耕', author: '安藤昌益' },
  { text: '裏を見せ 表を見せて 散る紅葉', author: '良寛' },
  { text: '天災は忘れた頃にやってくる', author: '寺田寅彦' },
  { text: '形見とて 何残すらむ 春は花 夏ほととぎす 秋はもみぢ葉', author: '良寛' },
  { text: '誠は天の道なり', author: '二宮尊徳' },
  { text: '大器晩成、大方無隅', author: '老子' },
  { text: '菜の花や 月は東に 日は西に', author: '与謝蕪村' },
  { text: 'やせ蛙 まけるな一茶 これにあり', author: '小林一茶' },
  { text: '東の野に かぎろひの立つ見えて', author: '柿本人麻呂' },
  { text: 'やはらかに 柳あをめる 北上の岸辺目に見ゆ', author: '石川啄木' },
  { text: 'ホメラレモセズ クニモサレズ', author: '宮沢賢治' },
  { text: '種浸し日より日数百五十日に熟す', author: '会津農書' },
  { text: '典座は仏祖の命脈', author: '道元・典座教訓' }
];

/** 今日の日付に応じた格言を返す */
export function quoteForToday(date) {
  const d = date || new Date();
  const start = new Date(d.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((d - start) / 86400000);
  return QUOTES[dayOfYear % QUOTES.length];
}
