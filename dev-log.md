# 開発ログ — Rubber Duck App

> このログはQiita記事執筆用の素材です。
> AI駆動開発（Claude Code）でElectronアプリを作る過程を記録しています。
> 生のログなのでクオリティは気にしない方針。

---

## 2026-02-09 セッション1: プロジェクト始動

### 21:57 - 最初の一歩

やりたいこと: ラバーダックデバッグをアプリ化したい。

ラバーダックデバッグってのは、プログラマが机の上のゴム製のアヒルに向かって
コードの説明をすることで問題を見つける手法。アヒルは何も答えない。でも
説明するプロセスで自分の思考が整理される。これをデスクトップアプリにしたい。

なんでわざわざアプリにするのか？ → 履歴が残るし、ちゃんとしたUIがあると
なんとなくモチベ上がるよねっていう。あとElectronの勉強も兼ねて。

### 21:58 - 技術選定で悩んだこと

最初React使おうかと思ったけど、チャットUIひとつ作るだけなのに
create-react-appとかNext.jsとか入れるのはなんか違う気がする。
Vanilla JS + CSSで十分でしょ。Electronの中でBabelとかWebpackとか
動かすの面倒だし。

ダークテーマはGitHubのダークモード風にした。エンジニアが見慣れた色味にしたかった。
`#0d1117`をベースカラーに。

### 22:00 - ダックの応答をどうするか問題

ラバーダックなので何も答えないのが正解なんだけど、
「...」だけだとアプリとして寂しくない？

→ でもAIに答えさせたらラバーダックの意味がないよね
→ 折衷案: 基本は「...」。でもごく稀に「quack」って言う。1%の確率で。
→ これイースターエッグっぽくて良いかも

### 22:05 - アーキテクチャ設計

Electronの定番構成で:
- Main Process: アプリのライフサイクル管理、ファイルI/O
- Preload Script: セキュアなIPC橋渡し（contextBridge）
- Renderer Process: UI全部

セキュリティは `nodeIntegration: false` + `contextIsolation: true` が
今のElectronの作法。ここ手抜きするとセキュリティホールになるので
ちゃんとやる。

### 22:10 - 実装開始

Claude Codeにドキュメント群を一気に作ってもらった。
architecture.md, design.md, features.md, commands.md。
設計書をちゃんと書いてから実装に入るの、AI駆動開発でも大事だと思う。
というかAI駆動だからこそ設計書が効く。AIに「これに従って実装して」って
言えるから。

さて、ここからElectronプロジェクトのセットアップと実装に入る。

## 2026-02-09 セッション2: 実装と最初のバグ

### 22:15 - 一気に実装

Claude Codeに全ファイルを一気に生成してもらった。
- `src/main/main.js` — Electronメインプロセス
- `src/preload/preload.js` — contextBridge経由のAPI公開
- `src/renderer/` — HTML, CSS, JSの全UI

Vanilla JSでモジュール風にIIFEで書いた（Storage, Duck, Chat, App）。
ES Modulesにしなかったのは、Electronのファイルプロトコルとの相性と
シンプルさを優先したから。

CSSはCSS Custom Propertiesで変数管理。
`--accent: #f0b429` — ダックイエロー。これがアプリ全体のアクセントカラー。

### 22:20 - SVGダックを描く

ダックのSVGを手書き（AIが）。フラットデザインで
楕円の体、丸い頭、小さな目と嘴。シンプルだけど愛嬌ある感じ。
drop-shadowでダックイエローのグロウをつけたら、
ダークテーマの上でいい感じに浮かび上がった。

### 22:30 - 最初の起動...失敗

`npm start` → クラッシュ。

```
TypeError: Cannot read properties of undefined (reading 'handle')
```

`ipcMain` が undefined。え、`require('electron')` してるのに？
15分くらい悩んだ。

### 22:45 - 原因発見: ELECTRON_RUN_AS_NODE

環境変数 `ELECTRON_RUN_AS_NODE=1` がセットされていた！
これがあるとElectronはGUIアプリとして起動せず、
ただのNode.jsランタイムとして動く。
そりゃ `require('electron')` がバイナリパスの文字列を返すわけだ。

