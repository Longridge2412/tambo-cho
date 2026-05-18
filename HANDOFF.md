# 田んぼ帳 ── 引き継ぎ

このフォルダは Cowork から作業を進めるためのものです。ユーザー(以下「Yuki」)から背景・経緯を口頭で説明しつつ、このドキュメントを参照しながら開発を進めてください。

---

## このプロジェクトは何か

**田んぼ帳 (tambo-chō)** ── 田んぼを共同管理する8人グループ向けの Web アプリ。

- 「アプリ」ではなく「**帳面(ちょうめん)**」として位置づける。機能を盛り込まず、書き留めていく場所。
- 既存の水管理アプリ(paditch、水田ファーモ等)は「経営体としての省力化」を目的とするが、本プロジェクトは「**フラットな共同体メンバーの記録と関わり**」を支える。
- 評価軸は「効率化」ではなく「関わりの質」。

詳細は `docs/REQUIREMENTS_v0.5.md` を参照。

---

## 現状(2026-05-17)

| 項目 | 状態 |
|---|---|
| 要件定義 | v0.5 完成、`docs/REQUIREMENTS_v0.5.md` |
| Step 0:GAS API 基盤 | **完了**、Sheets / Drive / Web App URL すべて稼働中 |
| Step 1:見回り記録 + ホーム画面 | **コード完成、未デプロイ**(これから Cowork で作業) |
| Step 2 以降 | 未着手 |

### Step 0 で確認済みのこと

- Google Sheets `田んぼ帳_data` のスキーマ 8 シート作成済み
- GAS の Web App デプロイ済み、URL は `src/config.js` に記載
- Drive の `田んぼ帳/` フォルダに画像が自動保存される動作 OK
- 8人のメンバー登録済み(ゆうた、さえ、ながはし、みさき、カトケン、ことり、しゅんき、こうすけ)
- マスター当番表(`duty_master` シート)に曜日割り当て入力済み

### Step 1 で実装済みのもの(まだデプロイ前)

- React 18 (CDN) + htm の構成
- ホーム画面(`src/pages/Home.js`):本日の水加減・本日の当番・近ごろの見回り
- 見回り記録画面(`src/pages/Visit.js`):やることリスト・フォーム・写真圧縮・LINE 共有テキスト生成
- 共通機能:画像圧縮(1920px/JPEG 80%)、和暦表記、経過時間表記
- PWA 対応(manifest.json + service-worker.js)
- 和風土系のスタイル(`src/styles.css`)
- GAS 側に Step 1 用 API 追加済み(`gas-files/Code.gs`)、ただし GAS への反映はこれから

---

## Cowork で今やること

順番に進める。判断に迷ったら Yuki に確認。

### 1. GAS のコードを Step 1 用に更新

GAS エディタ操作なので、Yuki に手動でやってもらう。

- 案内する内容:
  - Sheets `田んぼ帳_data` を開く → 拡張機能 → Apps Script
  - `Code.gs` を全選択して削除 → `gas-files/Code.gs` の中身を貼り付け
  - 保存
  - 「デプロイを管理」→ 既存デプロイの編集 → 「新しいバージョン」を選択 → デプロイ
  - URL が変わらないことを確認(変わったら設定ミス)

### 2. Git 初期化 + GitHub にプッシュ

ここから Cowork(=Claude)が自動でやる。

```bash
cd <Coworkで開いているこのフォルダ>
git init
git add -A
git commit -m "Initial commit: 田んぼ帳 Step 1"
git branch -M main
```

GitHub リポジトリの作成は `gh` CLI で:

```bash
gh repo create Longridge2412/tambo-cho --public --source=. --remote=origin --push
```

`gh` が未認証なら `gh auth login` から。`gh` が無ければ Yuki にブラウザで https://github.com/new から空リポジトリを作ってもらい、`git remote add origin ...` で続行。

### 3. GitHub Pages を有効化

Yuki に Web UI 操作してもらう:
- `https://github.com/Longridge2412/tambo-cho` → Settings → Pages
- Source: Deploy from a branch、Branch: main / (root) → Save

数分で `https://longridge2412.github.io/tambo-cho/` が公開される。

### 4. 動作確認

- ホーム画面が描画される
- 本日の当番が表示される
- 見回り記録の入力・送信・写真アップロードが通る
- 送信完了画面で LINE 共有テキストが生成される
- 「テキストをコピー」が機能する

エラーが出たら、Yuki にブラウザコンソール(F12)のメッセージを共有してもらい、原因を探る。

### 5. スマホで PWA として動作確認

- iPhone Safari / Android Chrome で URL を開く
- ホーム画面に追加 → アイコンから起動 → アプリ風 UI で開けば OK

---

## 設計上の重要な判断(踏襲してほしいこと)

これらは要件定義 v0.5 の中で繰り返し確認された **譲れない設計原則**。Step 2 以降で機能を追加する時も、これらに反しないように。

### 1. シンプルさが最上位

