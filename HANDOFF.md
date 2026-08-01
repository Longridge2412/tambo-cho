# NEO百 (田んぼ帳) — 次セッション引き継ぎ書

**最終更新:** 2026年8月1日 / SW v58 / 送信失敗対策(写真の分割アップ+自動リトライ+冪等化+下書き保存)

---

## 0. プロジェクト1行サマリ

**8人で1つの田んぼ(西会津)を共同管理するためのPWA**。見回り・水管理・堤の操作・覚書・Todo・カレンダーを共有する SNS 型ツール。デザインは「NEO百姓」というブランド名で、和風×構成主義の黒ロゴ。

- 公開URL: https://longridge2412.github.io/tambo-cho/
- リポジトリ: https://github.com/Longridge2412/tambo-cho (Public)
- ユーザー: Yuki (y.nagahashi@longbridge.co.jp) と仲間8人

---

## 1. 技術スタック

| レイヤ | 採用 |
|---|---|
| フロント | HTML + React 18.2.0(UMD CDN) + htm@3.1.1 + ESModules |
| ビルド | なし(ブラウザでそのまま動く) |
| バックエンド | Google Apps Script(`gas-files/split/` に12分割) |
| データ | Google Spreadsheet |
| 画像 | Google Drive(GAS から upload) |
| 気温 | Open-Meteo API(無料、CORS可)+ 西会津30年平年値(同梱JSON) |
| 配信 | GitHub Pages + Service Worker(network-first) |
| PWA | manifest.json + アイコン |

---

## 2. ファイル構成(最新)

```
tambo-cho/
├── index.html              ← エントリ点 + スプラッシュ CSS + ErrorBoundary 起動
├── manifest.json           ← PWA設定
├── service-worker.js       ← SW v58(network-first, STATIC_FILES に全 .js/画像を列挙)
├── splash.png              ← スプラッシュロゴ
├── logo.png                ← 旧ロゴ素材
│
├── assets/
│   ├── logo/
│   │   ├── neo-hyaku-h.png  ← 横版黒ロゴ(透過済み・トリム済み)
│   │   └── neo-hyaku-v.png  ← 縦版黒ロゴ
│   └── avatars/             ← 8人の LINE アイコン(400×400 正方形)
│       ├── sae.png / misaki.png / katoken.png / kousuke.png
│       ├── shunki.png / kotori.png / yuta.png / nagahashi.png
│
├── src/
│   ├── main.js              ← ルーティング + ErrorBoundary クラス
│   ├── api.js               ← GAS callApi(action別タイムアウト+自動リトライ)
│   ├── utils.js             ← 日付・画像圧縮・evalSymbol(高/適/低→◎○△)・cardColorClass
│   ├── config.js            ← GAS URL、画像圧縮(400KB上限)、タイムアウト/リトライ設定
│   │
│   ├── styles.css           ← ~2200行。デザイナー編集対象
│   │
│   ├── pages/
│   │   ├── Home.js          ← 投稿フィード(batch_id で1カードに統合表示)
│   │   ├── Compose.js       ← 共有フォーム(写真は先に個別アップ→addPost。下書き保存あり)
│   │   ├── Todo.js          ← Todo (#/todo)
│   │   └── Calendar.js      ← カレンダー(#/calendar)
│   │
│   ├── components/
│   │   ├── BottomNav.js         ← 3タブ + 中央FAB(SVGアイコン)
│   │   ├── Header.js            ← ページヘッダ(Compose/Todo/Calendar で使用中)
│   │   ├── ToggleGroup.js       ← トグルボタン群(高/適/低 等。Compose/EditPost 共用)
│   │   ├── HomeHeader.js        ← ホーム専用ヘッダ(ロゴ+格言+大型日付+天気)
│   │   ├── WeatherRow.js        ← Open-Meteo 6日予報
│   │   ├── MeyasuCard.js        ← 今の目安(苗イラスト + 水位プランチャート)
│   │   ├── PaddyIllustration.js ← 苗SVG
│   │   ├── WaterPlanChart.js    ← 水位ステップチャート
│   │   ├── GddSection.js        ← 稲の暦(積算温度1カード)
│   │   ├── TsutsumiReminder.js  ← 堤の開けっぱリマインダー
│   │   ├── PostCard.js          ← 投稿カード(グループ {parts:{visit,facility,note}} を1枚表示)
│   │   ├── EditPost.js          ← インライン編集フォーム(グループ単位で編集)
│   │   └── Lightbox.js          ← 写真タップ拡大
│   │
│   ├── services/
│   │   ├── phenology.js     ← Open-Meteo + AIZU_NORMALS で積算温度計算
│   │   ├── weather.js       ← 天気予報フェッチ
│   │   ├── feed.js          ← ★ batch_id でレコードを投稿グループに束ねる(Home/Calendar 共用)
│   │   └── currentUser.js   ← localStorage で「あなた」を記憶(Compose の名前初期値にも使用)
│   │
│   └── data/
│       ├── paddies.js       ← ★ 田んぼ定義(transplant_date など、ハードコード)
│       ├── water_plan.js    ← 水位プラン10段階(田植え→収穫145日)
│       ├── quotes.js        ← 28個の格言(4週間ローテ)
│       ├── member_avatars.js ← display_name → アバター画像パス
│       └── aizu_normals.js  ← 366日分の平年気温(30年平均)
│
├── gas-files/
│   ├── Code.gs              ← 旧モノリス版(参考用、984行)
│   └── split/               ← ★ 12ファイル分割版(Yuki さんの GAS に貼り付け済み)
│       ├── 00_Main.gs       ← doPost / dispatch
│       ├── 10_Lib_Sheet.gs  ← readSheet + _findSheet(タブ名余白吸収)
│       ├── 11_Lib_Drive.gs  ← Drive 画像アップ
│       ├── 12_Lib_Date.gs   ← 日付ユーティリティ
│       ├── 20_Api_Members.gs
│       ├── 21_Api_Visits.gs
│       ├── 22_Api_Facility.gs
│       ├── 23_Api_Notes.gs
│       ├── 24_Api_Duty.gs
│       ├── 25_Api_Season.gs ← apiGetTodayContext(ホーム用大物)
│       ├── 26_Api_Phenology.gs ← (paddy_phenology シートはもう使っていない)
│       ├── 27_Api_Todos.gs  ← appendRowByHeaders 化(batch_id 対応)
│       └── 28_Api_Posts.gs  ← ★ addPost 一括投稿API(client_batch_id で冪等 + ScriptLock)
│
├── tools/
│   └── check_static_files.mjs ← SW の STATIC_FILES と src/ の突合チェック(node で実行)
│
└── docs/  ← 旧資料(現状未参照)
```

