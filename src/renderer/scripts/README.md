# JavaScript Module Reorganization

このディレクトリには、index.htmlから抽出したJavaScriptモジュールが含まれています。

## ファイル構成と読み込み順序

index.htmlでは以下の順序でscriptタグを配置してください：

```html
<!-- 1. 設定とグローバル変数（最初に読み込む必要がある） -->
<script src="scripts/config.js"></script>

<!-- 2. 外部フロントエンドサービス -->
<script src="src/frontend/google-ads-frontend.js"></script>
<script src="src/frontend/youtube-frontend.js"></script>
<script src="src/frontend/multi-auth-frontend.js"></script>

<!-- 3. AI Service Manager（他のモジュールが依存） -->
<script src="src/services/ai-service-manager.js"></script>

<!-- 4. コア機能モジュール -->
<script src="scripts/auth.js"></script>
<script src="scripts/projects.js"></script>
<script src="scripts/posts.js"></script>
<script src="scripts/plans.js"></script>

<!-- 5. プラットフォーム連携 -->
<script src="scripts/platforms.js"></script>

<!-- 6. AI関連機能 -->
<script src="scripts/ai.js"></script>
<script src="scripts/post-assistant.js"></script>

<!-- 7. UI補助機能 -->
<script src="scripts/ui-components.js"></script>

<!-- 8. アプリケーション初期化（最後に読み込む） -->
<script src="scripts/app.js"></script>
```

## モジュール詳細

### config.js ✅ 完成
- Electron API設定
- グローバル変数定義
- 定数定義

**グローバル変数：**
- `currentUser`: 現在のログインユーザー
- `currentProjectId`: 選択中のプロジェクトID
- `currentProjectData`: プロジェクト詳細データ
- `allPosts`: 全投稿データ
- `displayedPostsCount`: 表示済み投稿数
- `chatHistory`: AI chat履歴
- `editingPostId`, `editingPlanId`: 編集中のID

### auth.js ✅ 完成
Firebase認証関連の全機能

**主要関数：**
- `initializeAuth()`: 認証初期化
- `checkAuthState()`: 認証状態確認
- `showAuthenticatedUI()`: 認証済みUI表示
- `showAuthenticationUI()`: 認証UI表示
- `loginWithEmail()`: メールログイン
- `signupWithEmail()`: サインアップ
- `loginWithGoogle()`: Googleログイン
- `logoutUser()`: ログアウト
- `toggleAccountMenu()`: アカウントメニュー開閉
- `showSignupForm()`, `showLoginForm()`: フォーム切り替え
- `showAuthLoading()`: ローディング表示

### projects.js ✅ 完成
プロジェクト管理の全機能

**主要関数：**
- `showProjectsMainScreen()`: プロジェクト一覧表示
- `refreshProjectList()`: プロジェクト一覧更新
- `displayProjectList()`: プロジェクト表示
- `openProjectModal()`, `closeProjectModal()`: モーダル制御
- `registerProject()`: プロジェクト登録
- `editProject()`, `saveProjectChanges()`: 編集機能
- `deleteProject()`: 削除機能
- `viewProjectDetail()`: 詳細表示
- `backToProjectList()`: 一覧に戻る
- `displayProjectDetailInfo()`: 詳細情報表示
- `getCategoryName()`: カテゴリ名取得

### posts.js ✅ 完成
投稿管理の全機能

**主要関数（47関数）：**
- `loadProjectPosts()`: 投稿一覧読み込み
- `displayPosts()`: 投稿表示（AI失敗投稿の視覚的区別対応）
- `loadMorePosts()`: さらに読み込み
- `createManualPost()`: 手動投稿作成
- `editPost()`: 投稿編集
- `deletePost()`: 投稿削除
- `getPostStatusColor()`, `getPostStatusText()`: ステータス表示
- `openPostAssistant()`: 投稿アシスタント起動（新規）
- `openPostAssistantForEdit()`: 投稿アシスタント起動（編集）
- `closePostAssistant()`: アシスタント終了
- `generatePostContent()`: AI投稿生成
- `saveAsManualPost()`: 手動投稿として保存
- `updateExistingPost()`: 既存投稿更新
- `openImproveModal()`: 投稿改善モーダル
- `improvePost()`: 投稿改善（AI処理）
- `saveEditedPost()`: 改善投稿保存
- `analyzeUserIntent()`: ユーザー意図解析
- `executeIntentBasedActions()`: 意図ベース実行
- `processChatModification()`: チャット修正処理
- `loadPostConversations()`, `loadPlanConversations()`: 会話履歴
- その他27関数

### plans.js ✅ 完成
投稿プラン管理の全機能

**主要関数（54関数）：**
- `loadProjectPlans()`: プラン一覧読み込み
- `displayPlans()`: プラン表示
- `createNewPlan()`: プラン作成
- `editPlan()`: プラン編集
- `deletePlan()`: プラン削除
- `submitPlanCreation()`: プラン作成送信
- `collectPlanFormData()`: フォームデータ収集
- `validatePlanData()`: データ検証
- `updateFrequencySettings()`: 頻度設定更新
- `selectPlatformForPlan()`: プラットフォーム選択
- `showPlanEditModal()`: プラン編集モーダル表示
- `savePlanEdit()`: プラン編集保存
- `applyPlatformDefaults()`: プラットフォームデフォルト値適用
- `setupPlatformSpecificUI()`: プラットフォーム固有UI
- `getPlatformDisplayName()`: プラットフォーム表示名
- `saveInstagramCredentials()`, `saveLinkedinCredentials()`: 認証保存
- `testInstagramConnection()`, `testLinkedinConnection()`: 接続テスト
- `postTestInstagram()`, `postTestLinkedin()`: テスト投稿
- `savePlanCustomPrompt()`: カスタムプロンプト保存
- その他35関数

