# GAS Code.gs 分割版 — 適用手順

これまで 1 ファイル(984行)だった Code.gs を、ドメインごとに **12 ファイル** に分割しました。

性能は変わりませんが、以下の利点があります:
- 1ファイルが200行以下になり、目的の関数を探すのが速い
- 「Todoだけ更新」のような局所変更がしやすい
- AI と Yuki さんの間のファイルやり取りで、コピペ事故が起きても被害が小さい

---

## ファイル構成

```
00_Main.gs              ← doPost/doGet + dispatch (ここを最初に開けば全体像が見える)
10_Lib_Sheet.gs         ← readSheet, generateId, _delete/_update by id 等の共通基盤
11_Lib_Drive.gs         ← Drive 画像アップロード
12_Lib_Date.gs          ← 日付ユーティリティ(toMd_, formatYmd_ など)

20_Api_Members.gs       ← apiPing, apiAddMember, apiListMembers, apiUploadPhoto
21_Api_Visits.gs        ← 見回り (apiAddVisit/List/Update/Delete)
22_Api_Facility.gs      ← 共用設備 (apiAddFacilityOp/List/Update/Delete)
23_Api_Notes.gs         ← 覚書 (apiAddNote/List/Update/Delete)
24_Api_Duty.gs          ← 当番マスター/週/代行 (apiList/Update Duty + Swap 系)
25_Api_Season.gs        ← apiListSeasonTargets + apiGetTodayContext (ホーム画面用)
26_Api_Phenology.gs     ← 田植え日 (apiList/Update PaddyPhenology)
27_Api_Todos.gs         ← Todo (apiList/Add/Update/Complete Todo)
```

数字のプレフィックス(00, 10, 20, ...)は GAS エディタの並び順を制御するためです。
00 = 入口、10系 = 共通基盤、20系 = 個別API、という意図です。

---

## 適用手順

### A. 安全に進めるための準備

1. **必ず先に現状をバックアップ**
   - GAS エディタの右上 ⋮ → 「プロジェクトをコピーする」で別プロジェクトとして複製
   - そのコピーが万一の戻し場所になります

### B. 新ファイルを追加(まずファイルだけ揃える)

2. GAS エディタの左サイドバーの **「ファイル」 → 「+」 → 「スクリプト」** を押して、新しいスクリプトファイルを作成
3. 上の12個のファイル名(`00_Main` から `27_Api_Todos` まで)を順に新規作成
   - ⚠️ GAS では `.gs` 拡張子は自動で付くので、ファイル名は `00_Main` のように「拡張子なし」で入力します
4. 各新ファイルに、それぞれ対応する `.gs` の中身をコピペ
   - このフォルダの `00_Main.gs` → GAS の `00_Main` ファイルへコピペ、という対応

### C. 旧 Code.gs を消す

5. すべての新ファイルが揃ったら、左サイドバーの古い `Code.gs` を **右クリック → 削除**
   - 削除前にもう一度 GAS エディタ上で 12 ファイルが揃っていることを確認

### D. 動作確認

6. 右上の **「デプロイ」 → 「デプロイを管理」** から、既存のウェブアプリ デプロイを編集して新バージョンで再デプロイ
7. アプリ(https://longridge2412.github.io/tambo-cho/) を開いて、ホーム画面が読み込めるか確認
8. もし「気温データ取得失敗」等が出る場合は、GAS エディタで該当の関数を実行して具体的なエラーを確認

### E. もし何かおかしくなったら(復元)

- バックアップしたプロジェクトを開いて、`Code.gs` の中身を新プロジェクトにコピペで戻せます
- GAS にはバージョン履歴も残っているので、「デプロイを管理」から旧版に戻すこともできます

---

## 注意点

- **SHEET_NAMES や APP_VERSION などの定数**は、もともと Yuki さんの GAS プロジェクトの**別ファイル(私たちの Code.gs には入っていない)**に定義されているはずです。分割後もそれらの定義ファイルはそのまま残してください(触らなくて大丈夫)
- **GAS は全 .gs を統合して実行**するので、ファイル間で関数を呼び合うことができます(C言語のヘッダ宣言のような書き方は不要)
- 分割後も、`00_Main.gs` の dispatch から全 API へつながる構造は変わっていません

---

## 動作確認の最低限のチェックリスト

- [ ] ホーム画面の投稿フィードが表示される
- [ ] 共有(＋)で水位・写真・メモを送信できる
- [ ] Todo タブで Todo の追加・完了ができる
- [ ] カレンダーで月表示が出る
- [ ] 田植え日の編集が効く
- [ ] 投稿の編集・削除が効く