---

## 3. データソース(Spreadsheet)

シート名(タブ名)とヘッダ:

| シート | ヘッダ |
|---|---|
| `members` | member_id, display_name, joined_at |
| `visits` | visit_id, member_id, visited_at, water_level_photo_url, water_level_eval, stream_status, free_note, field2_photo_url, field2_eval, **batch_id** |
| `facility_ops` | op_id, member_id, target, action, photo_url, operated_at, reason, coordination_note, paired_op_id, **batch_id** |
| `notes` | note_id, content, created_by, created_at, updated_at, pinned, photo_url, **batch_id** |
| `duty_master` | day_of_week, member_id, slot |
| `duty_week` | target_date, slot, member_id, modified_by, modified_at |
| `duty_swaps` | swap_id, target_date, original_member_id, substitute_member_id, accepted_at, note, created_at |
| `season_targets` | (季節目標) |
| `todos` | todo_id, content, due_date, created_by, created_at, status, completed_at, completed_by (+ 任意で batch_id) |
| ~~`paddy_phenology`~~ | **現在は未使用**(田植え日は paddies.js でハードコード) |

**⚠️ 重要な運用知見:**
- ヘッダ名・シート名の **前後余白** や全角混入で過去に詰まった。`10_Lib_Sheet.gs` で吸収するようにしてあるが、新シート追加時は半角・余白なしを徹底
- `transplant_date` 等の日付列は **「書式 → 数字 → プレーンテキスト」** に設定しないと、Sheets が日付型に自動変換して読み取りが乱れる

---

## 4. 4タブ構成 + FAB(現状)

