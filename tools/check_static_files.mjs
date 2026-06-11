/**
 * service-worker.js の STATIC_FILES と src/ の実ファイルを突き合わせるチェック。
 * 使い方: node tools/check_static_files.mjs  (リポジトリ直下で実行)
 * - src/ にあるのに STATIC_FILES に無い .js/.css → 追加忘れ(オフライン時404の原因)
 * - STATIC_FILES にあるのに実在しないパス → 削除忘れ(SWインストール失敗の原因)
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const sw = readFileSync('service-worker.js', 'utf-8');
const m = sw.match(/STATIC_FILES = \[([\s\S]*?)\]/);
if (!m) { console.error('STATIC_FILES が見つかりません'); process.exit(1); }
const listed = [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]);

const actual = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|css)$/.test(name)) actual.push('./' + p.replace(/\\/g, '/'));
  }
})('src');

let ng = 0;
for (const f of actual) {
  if (!listed.includes(f)) { console.log('STATIC_FILES に未登録:', f); ng++; }
}
for (const f of listed) {
  if (f.startsWith('./src/') && !existsSync(f.slice(2))) { console.log('実在しないパス:', f); ng++; }
}
console.log(ng === 0 ? 'OK: STATIC_FILES と src/ は一致しています' : `NG: ${ng} 件`);
process.exit(ng === 0 ? 0 : 1);