- 認証なし(URL を知る人だけがアクセス可)
- 通知なし(プル型、メンバーが自発的に見にくる)
- LINE Bot 連携なし(共有テキストの生成までで止める)
- 機能を増やしたくなったら一度立ち止まる

### 2. 警告色・督促表示を使わない

- 「○日以上記録なし」を赤で表示するなどは NG
- 経過時間表示は常にグレー
- 個人を責めない・急かさないトーン
- 唯一の例外:じょうご開けっぱなしの「忘れ防止リマインダー」は OK(警告ではなく安全のための情報として、控えめに)

### 3. 個人ランキング・スコアリングはやらない

- 「貢献度ポイント」「今月の MVP」のような UI は作らない
- フラットな共同体の関係性を壊さないため

### 4. タスクは「見るだけ」

- やることリストはチェックボックスにしない(業務管理ツール化の回避)
- 自由意思で行動する余地を残す

### 5. アプリは「記録の置き場」、LINE は「会話の場」

- リアルタイム共有は既存の LINE グループで
- アプリは記録蓄積 + LINE 共有テキスト生成までを担う

---

## 技術スタック

```
ブラウザ(PWA)
   ↓ fetch (text/plain で送信、CORS 回避)
GitHub Pages (静的ホスティング)
   ↑↓
GAS (Google Apps Script)
   ├──→ Google Sheets (構造データ)
   └──→ Google Drive [LONGBRIDGE 法人] (画像、フロント圧縮済み)
```

- **フロント**: Vanilla HTML + React 18 (CDN) + htm + ES Modules
- **ビルド不要**: そのまま GitHub Pages にホストできる
- **データ**: Google Sheets
- **画像保存**: Google Drive(LONGBRIDGE 法人ドライブ内 `田んぼ帳/` フォルダ)
- **画像圧縮**: フロント側で長辺 1920px / JPEG 品質 80%

---

## ディレクトリ構成

```
.
├── HANDOFF.md                 ← このファイル
├── docs/
│   └── REQUIREMENTS_v0.5.md   ← 要件定義書
├── gas-files/                 ← GAS にデプロイ済み(参考用、ここから直接反映はできない)
│   ├── Code.gs
│   ├── Schema.gs
│   ├── Config.gs
│   └── appsscript.json
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon-source.svg
├── index.html
├── manifest.json
├── service-worker.js
├── .gitignore
└── src/
    ├── main.js                ← エントリ、ルーティング
    ├── config.js              ← GAS_URL 等の設定
    ├── api.js                 ← GAS 通信ラッパー
    ├── utils.js               ← 共通処理(画像圧縮、日付、LINE 共有テキスト)
    ├── styles.css             ← 和風土系のスタイル
    ├── pages/
    │   ├── Home.js
    │   └── Visit.js
    └── components/
        ├── Header.js
        └── BottomNav.js
```

---

## Step 1 以降の予定

要件定義 v0.5 §10 のフェーズ計画より:

### Step 2:残り画面と運用機能

- 共用設備の操作画面(`#/facility`)
- 履歴画面(`#/history`)
- 当番カレンダー画面(`#/duty`、臨機応変な書き換え対応)
- 覚書画面(`#/notes`)
- じょうご未完了リマインダー(ホーム画面に表示)
- 田んぼでの実機テスト + 8人からのフィードバック反映

### Step 3:仕上げ

- シーズン全体タイムライン
- 来季以降の改善点ヒアリング

### 未決事項(要件定義 §11 参照)

- 田んぼでの電波状況(現地確認が必要)
- 7月20日以降の時期データ(中干し後の水管理)
- 代行依頼が受諾されなかった時の挙動
- 正式名称(現状「田んぼ帳」は仮称)
- 水位評価(高/適/低)の運用感

---

## 重要:8人の表示名

LINE 実名そのままを使う。漢字混じり・ひらがな・カタカナ混在で OK。

```
ゆうた、さえ、ながはし、みさき、カトケン、ことり、しゅんき、こうすけ
```

統一しようとして変えると、メンバー本人が違和感を持つので、絶対に勝手に整形しない。

---

## 重要:URL とアカウント情報

- **GAS Web App URL**: `src/config.js` の `GAS_URL` に記載
- **Google Sheets ID**: `gas-files/Config.gs` の `SPREADSHEET_ID` に記載
- **Drive Folder ID**: `gas-files/Config.gs` の `DRIVE_FOLDER_ID` に記載(LONGBRIDGE 法人 Drive 内)
- **GitHub username**: `Longridge2412`(`longbridge` ではない、l と g が逆)
- **公開予定 URL**: `https://longridge2412.github.io/tambo-cho/`

---

## Yuki への接し方

- 直接的で率直な対話を好む
- 「おまかせ」と言われたら、判断材料を共有した上で推奨を提示する
- 機能追加の提案には、シンプル原則と照らして必要性を吟味する
- 上手くいったことより、上手くいかないことや判断の根拠を共有する方が価値が高い

---

*このドキュメントは引き継ぎの起点。詳細は `docs/REQUIREMENTS_v0.5.md` を参照。*