```
┌──────────────────────────────┐
│  ホーム(#/)             家|  │
│   - HomeHeader(ロゴ+格言+天気+大型日付)  │
│   - MeyasuCard(苗+水位プラン)            │
│   - GddSection(稲の暦・積算温度・1カード) │
│   - TsutsumiReminder(堤開けっぱ・インライン閉)│
│   - 投稿フィード(visits+ops+notes 時系列)│
└──────────────────────────────┘
┌──────────────────────────────┐
│  ┌──┐                   ┌─────┐│
│  │+ │(FAB)              │家✓田 ││ ←ピル型ナビ
│  └──┘                   └─────┘│
└──────────────────────────────┘

その他: Todo(#/todo) / カレンダー(#/calendar)
共有(+)は #/compose に飛ぶ
```

**カード色:** 投稿の日時から決まる4色ローテ(日付偶奇 × 朝/夕)。スレートブルー / テラコッタ / スレートグリーン / バーガンディ

**評価記号:** 適=◎、高=○、低=△(データは「適」「高」「低」のまま、表示時に変換)

**投稿の単位(2026/6/11〜):** 共有フォーム1回の送信は GAS `addPost` 1リクエストで保存され、作られたレコード(visits / facility_ops / notes)に共通の `batch_id` が付く。Home / Calendar のフィードは `src/services/feed.js` の `buildFeedGroups` が batch_id ごとに1カードへ統合する。batch_id の無い古いレコードは従来どおり1レコード=1カード。編集・削除はグループ単位(削除は構成要素をまとめて消す)。GAS の行書き込みは `appendRowByHeaders`(ヘッダ名マッピング)に統一したので**列の並び順に依存しない**。

---

## 5. 直近の重大トラブルから得た教訓

### React error #62(htmで style に文字列を渡すと壊れる)
- htm の `style=${`width:50%`}` のような **文字列渡しは React 18 で禁止**
- 本番ビルドだと #62(Should have a queue) という意味不明なエラーになる
- 開発ビルド(react.development.js)に一時切替して詳細エラーを取得した
- **解決:** style はオブジェクト `${{width:'50%'}}` または **CSS クラス** で表現
- **教訓:** style プロパティは inline style ではなく **CSS クラス + 事前定義 (.pct-50 など)** が一番堅牢

### Service Worker 更新が降りにくい問題
- PWA は SW を一度握ると更新が遅い
- 解決:`index.html` に **更新検知バナー**を入れた(新SWが waiting になると「更新」ボタン表示 → タップで skipWaiting + reload)
- それでもダメな場合は **ホーム画面アイコンを長押し削除 → 再インストール**

### シート名・ヘッダ名の余白問題
- セルやタブ名に**半角空白・ノーブレークスペース・ゼロ幅文字**が混入すると `getSheetByName()` や `headers.indexOf()` が失敗
- 解決:`10_Lib_Sheet.gs` の `_findSheet()` と `rowToObject()` で正規化して吸収
- それでも `paddy_key not found` 等のエラーが出るときは **「先頭3件のID」が出る詳細エラー**になっている

### Python 文字列置換による事故
- 過去に `(id) => {` を `(id) = {` と書き換えてしまった(`>` を巻き込んだ)
- node --check は ES2022 で曖昧な構文として通してしまうため見逃された
- **教訓:** 大きな修正は Read + 全文書き直し方式、Python 置換は短い文字列ピンポイントで

---

## 6. 運用上の注意

### OneDrive 同期との関係
- ユーザーの作業フォルダは `C:\Users\ynaga\OneDrive\...` で OneDrive 同期
- **Edit/Write ツールで OneDrive 配下のファイルを直接編集するとファイル破壊が過去複数回起きた**(NUL バイト混入、内容欠落)
- 必ず `/tmp/t2` などの一時クローンで作業し、git push する。完了したファイルだけ user 側で必要に応じて pull
- ローカルに配置するアセット(LINE アイコン等)は Yuki さんが OneDrive 経由で `田んぼ帳アプリ/assets/` に置き、AI 側で読み取り → 加工 → repo に push

### Service Worker のバージョン管理
- `service-worker.js` の `CACHE_NAME` を変更するたびに +1(現在 v56)
- 新ファイルを追加したら **`STATIC_FILES` にも追加する**(忘れるとオフライン時に 404)
- 機能修正で SW を bump → アプリ側に更新バナーが出る → タップで適用

