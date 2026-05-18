# 田んぼ帳 Step 1 セットアップ手順(コピペ作業のみ版)

考えずに、上から順に **コピペ → 貼り付け → 保存** だけで進められる手順です。

判断や入力が必要な箇所は ⚠️ マークを付けています。それ以外は機械的に進めて OK。

---

## §1. GAS のコードを差し替え(5分)

Step 0 で貼ったコードを、Step 1 用の完全版に置き換えます。

### 1-1. Code.gs を全部置き換える

1. Sheets `田んぼ帳_data` を開く
2. メニュー「拡張機能」→「Apps Script」
3. 左メニューで **`Code.gs`**(またはコード.gs)を開く
4. **エディタ内を全選択(Cmd/Ctrl + A)→ Delete**
5. このパッケージの **`gas-files/Code.gs`** の中身を **全コピー → 貼り付け**
6. 保存(Cmd/Ctrl + S)

### 1-2. Schema.gs と Config.gs は変更なし

Step 0 と同じ。何もしなくてOK。

### 1-3. デプロイを更新

これを忘れると、新しいコードが Web App URL に反映されません。

1. 右上「**デプロイ**」→「**デプロイを管理**」
2. 既存のデプロイ(田んぼ帳 Step 0)の右上の **鉛筆アイコン(編集)**
3. 「**バージョン**」のドロップダウン → 「**新しいバージョン**」を選択
4. 「説明」欄に何か入れる(例:`Step 1 API追加`)
5. 「**デプロイ**」をクリック
6. ⚠️ **URL が変わっていないことを確認**(同じ URL のはず)

完了ダイアログを閉じる。

---

## §2. アプリ一式をローカルに配置(1分)

このパッケージを丸ごと、適当な作業フォルダにコピーするだけです。

### 手順

`tambo-cho-app/` フォルダを、Yukiさんの作業ディレクトリ(例:`~/projects/` や `~/Documents/`)に丸ごと配置。

`src/config.js` には GAS の URL が既に書き込み済みなので、手で書き換える必要はありません。

---

## §3. GitHub にプッシュ(2分)

ターミナルで `tambo-cho-app/` ディレクトリに移動して、以下を **1ブロック丸ごとコピペ** して実行:

```bash
cd ~/path/to/tambo-cho-app    # ⚠️ 自分が配置したパスに置き換え

git init
git add -A
git commit -m "Initial commit: 田んぼ帳 Step 1"
git branch -M main
gh repo create Longridge2412/tambo-cho --public --source=. --remote=origin --push
```

⚠️ 最後の `gh repo create` で、もしエラーが出たら以下のいずれか:

**パターンA**: `gh: command not found`
→ GitHub CLI が未インストール。下の「§3 代替手順」を使ってください。

**パターンB**: `authentication required`
→ `gh auth login` を実行して、画面の指示に従う。終わったら上のコマンドを再実行。

**パターンC**: `already exists`
→ 同名リポジトリが既にある。`tambo-cho` を別名(例:`tambo-cho-2`)に変更して再実行。

成功すると `https://github.com/Longridge2412/tambo-cho` が開けるようになります。

### §3 代替手順(gh CLI がない場合)

1. ブラウザで https://github.com/new を開く
2. 設定:
   - Owner: `Longridge2412`
   - Repository name: `tambo-cho`
   - Public ✓
   - **「Add a README file」のチェックは外す**(空のリポジトリにする)
   - 「Create repository」をクリック
3. ターミナルで以下を **1ブロック丸ごとコピペ**:

```bash
cd ~/path/to/tambo-cho-app    # ⚠️ 自分が配置したパスに置き換え

git init
git add -A
git commit -m "Initial commit: 田んぼ帳 Step 1"
git branch -M main
git remote add origin https://github.com/Longridge2412/tambo-cho.git
git push -u origin main
```

---

## §4. GitHub Pages を有効化(2分)

GitHub の Web UI で操作します。

1. ブラウザで `https://github.com/Longridge2412/tambo-cho` を開く
2. 上部のタブから **Settings** をクリック
3. 左メニューの **Pages**
4. 設定:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` を選択、`/(root)` のまま
   - **Save** をクリック
5. ⚠️ 数分待つ(初回は最大5分かかる)

公開されると、Pages 設定画面の上部に緑色のチェック付きで URL が表示されます:

```
✅ Your site is live at https://longridge2412.github.io/tambo-cho/
```

---

## §5. ブラウザで動作確認(3分)

`https://longridge2412.github.io/tambo-cho/` を開く。

### 確認ポイント

