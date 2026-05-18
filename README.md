# 田んぼ帳

田んぼを共同管理する8人グループ向けの Web アプリ。

「アプリ」ではなく「**帳面**」と位置づける ── 機能を盛り込むのではなく、書き留めていく場所。

## 公開URL

https://longridge2412.github.io/tambo-cho/

## 機能

- 本日の水加減(時期目標と直近の見回り写真の照合)
- 本日の当番表示
- 見回り記録(水位写真、評価、自由メモ)
- LINE 共有用テキストの自動生成

## 技術構成

- フロント: HTML + React 18 (CDN) + htm + ES Modules
- バックエンド: Google Apps Script
- データ: Google Sheets
- 画像保存: Google Drive
- ホスティング: GitHub Pages
- PWA: ホーム画面追加対応

## ローカル開発

```bash
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000` を開く。

`file://` で直接開くと ES Modules が読めません。必ずローカルサーバー経由で。

## ライセンス

内部利用のみ