### Personal Access Token
- **このリポジトリは Public。トークンを本文に書かないこと**(過去に平文で記載してしまい、2026/8/1 に削除+失効依頼済み)
- 毎セッション新規発行し、使い終わったら失効させる。ドキュメントには残さない

### GAS Web App URL
- `src/config.js` の `GAS_URL` に固定
- 現在: `https://script.google.com/macros/s/AKfycbyS9F6q2jj9hp3R6L5ukEMKPxC3yo4rBe40-rBpj0b8QD306nCfMjmOOPoF1wQTNaWCuQ/exec`
- GAS の再デプロイで新バージョンとして反映(URL は変わらない設定)

---

## 7. 未解決事項・次セッションでの検討事項

### A. メモ写真 = 2投稿に分岐する問題 → **解決済み(2026/6/11)**
- batch_id グルーピングにより、レコードが複数に分かれてもホーム/カレンダーでは1カードに統合表示される
- メモの保存先ルール(写真あり→覚書 / 見回りあり→free_note / 堤のみ→reason / 単独→覚書)はデータ上は維持。表示が統合されたため体験上の問題は消えた

### B. 「送信失敗」エラー → **原因特定 + 対策実施(2026/8/1)**

Yuki さんの報告は「**写真を付けた時に失敗しやすい**」。読み直して分かった構造:

| 原因 | 内容 |
|---|---|
| 画像が重い | 長辺1920px/品質0.8 → base64化で1枚0.5〜1.2MB。最大3枚で3MB超の POST |
| 通信1本に全部乗せ | その1回の中で Drive アップ + 共有設定 + シート追記まで実行 |
| 20秒で強制中断 | `api.js` の AbortController。田んぼの電波では普通に超える |
| 中断≠キャンセル | クライアントが諦めてもサーバーは書き込みを続行 → 「失敗」表示なのに保存済み → 再送で二重投稿 |
| 復帰手段なし | リトライも下書き保存も無く、失敗=入力全消し |

**対策(実装済み):**
1. 画像圧縮を長辺1280px/品質0.72 + **400KB上限**(超えたら品質→解像度の順に自動で落とす。実測 6.2MB → 172KB)
2. 写真は `uploadPhoto` で**1枚ずつ先に送る**。本体 `addPost` には URL だけ渡す(通信を小さく分割)
3. タイムアウトを action 別に(一覧20秒 / 写真90秒 / addPost 45秒)、通信エラー・タイムアウト・5xx は**指数バックオフで最大3回自動再試行**
4. **冪等化**: フロントが `client_batch_id` を作り再送でも同じ値を送る。GAS は各シートの batch_id 列を見て、既に保存済みの部分は書かない(`batchIdExists()`)。→ 何度押しても二重にならない
5. `apiAddPost` 全体を **LockService** で直列化(同時送信での ID 採番衝突も防止)
6. 入力内容を localStorage に**自動下書き保存**(アップ済み写真URLも保持)。アプリが落ちても復元
7. 圏外バナー・送信進捗(写真1/2…)・「もう一度送る」ボタンを追加

**運用上の前提:** `visits` / `facility_ops` / `notes` に `batch_id` 列が必要(既存)。`todos` にも `batch_id` 列を足すと Todo も二重登録されなくなる(無くても動く)。

### C. 旧画面ファイルの完全削除済み
- Visit.js / Facility.js / Notes.js / Duty.js / History.js は削除済み
- 必要なら git 履歴から復元可能

### D. デザイン微調整待ち
- デザイナーさんに `outputs/design_pack/` を渡してある
- styles.css の編集が戻ってきたら repo に貼り戻す予定

### E. 今シーズン後にやりたいこと(ロードマップ)
- 当番のカレンダー上編集(今は番タブが消えてカレンダー表示のみ)
- 朝/夕タスクリスト(旧見回り画面にあったテンプレ)の復活先
- GAS の性能改善(CacheService、batch read/write)
- 来年田植え日変更時の `paddies.js` 編集を Yuki さんが自分で出来るように UI 化

---

## 8. AI のための作業フロー(過去の事故からの推奨)