Claude Code（VSCode拡張）がNode.jsとしてElectronを使うために
この環境変数をセットしていたのが原因。`unset` したら一発で起動した。

**教訓**: Electronアプリが `require('electron')` で
おかしな値を返したら、`ELECTRON_RUN_AS_NODE` を疑え。

### 22:50 - ついに起動

ダークなウィンドウにダックが浮かんでる！
カスタムタイトルバーも動いてるし、チャットUIもちゃんと表示されてる。
テキスト入力→送信→ダックが「...」って返す。動いた。

最初 Electron 33 を入れてたけど、念のため 31 に下げた。
結局バージョンの問題じゃなく環境変数だったんだけど、
安定版にしておく方が安心なのでそのままにした。

### 22:55 - 現在のステータス

**動いているもの**:
- ダークテーマUI ✅
- カスタムタイトルバー（macOS信号機ボタン対応）✅
- チャットメッセージ送受信 ✅
- ダックの浮遊アニメーション ✅
- ダックのバウンスアニメーション ✅
- ダックの応答パターン（...、...?、......、quack）✅
- タイピングインジケーター ✅
- セッション管理（保存/読込）✅
- 履歴パネル ✅
- キーボードショートカット ✅

**まだ**:
- 実機での見た目の微調整
- アプリアイコン作成
- electron-builderでのパッケージング

## 2026-02-10 セッション3: 音声入力対応

### 09:55 - 「声で話しかけたい」

テキストで打ち込むのもいいけど、ラバーダックデバッグの本質は
「声に出して説明する」こと。だったら音声入力できた方がよくない？

ということで音声入力機能を追加することにした。

### 09:56 - 技術選定: Web Speech API

外部ライブラリ不要！Electronは Chromium ベースだから
`webkitSpeechRecognition` がそのまま使える。
Google のサーバーに音声を送って認識するタイプなので
ネット接続は必要だけど、認識精度は高い。

日本語対応も `recognition.lang = 'ja-JP'` で一発。

### 09:57 - macOSのマイク権限

macOSだとマイクアクセスに権限が必要。
`systemPreferences.askForMediaAccess('microphone')` で
権限リクエストダイアログを出せる。
Windowsは OS 側で自動ハンドリングされるのでElectron側では不要。

これメインプロセス側でやらないとダメなので、
IPC 経由（`check-mic-permission`）で呼ぶ設計にした。

### 10:00 - UI設計

送信ボタンの横にマイクボタンを追加。
- 通常状態: グレーのマイクアイコン
- 録音中: 赤いパルスアニメーション付き
- 権限拒否: 半透明で操作不可

パルスアニメーション（ `micPulse` ）でボタンの外周が
ふわっと広がる感じ。録音中であることが視覚的にわかる。

### 10:05 - interimResults の工夫

`recognition.interimResults = true` にすると、
話している途中の暫定テキストがリアルタイムで取れる。
確定テキスト（`isFinal`）だけを入力欄に追加するようにした。

`continuous = true` で止めるまで連続認識。
ブラウザが勝手に止めることがあるので `end` イベントで
再開するハンドリングも入れた。

### 10:08 - 完成

5ファイルの変更で音声入力が動いた:
- `main.js` — マイク権限IPC追加
- `preload.js` — API公開追加
- `index.html` — マイクボタン追加
- `voice.js` — 音声認識ロジック（新規）
- `app.js` — Voice統合
- `main.css` — マイクボタンスタイル

Vanilla JS + Web API だけでここまでできるの、改めてすごい。

### 10:15 - バグ: 日本語入力で二重送信

実際に使ってみたら、日本語入力で変換確定のEnterを押した瞬間に
メッセージが送信されてしまうバグが発覚。
「こんにちは」って打とうとして変換確定したら即送信される。つらい。

原因は `keydown` イベントで `e.isComposing` をチェックしてなかったこと。
IME（日本語入力）が変換中に出すEnterキーイベントには
`isComposing: true` がセットされる。これを見て無視すればいい。

