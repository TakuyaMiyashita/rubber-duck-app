# Rubber Duck App - 開発コマンド集

## セットアップ

```bash
# 依存パッケージインストール
npm install

# 開発モードで起動
npm start

# 開発モード（ホットリロード風: 手動再起動）
npm run dev
```

## 音声認識セットアップ（whisper.cpp）

```bash
# whisper-cli インストール（macOS）
brew install whisper-cpp

# モデルダウンロード（base, 141MB, 日本語対応）
mkdir -p models
curl -L -o models/ggml-base.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin

# 動作確認
whisper-cli -m models/ggml-base.bin -l ja -np /tmp/test.wav
```

> Windows の場合は [whisper.cpp releases](https://github.com/ggerganov/whisper.cpp/releases) からビルド済みバイナリを取得。

## ビルド

```bash
# macOS向けビルド (.dmg)
npm run build:mac

# Windows向けビルド (.exe)
npm run build:win

# 全プラットフォーム一括ビルド
npm run build:all
```

## 開発中に使うコマンド

```bash
# DevToolsを開いた状態で起動
npm run dev

# パッケージの脆弱性チェック
npm audit

# 未使用の依存を確認
npx depcheck
```

## Git操作

```bash
# 初回
git init
git add .
git commit -m "Initial commit: Rubber Duck App"

# ブランチ運用（任意）
git checkout -b feature/chat-ui
git checkout -b feature/duck-animation
git checkout -b feature/session-history
```

## トラブルシューティング

```bash
# node_modules再インストール
rm -rf node_modules package-lock.json && npm install

# Electronキャッシュクリア
rm -rf ~/Library/Application\ Support/rubber-duck-app  # macOS
# %APPDATA%\rubber-duck-app  # Windows

# Electronバージョン確認
npx electron --version
```

## プロジェクト構造確認

```bash
# ディレクトリツリー表示
tree -I node_modules -L 3

# ファイル行数カウント
find src -name "*.js" -o -name "*.css" -o -name "*.html" | xargs wc -l
```

## 命令メモ（開発中に忘れがちなこと）

### Electron開発の注意点
- `main.js` を変更したらアプリ再起動が必要（レンダラーはリロードで可）
- `preload.js` は `contextBridge` 経由でしかAPIを公開できない
- macOSではアプリを閉じてもプロセスが残る → `app.on('window-all-closed')` で対処

### CSS関連
- Electronでは `-webkit-` プレフィックスが使える（Chromiumベース）
- `user-select: none` をタイトルバーに設定忘れずに
- `-webkit-app-region: drag` でウィンドウドラッグ可能に

### ビルド関連
- macOS向けビルドはmacOSからのみ（コードサイニング）
- Windows向けビルドはどのOSからでも可能
- アプリアイコンは最低512x512pxのPNGを用意
