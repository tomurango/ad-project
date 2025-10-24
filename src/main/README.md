# Electronメインプロセス モジュール構成

このディレクトリには、Electronメインプロセス（main.js）をモジュール化したファイルが含まれています。

## 📁 ディレクトリ構造

```
src/main/
├── README.md              # このファイル
├── services-init.js       # サービス初期化 ✅ 完成
├── window.js              # ウィンドウ管理 ✅ 完成
└── ipc/                   # IPCハンドラー（今後分割予定）
    ├── auth.js            # Firebase認証
    ├── firestore.js       # Firestore操作
    ├── projects.js        # プロジェクト管理
    ├── plans.js           # プラン管理
    ├── posts.js           # 投稿管理
    ├── twitter.js         # Twitter関連
    ├── google-ads.js      # Google Ads
    ├── youtube.js         # YouTube
    ├── github.js          # GitHub
    ├── platforms.js       # Instagram/LinkedIn
    └── ai.js              # AI関連
```

## ✅ 完成したモジュール

### services-init.js
**サービス初期化モジュール**

全ての外部サービス（Firebase、Twitter、Google Ads等）の初期化を一元管理。

**エクスポート**:
- サービスインスタンス
  - `ollamaService`
  - `aiServiceManager`
  - `firebaseService`
  - `twitterService`
  - `twitterOAuthService`
  - `googleAdsService`
  - `youtubeDataService`
  - `multiPlatformAuthManager`
  - `getMigrationService()`

- 初期化関数
  - `initializeAllServices()` - 全サービス初期化
  - `initializeFirebase()`
  - `initializeTwitter()`
  - `initializeGoogleAds()`
  - `initializeYouTubeData()`
  - `initializeMultiPlatformAuth()`

- OAuth サーバー
  - `callbackServer`, `setCallbackServer()`, `getCallbackServer()`

### window.js
**ウィンドウ管理モジュール**

Electronアプリケーションのメインウィンドウ作成・管理。

**エクスポート**:
- `createWindow()` - メインウィンドウ作成

## 🔄 IPCハンドラー分割計画

### 現状
元のmain.js: **2,380行、114個のIPCハンドラー**

### 分割予定（合計114ハンドラー）

#### 1. ipc/auth.js (約15ハンドラー)
Firebase認証関連のIPCハンドラー
- `firebase-auth-status`
- `firebase-login-email`
- `firebase-signup-email`
- `firebase-login-google`
- `firebase-logout`
- `firebase-get-current-user`
- 他

#### 2. ipc/firestore.js (約20ハンドラー)
Firestore CRUD操作
- プロジェクトCRUD
- プランCRUD
- 投稿CRUD
- ユーザー設定
- 他

#### 3. ipc/projects.js (約10ハンドラー)
プロジェクト管理専用
- プロジェクト作成・更新・削除
- プロジェクト一覧取得
- GitHub連携
- 他

#### 4. ipc/plans.js (約10ハンドラー)
プラン管理専用
- プラン作成・更新・削除
- プラン一覧取得
- スケジュール管理
- 他

#### 5. ipc/posts.js (約10ハンドラー)
投稿管理専用
- 投稿作成・更新・削除
- 投稿一覧取得
- 投稿スケジュール
- 他

#### 6. ipc/twitter.js (約15ハンドラー)
Twitter/X関連
- OAuth認証
- 投稿機能
- API設定
- テスト投稿
- 他

#### 7. ipc/google-ads.js (約10ハンドラー)
Google Ads関連
- 認証
- キャンペーン管理
- 広告作成
- 他

#### 8. ipc/youtube.js (約8ハンドラー)
YouTube関連
- 認証
- 動画管理
- チャンネル情報
- 他

#### 9. ipc/github.js (約5ハンドラー)
GitHub連携
- リポジトリ情報取得
- コミット履歴
- 他

#### 10. ipc/platforms.js (約5ハンドラー)
その他プラットフォーム（Instagram/LinkedIn）
- 認証
- 投稿
- 他

#### 11. ipc/ai.js (約6ハンドラー)
AI関連
- AI設定保存・読み込み
- プロバイダー切り替え
- テスト生成
- 他

## 📝 使用例

### 新しいmain.js（リファクタリング後）

```javascript
const { app } = require('electron');
const { createWindow } = require('./src/main/window');
const { initializeAllServices } = require('./src/main/services-init');

// IPCハンドラーをインポート
require('./src/main/ipc/auth');
require('./src/main/ipc/firestore');
require('./src/main/ipc/projects');
// ... 他のIPCハンドラー

// アプリ起動時の処理
app.whenReady().then(async () => {
  await initializeAllServices();
  createWindow();
});

// ウィンドウが全て閉じられた時
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// アクティベーション時（macOS）
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
```

### IPCハンドラーの例（ipc/auth.js）

```javascript
const { ipcMain } = require('electron');
const { firebaseService } = require('../services-init');

// Firebase認証状態確認
ipcMain.handle('firebase-auth-status', async () => {
  try {
    const user = firebaseService.getCurrentUser();
    return {
      success: true,
      isAuthenticated: !!user,
      user: user ? {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      } : null
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// メール・パスワードでログイン
ipcMain.handle('firebase-login-email', async (event, { email, password }) => {
  try {
    const result = await firebaseService.loginWithEmail(email, password);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 他のハンドラー...
```

## 🎯 リファクタリングの効果

### 改善点
1. **保守性向上**
   - 機能別にファイル分離
   - 責務の明確化
   - 変更時の影響範囲が限定的

2. **可読性向上**
   - 1ファイルあたり200-300行程度
   - 機能ごとに整理
   - ドキュメント充実

3. **テスト容易性**
   - モジュール単位でのテスト可能
   - モック作成が簡単

4. **並行開発可能**
   - 複数人での開発が容易
   - コンフリクト発生率低下

### ビフォー・アフター
```
元のmain.js:        2,380行 (72KB)
リファクタリング後:  約300行 + 11モジュール

- services-init.js:  約180行
- window.js:         約50行
- ipc/auth.js:       約200行
- ipc/firestore.js:  約250行
- ... (他のIPCハンドラー)
```

## 🔄 次のステップ

1. [ ] ipc/auth.js の作成
2. [ ] ipc/firestore.js の作成
3. [ ] ipc/projects.js の作成
4. [ ] ipc/plans.js の作成
5. [ ] ipc/posts.js の作成
6. [ ] ipc/twitter.js の作成
7. [ ] ipc/google-ads.js の作成
8. [ ] ipc/youtube.js の作成
9. [ ] ipc/github.js の作成
10. [ ] ipc/platforms.js の作成
11. [ ] ipc/ai.js の作成
12. [ ] 新しいmain.jsの完成
13. [ ] 動作確認

---

**作成日**: 2025-10-24
**ステータス**: Phase 1完了（services-init.js, window.js完成）
**次フェーズ**: IPCハンドラー分割