**ホーム画面**:
- [ ] 「本日の水加減」が表示される(目標と直近の2列)
- [ ] 「本日の当番」に当番が出る(マスター当番表を入力済みなら)
- [ ] 「近ごろの見回り」に Step 0 のテスト記録が出る

**見回り画面**(下部ナビの「見」をタップ):
- [ ] 朝/夕のやることリストが表示される(現在時刻による)
- [ ] メンバー選択ができる
- [ ] 写真撮影 or 選択ができる
- [ ] 水位・小川を選択できる
- [ ] メモを書ける
- [ ] 「記す」で送信 → 完了画面 → LINE 共有テキストが出る

何か変な動きがあったら、エラーメッセージや画面のスクショを Claude に貼ってください。

---

## §6. スマホで PWA として開く(3分)

⚠️ ここは **スマホで** 操作してください(PC ではなく)。

### iPhone

1. Safari で `https://longridge2412.github.io/tambo-cho/` を開く
2. 画面下の **共有ボタン** をタップ
3. **「ホーム画面に追加」** をタップ
4. 名前(田んぼ帳)を確認して「追加」
5. ホーム画面に **「帳」のアイコン** が現れる
6. アイコンをタップして起動 → ブラウザのアドレスバーが見えないアプリ風UIで開けば成功

### Android

1. Chrome で同URLを開く
2. メニュー(⋮)→ **「ホーム画面に追加」** または「インストール」
3. 名前を確認して「追加」
4. ホーム画面に「帳」のアイコンが現れる
5. タップして起動

---

## §7. 8人に共有(任意)

「8人で使い始める準備ができた」となったら、LINEグループに以下のような文面を送ります。これも **そのままコピペで使える** ようにしてあります。

```
田んぼ管理用のWebアプリ「田んぼ帳」を作りました。

📱 URL: https://longridge2412.github.io/tambo-cho/

【スマホで使う(おすすめ)】
iPhone: Safariで開く → 共有ボタン → ホーム画面に追加
Android: Chromeで開く → メニュー → ホーム画面に追加

ホーム画面に「帳」のアイコンが追加され、アプリのように使えます。

【できること(まずはここから)】
・本日の当番表示
・見回り記録(写真+水位+メモ)
・記録後、LINE貼り付け用テキストを自動生成

【保管場所】
記録は LONGBRIDGE(長橋)管理のGoogleスプレッドシートに、
写真は同じく LONGBRIDGE の Google Drive に保存されます。

田んぼで使ってみて、気づいた点や「こうしてほしい」があれば気軽に教えてください!
```

---

## トラブルシュート

### Q1. ホーム画面で「通信に失敗しました」と出る

→ §1-3 のデプロイ更新を忘れていないか確認。
→ ブラウザのコンソール(F12 → Console)でエラー内容を確認、Claude に貼って相談。

### Q2. 当番が「設定されていません」と表示される

→ Sheets の `duty_master` シートにデータが入っているか確認。
→ member_id が members シートと一致しているか。

### Q3. 直近の見回り写真が表示されない(画像が壊れている)

→ Drive 側の共有設定の問題かもしれません。
→ Sheets の visits シートで photo_url の URL を1つ別タブで開いてみる → ログイン状態で見られるが、ログアウト状態だと見えない場合は共有設定不足。

### Q4. PWA としてホーム画面に追加できない

→ HTTPS でアクセスしているか確認(`https://longridge2412.github.io/...` のはず)。
→ ブラウザのコンソールで manifest.json のエラーがないか。

### Q5. 写真アップロードが遅い

→ 田んぼで電波が弱い時は時間がかかります(数十秒〜)。
→ 圧縮後でも数百KBあるので、回線次第。Step 2 でオフライン対応を検討します。

### Q6. ローカルで動作確認したい(任意)

ローカル確認はスキップしても OK です。GitHub Pages で直接確認できます。

それでもローカルで動かしたい場合は、ローカルサーバーが必要です(`file://` で直接開くと動きません):

```bash
cd ~/path/to/tambo-cho-app
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000` を開く。

---

## 完了報告

すべて動いたら、Claude に以下を送ってください:

```
Step 1 完了しました。
公開URL: https://longridge2412.github.io/tambo-cho/
```

何か詰まった場合は、画面のスクショや、エラーメッセージをそのまま貼ってください。

---

## Step 2 でやること(予告)

- 共用設備の操作画面(じょうご・三つ又)
- 履歴画面(綴り)
- 当番カレンダー画面(臨機応変な書き換え対応)
- 覚書(notes)画面
- じょうご未完了リマインダー
- 田んぼでの実機テスト + 8人からのフィードバック反映