### platforms.js（作成予定）
プラットフォーム連携機能

**主要関数：**
- `switchPlatformTab()`: プラットフォームタブ切り替え
- `switchPlatformAuthTab()`: 認証タブ切り替え
- `saveTwitterCredentials()`: Twitter認証保存
- `testTwitterConnection()`: Twitter接続テスト
- `clearTwitterCredentials()`: 認証クリア
- `updateTwitterStatus()`: Twitter状態更新
- `displayTwitterAuthStatus()`: Twitter認証状態表示
- Instagram, LinkedIn対応関数

### ai.js（作成予定）
AI関連機能

**主要関数：**
- `initializeAIManager()`: AI Manager初期化
- `handleAIProviderChange()`: AIプロバイダー変更
- `openAIConfig()`: AI設定画面
- `createAIConfigModal()`: 設定モーダル作成
- `updateAIConfigModal()`: 設定モーダル更新
- `saveAIConfig()`: AI設定保存
- `testAIConnection()`: AI接続テスト
- `ensureAIServiceManagerReady()`: AI Service Manager準備確認
- `updateAIStatus()`: AI状態更新

### post-assistant.js（作成予定）
投稿アシスタントAI Chat機能

**主要関数：**
- `openPostAssistant()`: アシスタント起動
- `closePostAssistant()`: アシスタント終了
- `initializeUnifiedChat()`: チャット初期化
- `processUserResponse()`: ユーザー応答処理
- `analyzeUserIntent()`: 意図解析
- `executeIntentBasedActions()`: 意図ベース実行
- `processChatModification()`: チャット修正処理
- `generateCustomPromptFromChat()`: カスタムプロンプト生成
- `loadPostConversations()`, `loadPlanConversations()`: 会話履歴読み込み
- `saveCurrentConversation()`: 会話保存

### ui-components.js（作成予定）
UI補助機能

**主要関数：**
- `showNotification()`: 通知表示
- `showSuccessMessage()`, `showErrorMessage()`: メッセージ表示
- `handleModalBackdropClick()`: モーダル背景クリック処理
- `updateTestTweetCharCount()`: 文字数カウント更新
- `initializeTweetForm()`: ツイートフォーム初期化
- `updatePreview()`: プレビュー更新
- ツイート履歴表示関連関数

### app.js ✅ 完成
アプリケーション初期化とイベントリスナー

**主要機能（25関数）：**
- **初期化処理:**
  - DOMContentLoaded イベントハンドラー（2つ）
  - `setupGlobalEventListeners()`: グローバルイベントリスナー
  - `setupFormEventListeners()`: フォームイベント
  - `setupModalEventListeners()`: モーダルイベント
  - `setupButtonEventListeners()`: ボタンイベント
  - `setupInputEventListeners()`: 入力フィールドイベント
  - `setupFrequencyChangeListeners()`: 頻度変更イベント
  - `detectPlatform()`: プラットフォーム判定（macOS等）

- **モーダル・フォーム制御:**
  - `closeAllModals()`: 全モーダルを閉じる
  - `submitManualPost()`: 手動投稿送信
  - `submitEditPost()`: 投稿編集送信

- **ユーティリティ関数:**
  - `formatDateJapanese()`: 日本語日付フォーマット
  - `getRelativeTime()`: 相対時間取得
  - `escapeHtml()`: HTMLエスケープ
  - `truncateText()`: テキスト切り詰め
  - `extractDomain()`: URLドメイン抽出
  - `showLoading()`, `hideLoading()`: ローディング表示
  - `showToast()`: トースト通知
  - `confirmDialog()`: 確認ダイアログ
  - `debugInfo()`: デバッグ情報出力

- **エラーハンドリング:**
  - グローバルエラーハンドラー
  - Promise拒否ハンドラー
  - `handleWindowResize()`: ウィンドウリサイズ

## 抽出完了状況（Phase 2完了）

- ✅ config.js: 完成（56行）
- ✅ auth.js: 完成（293行）
- ✅ projects.js: 完成（505行）
- ✅ **posts.js: 完成（1,202行、47関数）** ← Phase 2
- ✅ **plans.js: 完成（940行、54関数）** ← Phase 2
- ✅ **app.js: 完成（675行、25関数）** ← Phase 2
- ⏳ platforms.js: 次のPhaseで作成
- ⏳ ai.js: 次のPhaseで作成
- ⏳ ui-components.js: 次のPhaseで作成

**Phase 2統計:**
- 合計抽出行数: 2,817行
- 合計関数数: 126関数
- 全体完成度: 約40% → **60%**

## 元のindex.html JavaScript範囲

- **第1ブロック（1092-1115行）**: Electron API設定 → config.js
- **第2ブロック（1121-5601行）**: メインアプリロジック → 複数ファイルに分割
- **第3ブロック（6178-9793行）**: 投稿アシスタント機能 → post-assistant.js

## 注意事項

1. **依存関係**: config.js は必ず最初に読み込む
2. **グローバル変数**: config.js で定義されたグローバル変数に全モジュールが依存
3. **AI Service Manager**: ai.js より前に src/services/ai-service-manager.js を読み込む
4. **イベントリスナー**: app.js で一元管理（DOMContentLoaded内）
5. **後方互換性**: 既存の関数名とシグネチャを維持

## 今後の作業

残りのファイルを抽出し、index.htmlを更新する必要があります。
大規模なJavaScript（約8700行）を適切に分割することで、保守性と可読性が大幅に向上します。
