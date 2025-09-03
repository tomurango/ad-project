# 🚀 広告配信プラットフォーム

自動化された広告配信・管理システム（Electronデスクトップアプリ）

## 📁 ディレクトリ構成

```
/ad-project/
├── README.md                     # プロジェクト概要（このファイル）
├── package.json                  # 依存関係・ビルド設定
├── main.js                       # Electronメインプロセス
├── index.html                    # UIメインファイル
│
├── docs/                         # 📚 ドキュメント
│   ├── CLAUDE.md                 # 開発メモ・進捗記録
│   ├── REQUIREMENTS.md           # 詳細要件定義
│   ├── DEVELOPMENT_ROADMAP.md    # 開発ロードマップ
│   ├── TECHNICAL_STACK_STATUS.md # 技術スタック状況
│   ├── deploy-guide.md           # デプロイガイド
│   ├── firebase-setup.md         # Firebase設定手順
│   ├── functions-implementation.md # Functions実装ガイド
│   └── firestore-schema.md       # Firestore スキーマ
│
├── src/                          # 💻 ソースコード
│   ├── frontend/                 # フロントエンドJavaScript
│   │   ├── google-ads-frontend.js    # Google Ads UI制御
│   │   ├── youtube-frontend.js       # YouTube分析UI制御
│   │   ├── twitter-frontend.js       # Twitter管理UI制御
│   │   ├── firebase-frontend.js      # Firebase UI制御
│   │   └── multi-auth-frontend.js    # 統合認証UI制御
│   └── services/                 # バックエンドサービス
│       ├── ollama-service.js         # Ollama AI統合
│       ├── google-ads-service.js     # Google Ads API
│       ├── youtube-data-service.js   # YouTube Data API
│       ├── twitter-service.js        # Twitter API
│       ├── firebase-service.js       # Firebase統合
│       └── multi-platform-auth-manager.js # 認証管理
│
├── config/                       # ⚙️ 設定ファイル
│   ├── firebase-config.js        # Firebase設定
│   ├── firebase.json             # Firebaseプロジェクト設定
│   ├── firestore.rules           # Firestoreセキュリティルール
│   └── firestore.indexes.json    # Firestoreインデックス
│
├── functions/                    # ☁️ Firebase Cloud Functions
│   ├── package.json              # Functions依存関係
│   ├── index.js                  # Functions エントリーポイント
│   └── src/                      # Functions ソースコード
│       ├── aiGenerator.js        # AI投稿生成
│       ├── twitterAPI.js         # Twitter連携
│       ├── schedule.js           # スケジュール管理
│       └── utils/                # ユーティリティ
│
└── archive/                      # 📦 アーカイブ
    ├── index-old-complex.html    # 旧複雑版HTML
    ├── index-complex-backup.html # 複雑版バックアップ
    └── *.backup                  # 各種バックアップファイル
```

## 🚀 開発・実行コマンド

```bash
# 開発モード起動（推奨）
npm run dev

# 通常起動
npm run start

# Macアプリビルド
npm run build-mac

# Windowsアプリビルド  
npm run build-win
```

## ✨ 実装済み機能

### 🎯 コア機能
- ✅ **AI自動投稿生成** - Ollama + Qwen2.5モデル
- ✅ **プロジェクト管理** - 自動検出・AI説明生成
- ✅ **マルチプラットフォーム対応** - Twitter, Google Ads, YouTube

### 📱 UI機能
- ✅ **ツイート投稿** - 手動・AI生成・スケジュール投稿
- ✅ **AIチャット相談** - 広告戦略・投稿内容の相談
- ✅ **プロジェクト管理** - ディレクトリ選択・候補検出
- ✅ **Twitter管理** - API設定・接続テスト・投稿テスト
- ✅ **Firebase管理** - 認証・同期・履歴・スケジュール

### 🔗 API統合
- ✅ **Ollama AI** - ローカルAI（Qwen2.5:0.5b）
- ✅ **Twitter API v2** - OAuth 1.0a認証
- ✅ **Google Ads API** - OAuth 2.0認証
- ✅ **YouTube Data API v3** - API Key認証
- ✅ **Firebase** - Authentication, Firestore, Functions

## 🛠️ 技術スタック

- **フレームワーク**: Electron
- **言語**: JavaScript/Node.js
- **AI**: Ollama (Qwen2.5:0.5b)
- **データベース**: SQLite (ローカル) + Firestore (クラウド)
- **クラウド**: Firebase (Authentication, Functions, Hosting)

## 📝 最終更新

**日付**: 2025-08-12  
**状況**: 全機能完全動作確認済み  
**システム**: 本格開発・実用テスト準備完了