1. **作業開始時:**
   - `cd /tmp && rm -rf t2 && git clone --depth 2 <repo URL with PAT> t2`
   - Yuki さんから新しい PAT を聞いて使う
   - `cd /tmp/t2 && git log --oneline -5` で最新状態確認

2. **コード変更時:**
   - 短い差し替え:Python の `s.replace(old, new)` で OK。ただし末尾の `>` などを巻き込まないように。assert を必ず入れる
   - 大きな書き換え:`cat > file << 'EOF' ... EOF` で全文書き直し
   - 変更後すぐ `node --check <file>` で構文チェック
   - 複雑なロジック変更は1ファイルずつ commit + push して、各段階で動く状態を保つ

3. **Service Worker:**
   - ファイル追加 → `STATIC_FILES` にも追加
   - `CACHE_NAME` を必ず bump
   - `node --check service-worker.js` で構文確認

4. **GAS 関連の変更:**
   - `gas-files/split/` の該当ファイルを編集
   - `outputs/gas_split/` にミラー
   - `present_files` で Yuki さんに該当ファイルだけ渡す
   - Yuki さんが GAS エディタで貼り替え → 再デプロイ

5. **コミット + push:**
   ```bash
   git config user.email "y.nagahashi@longbridge.co.jp"
   git config user.name "Longridge2412"
   git add -A && git commit -q -m "..."
   git push "https://Longridge2412:<PAT>@github.com/Longridge2412/tambo-cho.git" HEAD:main
   ```

6. **動作確認の方法:**
   - 私のサンドボックスから github.io には到達できない
   - 必ず Yuki さんに動作確認を頼む
   - 問題が出たら **赤バーオーバーレイ + ErrorBoundary** で詳細を取る(過去にやった手法)
   - 不可解な #N 系 React エラーは **開発ビルドに一時切替**して詳細取得

---

## 9. 直近の主要コミット履歴(参考)

| commit | 内容 |
|---|---|
| `1a3d3d9` | 稲の暦を1カードに統合 + React 本番ビルドに戻す + 赤バー削除 |
| `8d013f8` | GddSection: inline style を CSS クラス(pct-N)に置換 |
| `7a67cd5` | GddSection: style prop 文字列 → オブジェクト(React 18 #62 真因) |
| `e7ac3e8` | React/React-DOM を 18.2.0 開発ビルドにピン(デバッグ用) |
| `82cdc5e` | ErrorBoundary を main.js に組み込み + 赤バー追加 |
| `4c92035` | useVisibilityRefresh フックを撤去しインライン化 |
| `5a249ae` | 田植え日をハードコード化(paddies.js)+ paddy_phenology 依存撤去 |
| `f271329` | 画面復帰時の自動再取得(visibilitychange) |
| `c2d9430` | Todo: 完了済みも編集可能 + 未完了に戻す |
| `b6807c1` | GAS: ID比較を String+trim で堅牢化 |
| `6d63222` | GAS Code.gs を 12ファイル分割 |
| `598175c` | Phase B/C/D: Todo + カレンダー + 家シンボル |
| `7b0f80f` | Phase A: 新ナビ + 投稿フィードホーム + 統合共有 |
| `8ff0522` | Phase 1: 稲の暦(積算温度) |

---

## 10. ユーザー Yuki さんについて(コミュニケーション上のメモ)

- **意思決定が速い**:「進めて」「OK です」「任せます」と判断を委ねてくれる
- **見た目の感覚が鋭い**:「ダサい」「これいらない」を的確に言える。表記の揺れ・色のバランス・タイポにすぐ気付く
- **手は止めない方が好まれる**:寝る前に「止まらず進めて」と作業を任されたことが何度かある
- **複雑化を嫌う**:「コードが複雑化していませんか」「全体を見直して」など、メタな視点での指摘がある
- **コードに直接は触らない**:Yuki さんは Python 等の経験はあるが、現状アプリのコードは AI 経由で更新
- **デザイナーの友人**がいて、CSS 編集を依頼している(同時編集ロックの約束あり)
- **エラー報告が簡潔**:「エラー出ました」だけのことがあるので、AI 側から「文言の続きを」と聞き取る癖をつける

---

*次セッションで困ったら、まず Yuki さんに「現在どこまで動いていますか」と聞いてから start。直近で動いていたことを記憶してくれているので、それを起点に進めるのが安全。*
