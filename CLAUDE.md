# CLAUDE.md - AI開発コンテキスト

## プロジェクト概要
ラバーダックデバッグ用のElectronデスクトップアプリ。macOS/Windows対応。

## 設計ドキュメント
- `docs/architecture.md` - アーキテクチャ設計
- `docs/design.md` - UI/UXデザイン仕様
- `docs/features.md` - 機能仕様
- `docs/commands.md` - 開発コマンド集
- `dev-log.md` - 開発ログ（Qiita記事用）

## 技術スタック
- Electron (フレームワークなし, Vanilla JS)
- CSS Custom Properties でダークテーマ
- electron-builder でクロスプラットフォームビルド

## 開発ルール
- 変更を行ったら `dev-log.md` にも経過を追記する
- セキュリティ: nodeIntegration:false, contextIsolation:true を厳守
- UIはダークテーマ、monospaceフォント
- ダックは何も答えない（「...」「...?」「......」「quack」のみ）
