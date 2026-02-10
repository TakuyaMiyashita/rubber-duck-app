# Rubber Duck App - アーキテクチャ設計書

## 概要

「ラバーダックデバッグ」の概念をアプリ化したデスクトップアプリケーション。
エンジニアが思考を整理するために、ラバーダックに話しかける（テキスト入力する）体験を提供する。

## コンセプト

- ラバーダックは**何も答えない**。それが本質。
- ユーザーが問題を言語化するプロセスそのものが価値。
- AIが答えを出すアプリではなく、**自分で答えに辿り着くための壁打ち相手**。

## テクノロジースタック

| レイヤー | 技術 | 理由 |
|---------|------|------|
| フレームワーク | Electron 33+ | macOS/Windows クロスプラットフォーム |
| フロントエンド | HTML/CSS/Vanilla JS | 軽量・依存少・Electronと相性良 |
| スタイリング | CSS Custom Properties | ダークテーマ対応、モダンなデザインシステム |
| ビルド | electron-builder | macOS(dmg) / Windows(exe) 両対応 |
| パッケージ管理 | npm | 標準 |

### なぜReact/Vueを使わないか

- アプリの規模が小さく、SPA フレームワークはオーバーキル
- Electronの起動速度を落としたくない
- 依存を最小限にして長期メンテナンス性を確保

## アーキテクチャ図

```
┌─────────────────────────────────────────┐
│              Electron App               │
│                                         │
│  ┌───────────────┐  ┌───────────────┐  │
│  │ Main Process  │  │Renderer Process│  │
│  │               │  │               │  │
│  │ - App起動     │  │ - UI描画      │  │
│  │ - ウィンドウ管理│  │ - チャットUI  │  │
│  │ - システムトレイ│  │ - アニメーション│  │
│  │ - IPC通信     │◄─►│ - IPC通信     │  │
│  │ - ファイルI/O  │  │               │  │
│  │               │  │               │  │
│  └───────────────┘  └───────────────┘  │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │            Preload Script           ││
│  │  - contextBridge でAPI公開          ││
│  │  - セキュアなIPC橋渡し              ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

## ディレクトリ構成

```
rubber_duck_app/
├── docs/                    # 設計ドキュメント
│   ├── architecture.md      # ← このファイル
│   ├── design.md            # UI/UXデザイン仕様
│   ├── commands.md          # 開発コマンド集
│   └── features.md          # 機能仕様書
├── dev-log.md               # 開発ログ（Qiita記事用）
├── src/
│   ├── main/
│   │   └── main.js          # Electronメインプロセス
│   ├── preload/
│   │   └── preload.js       # プリロードスクリプト
│   └── renderer/
│       ├── index.html        # メインHTML
│       ├── styles/
│       │   ├── reset.css     # CSSリセット
│       │   ├── variables.css # デザイントークン
│       │   └── main.css      # メインスタイル
│       ├── js/
│       │   ├── app.js        # アプリエントリポイント
│       │   ├── chat.js       # チャットロジック
│       │   ├── duck.js       # ダックアニメーション
│       │   └── storage.js    # 会話保存ロジック
│       └── assets/
│           └── duck.svg      # ダックアイコン
├── build/                    # ビルド用アセット
│   └── icon.png              # アプリアイコン
├── package.json
├── .gitignore
└── CLAUDE.md                 # AI開発用コンテキスト
```

## セキュリティ方針

- `nodeIntegration: false` — レンダラーからNode.jsに直接アクセスさせない
- `contextIsolation: true` — preloadでcontextBridgeを使いAPI公開
- `sandbox: true` — レンダラープロセスをサンドボックス化

## データ永続化

- `electron-store` は使わず、シンプルにJSONファイルで保存
- 保存先: `app.getPath('userData')` 配下
- 保存データ: 会話履歴（セッション単位）

## 対応プラットフォーム

| OS | バージョン | パッケージ形式 |
|----|-----------|---------------|
| macOS | 12+ (Monterey以降) | .dmg |
| Windows | 10+ | .exe (NSIS installer) |