```js
// 修正前
if (e.key === 'Enter' && !e.shiftKey) {

// 修正後
if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
```

1行の修正。でもこれ、日本語対応のアプリ作るなら絶対ハマるやつ。
英語圏のチュートリアルだと `isComposing` に触れてないことが多いので
知らないとずっと気づけない。

**教訓**: テキスト入力のEnterハンドリングでは必ず `isComposing` をチェック。
日本語・中国語・韓国語など IME を使う言語では必須。

### 10:30 - 音声入力のUX改善: 自動送信モード

最初の音声入力実装は「認識テキストを入力欄に入れる → ユーザーが手動送信」
だった。でもこれだと結局キーボードに手を伸ばす必要があって微妙。

ラバーダックの本質は「声に出して説明する」こと。
マイクボタンを押したら、あとはただ喋るだけ。
話すたびにダックが「...」って相槌打ってくれる。
これがあるべき姿でしょ。

ということで設計変更:
- 音声認識の確定テキスト → **自動でメッセージ送信**
- 録音は**止めない**（マイクボタンで明示的にOFFするまで継続）
- ダックが毎回ちゃんと「...」で相槌を打つ
- 暫定テキスト（認識中のやつ）はプレースホルダに表示

`handleSend` を `sendMessage(text)` と `handleSend()` に分離した。
`sendMessage` はテキストを直接受け取って送信するだけの純粋な関数。
`handleSend` はUI操作（入力欄クリア・録音停止）を含むラッパー。
音声入力からは `sendMessage` を直接呼ぶので、
入力欄のクリアも録音停止もされない。きれいに分離できた。

### 10:40 - バグ: 音声入力が動かない（CSPが犯人）

マイクボタンを押すとmacOSのマイクインジケーターは点滅する。
つまりマイクへのアクセス自体は成功してる。
でもアプリ側で音声が認識されない。

原因は **Content Security Policy (CSP)** だった。

```html
<!-- 修正前 -->
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self'; ...">
```

`default-src 'self'` しか指定してなかったので、
`connect-src` も `'self'` に制限される。
Web Speech API は内部的にGoogleのサーバーに音声を送って認識するので、
`https://*.google.com` への通信がブロックされてた。

```html
<!-- 修正後: Googleの音声認識サーバーへの接続を許可 -->
connect-src 'self' https://*.google.com https://*.googleapis.com wss://*.google.com;
media-src 'self' blob:;
```

**教訓**: Web Speech API は見た目はブラウザのローカルAPIだけど、
裏でGoogleのクラウドに通信している。CSPを厳しく設定すると静かに死ぬ。
エラーメッセージも出ないから気づきにくい。

### 10:20 - まだ動かない: sandbox と権限ハンドラ

CSP直しても音声認識が動かない。macOSのマイクインジケーターは
点灯するから、マイクへのアクセス自体はできてる。
でも `recognition.onresult` が一度も発火しない。

2つ修正した:

**1. `sandbox: true` を削除**

`webPreferences` に `sandbox: true` を入れてたのが原因かも。
sandbox モードだと Web Speech API の内部通信が制限される可能性がある。
削除した。

**2. Electronの権限リクエストハンドラを追加**

Electron はデフォルトでメディア権限リクエストを拒否する。
明示的に許可する必要がある:

```js
session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
  const allowed = ['media', 'microphone', 'speech-recognition'];
  callback(allowed.includes(permission));
});
```

これを `app.whenReady()` 内で `createWindow()` の前に配置。

### 10:25 - それでも動かない

上の修正を入れても認識しない。
途中でVSCode側からマイク権限の許可を求められた。
VSCodeとElectronアプリでマイクリソースが競合してる可能性？

一旦マシン再起動して確認する。

**仮説**:
- macOSのマイク権限がElectronアプリに正しく付与されてない
- VSCode（Claude Code）がマイクを掴んでて排他的になってる
- Electron 31 の Web Speech API 実装に問題がある
- そもそも `webkitSpeechRecognition` が Electron では完全にサポートされてない可能性

再起動後に切り分ける。

---

（ここから先は開発が進むにつれて追記される）
