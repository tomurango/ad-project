# 広告配信プラットフォーム - AI選択機能実装

## 📋 プロジェクト概要
Electron + Firebase + AI統合の広告配信プラットフォームに、複数AI切り替え機能を実装。

## 🚀 最新実装状況

### ✅ 完了した機能

#### 1. AI Service Manager作成
- **フロントエンド**: `/src/services/ai-service-manager.js`
- **Cloud Functions**: `/functions/src/ai-service-manager.js`
- **対応AI**: Ollama, OpenAI, Claude, Gemini
- **統一API**: `generateText(prompt, options)` で全AI対応

#### 2. アプリヘッダーにAI選択UI
- **位置**: ログイン後のみヘッダー右側に表示
- **UI構成**:
  ```
  🤖 AI: [Ollama ▼] ⚙️
  ```
- **表示制御**: 
  - ログイン前: `display: none`
  - ログイン後: `display: flex`

#### 3. AI設定の永続化
- **保存場所**: LocalStorage (`ai-service-config`)
- **同期**: フロントエンド ⟷ メインプロセス ⟷ Cloud Functions
- **設定項目**: プロバイダー、APIキー、モデル

#### 4. 料金体系の明確化
```
🟢 Ollama (無料・ローカル)
💰 OpenAI (有料) - GPT-3.5 ($0.001/1K), GPT-4 ($0.03/1K)
💰 Claude (有料) - Haiku ($0.25/1M), Sonnet ($3/1M), Opus ($15/1M)
💰 Gemini (有料) - Pro (無料枠あり)
```

#### 5. 既存AI呼び出しの統一化
- **main.js**: 全AI機能を統一APIに変更
- **auto-post-manager.js**: AI Service Manager使用
- **autoPostProcessor.js**: Cloud Functions対応
- **後方互換性**: 既存のOllama呼び出しを保持

### 🔧 現在作業中

#### APIキー取得と動作確認
- **段階**: AI実装完了 → 実際のAPIキー取得・設定
- **対象AI**: OpenAI, Claude, Gemini
- **確認項目**: 
  - APIキー設定
  - 実際のAI生成テスト
  - 各プロバイダーの動作確認

## 📁 ファイル構成

### 新規作成ファイル
```
/src/services/ai-service-manager.js        # フロントエンド用AI管理
/functions/src/ai-service-manager.js       # Cloud Functions用AI管理
```

### 主要修正ファイル
```
/index.html                                # AI選択UI、設定モーダル
/main.js                                   # IPC統一API、AI設定同期
/src/services/auto-post-manager.js         # 統一AI呼び出し
/functions/src/autoPostProcessor.js        # Cloud Functions AI対応
```

## 💻 技術仕様

### AI Service Manager API
```javascript
// プロバイダー設定
aiServiceManager.setProvider('openai');
aiServiceManager.updateConfig('openai', { apiKey: 'sk-...' });

// AI生成
const result = await aiServiceManager.generateText(prompt, {
  maxTokens: 500,
  temperature: 0.7
});
```

### IPC統一API
```javascript
// フロントエンド → メインプロセス
const result = await window.electronAPI.invoke('ai-generate-text', prompt, {
  provider: 'openai',
  config: localStorage.getItem('ai-service-config')
});
```

## 🔍 デバッグ機能

### Console出力例
```
🔧 openAIConfig 呼び出し: openai
🔧 aiServiceManager存在: true
🔧 モーダルを作成中...
✅ モーダル作成完了: ai-config-modal
```

### デバッグ用関数
```javascript
debugModal(); // コンソールでモーダル状態確認
```

## 🚧 今後の課題

### 1. 投稿アシスタント機能（開発中）
- [x] GitHub統合による実際の開発状況取得機能
- [x] プロジェクト編集機能（GitHub URL設定対応）
- [ ] **対話式投稿アシスタント**の実装
  - チャット風UIでAIと対話しながら投稿作成
  - GitHub情報 + プロジェクト情報を活用
  - ユーザーが「もっとカジュアルに」「共感要素を追加」等で調整可能
  - 完成した投稿を手動投稿フォームに自動反映
- [ ] 投稿バリエーション機能
  - 技術進捗重視 / ユーザー価値重視 / バランス型の選択
  - 前回投稿との重複回避機能

### 2. APIキー取得と実動作テスト
- [x] Gemini APIキー取得・設定・動作確認
- [ ] OpenAI APIキー取得・設定
- [ ] Claude APIキー取得・設定  
- [ ] 各プロバイダーでの生成テスト

### 3. AI機能の拡張
- [ ] ストリーミング対応
- [ ] 利用量表示
- [ ] エラー再試行機能

### 4. UI/UX改善
- [ ] 設定画面のデザイン統一
- [ ] プロバイダー状態表示
- [ ] 料金情報の詳細化

## 📊 動作確認方法

### 1. 基本動作
1. アプリ起動 → ログイン
2. ヘッダーにAI選択UI表示確認
3. プロバイダー変更 → 確認ダイアログ
4. 設定画面表示 → APIキー入力

### 2. AI生成テスト
1. プロジェクト作成
2. プラン作成 → AI投稿生成
3. 自動投稿実行 → 選択したAIでコンテンツ生成

### 3. デバッグ確認
1. F12でConsole開く
2. 各操作でログ出力確認
3. エラー発生時の詳細確認

## 🔐 セキュリティ考慮

### APIキー保護
- **保存**: LocalStorage（暗号化なし）
- **送信**: IPC経由でメインプロセスに送信
- **Cloud Functions**: 環境変数で管理

### 今後の改善
- [ ] APIキーの暗号化保存
- [ ] セキュアな設定同期
- [ ] 利用量制限機能

## 📝 開発メモ

### 重要な実装ポイント
1. **ES Modules問題**: フォールバック初期化を実装
2. **設定同期**: LocalStorage → IPC → Cloud Functions
3. **UI制御**: ログイン状態による表示切り替え
4. **エラー処理**: 各段階でのハンドリングと通知

### パフォーマンス最適化
- シングルトンパターンでAI Service Manager管理
- 設定の遅延読み込み
- モーダルの再利用

## 🚀 2025-09-02 更新: 自動投稿システム完全動作化

### ✅ 完了した修正

#### 1. Plan編集機能実装
- **プラン編集モーダル**: 名前、説明、頻度、時刻、有効/無効の編集
- **リアルタイム更新**: 編集後即座にプラン一覧更新
- **フィールド修正**: プラン一覧の時刻表示を`plan.schedule.time`に修正

#### 2. 自動投稿システムの根本修正
- **問題**: Cloud Functionが`users`コレクション0件で動作しない
- **解決**: `collectionGroup('projects')`で直接プロジェクト検索に変更
- **結果**: `processedUsers: 1, totalGenerated: 1` ✅

#### 3. 投稿生成タイミング最適化
- **実行頻度**: 毎日9時 (`0 9 * * *`)
- **生成ロジック**: 3日後が投稿予定日のプランで投稿生成
- **例**: 9/2 9:00実行 → 9/5予定の投稿を生成

#### 4. Firebaseセキュリティルール対応
- **管理者権限**: `allow read, write: if request.auth == null`
- **階層対応**: users/projects/plans/postsすべてにCloud Function権限追加

### 🎯 動作仕様確定

**自動投稿フロー**:
1. **毎日9時**: Cloud Function自動実行
2. **プロジェクト検索**: `collectionGroup('projects')`で全プロジェクト取得
3. **ユーザー分類**: パスから`userId`抽出してグループ化
4. **投稿生成**: 3日後が対象日のプランで投稿作成（3日前生成方式）
5. **頻度対応**: daily/weekly/monthly完全対応

**例**: 
- 実行日: 2025-09-02 09:00
- 生成対象: 2025-09-05予定の投稿
- プラン設定: daily, 10:00 → 9/5 10:00投稿を生成

### 📊 動作確認済み

```json
{
  "success": true,
  "processedUsers": 1,
  "totalGenerated": 1,
  "timestamp": "2025-09-02T05:34:51.207Z"
}
```

### 🔧 主要ファイル修正

- **`autoPostProcessor.js`**: collectionGroup検索、3日前生成ロジック
- **`index.html`**: プラン編集モーダル、表示フィールド修正  
- **`firebase-service.js`**: updatePlan階層構造対応
- **`main.js`**: IPC API修正、デバッグ関数追加
- **`firestore.rules`**: Cloud Functions管理者権限追加

## 🚀 2025-09-02 更新: 2段階AIチャット処理システム実装

### ✅ 実装完了した新機能

#### 1. 構造化意図解析システム
- **関数**: `analyzeUserIntent(userInput, currentPostContent, currentPlanInfo)`
- **機能**: ユーザーの修正指示を以下の構造化データに自動変換
```json
{
  "intent_type": "style_change|tone_modification|content_edit|brand_adjustment",
  "target_scope": "this_post|plan_level",
  "specific_changes": ["文体", "語調", "絵文字使用"],
  "plan_update_required": boolean,
  "suggested_plan_prompt": "カジュアルで親しみやすいトーンで作成",
  "confidence": 0.85
}
```

#### 2. インテリジェント実行処理
- **関数**: `executeIntentBasedActions(intentResult, postId, planId)`
- **機能**: 
  - 投稿内容の自動修正（意図に基づくAI再生成）
  - Plan.customPromptの自動更新（学習機能）
  - トランザクション処理でデータ整合性保証

#### 3. 統合処理システム
- **関数**: `processChatModification(userInput, postId, planId)`
- **フロー**: 
  ```
  ユーザー入力 → 意図解析 → 実行処理 → 結果通知
  ```
- **既存UI統合**: 「✏️修正指示」ボタンで自動実行

### 🎯 使用例
```javascript
// ユーザー: "もっとカジュアルな感じにして、絵文字も使ってほしい"
const result = await processChatModification(
  "もっとカジュアルな感じにして、絵文字も使ってほしい",
  postId, 
  planId
);

// 結果:
// - 投稿内容がカジュアルに自動修正
// - Plan.customPromptに「カジュアルな文体で絵文字を適度に使用」が追加
// - 今後の自動投稿でも同じスタイルを適用
```

### 📊 技術仕様

#### データ構造拡張
```
plans/{planId}
├─ name: "Twitter投稿プラン"
├─ customPrompt: "カジュアルな文体で絵文字を適度に使用\n\n【追加指示】\n短い文章で要点をまとめる" ← 自動蓄積
└─ posts/{postId}
```

#### フォールバック機能
- 意図解析失敗時は従来の単純修正処理に自動切り替え
- JSON解析エラー時の安全なフォールバック処理
- 高い信頼性を保証

### 🔧 実装ファイル
- **`index.html`**: 3つの新関数と既存UI統合
- **フロントエンド**: aiServiceManagerとの完全統合
- **エラーハンドリング**: 多層防御でシステム安定性確保

### 📈 効果
- **学習効果**: ユーザーの好みがプラン設定に自動反映
- **一貫性**: 投稿スタイルの統一と継続性
- **効率性**: 修正指示から実行まで完全自動化

---

## 🎯 次の開発課題・改善点

### 📋 短期課題（すぐに対応可能）

#### 1. Node.js Runtime更新
- **現状**: Node.js 18（2025年10月31日廃止予定）
- **対応**: Node.js 22にアップグレード
- **ファイル**: `functions/package.json` の engines.node設定

#### 2. Firebase Functions SDK更新
- **現状**: firebase-functions@4.9.0
- **推奨**: firebase-functions@latest (5.1.0+)
- **コマンド**: `npm install --save firebase-functions@latest`

#### 3. APIキー取得・設定完了
- [x] Gemini APIキー ✅
- [ ] **OpenAI APIキー** - 実際の生成テスト
- [ ] **Claude APIキー** - Anthropic Console設定

### 📈 中期課題（機能拡張）

#### 4. 2段階AIシステムの改良
- [ ] **意図解析精度向上**: より細かい分類と学習
- [ ] **実行履歴の可視化**: ユーザー向けダッシュボード
- [ ] **学習データエクスポート**: Plan設定の分析・最適化

#### 5. 投稿バリエーション機能
- [ ] **投稿スタイル選択**: 技術重視/ユーザー価値重視/バランス型
- [ ] **重複回避システム**: 前回投稿との差別化自動化
- [ ] **A/Bテスト機能**: 複数バリエーション生成・効果測定

#### 6. プラットフォーム拡張
- [ ] **Instagram対応**: 画像生成+投稿機能
- [ ] **LinkedIn対応**: ビジネス向けコンテンツ最適化
- [ ] **Facebook対応**: 長文投稿サポート

### 🔧 技術的改善

#### 7. パフォーマンス最適化
- [ ] **Cloud Functions冷却対策**: 定期的なウォームアップ
- [ ] **Firebase料金最適化**: 読み取り回数削減
- [ ] **AIプロバイダー負荷分散**: 複数AI自動切り替え

#### 8. セキュリティ強化
- [ ] **APIキー暗号化**: LocalStorage → セキュア保存
- [ ] **率制限実装**: API呼び出し頻度制御
- [ ] **監査ログ**: セキュリティイベント記録

### 📱 UI/UX改善

#### 9. ダッシュボード機能
- [ ] **投稿効果分析**: エンゲージメント統計
- [ ] **AI学習可視化**: Plan調整履歴表示
- [ ] **予約投稿カレンダー**: 視覚的スケジュール管理

#### 10. モバイル対応
- [ ] **レスポンシブデザイン**: タブレット/スマホ最適化
- [ ] **PWA化**: オフライン機能とプッシュ通知

## 🚀 2025-09-11 更新: 投稿時刻修正 + 重複回避システム実装

### ✅ 実装完了した修正・機能

#### 1. Cloud Function投稿時刻問題の解決
- **問題**: プラン設定時刻10:00に対して投稿が19:00で作成される
- **原因**: UTC時間とJST時間の変換処理に問題
- **修正**: 日本時間（JST）での明示的な時刻計算を実装
```javascript
// 修正前: UTCベースで時刻設定
const scheduledAt = new Date();
scheduledAt.setHours(scheduleHour, scheduleMinute, 0, 0);

// 修正後: JST明示的変換
const jstOffset = 9 * 60; // UTC+9時間
const nowJST = new Date(now.getTime() + jstOffset * 60 * 1000);
```

#### 2. 投稿内容重複回避・バリエーション生成システム
- **過去投稿履歴取得**: 最新5件の投稿内容を自動取得
- **重複回避プロンプト**: 過去投稿を参照して異なる角度での投稿生成
- **ランダムスタイル選択**: 5種類の投稿スタイルから自動選択
  - 開発進捗報告スタイル
  - ユーザー価値フォーカススタイル
  - 技術学習共有スタイル
  - プロジェクト背景・想いスタイル
  - 未来展望スタイル
- **AI生成パラメーター調整**: temperature: 0.8, maxTokens: 400

#### 3. カスタムプロンプト統合改善
- 既存のカスタムプロンプトをベースに重複回避指示を自動追加
- 過去投稿との差別化を自動化
- プロンプト構築の構造化・最適化

### 🔧 主要修正ファイル

- **`functions/src/autoPostProcessor.js`**: 
  - JST時刻変換ロジック追加
  - `getRecentPosts()` 過去投稿取得関数
  - `buildEnhancedPrompt()` 強化プロンプト構築関数
  - 重複回避・バリエーション生成システム

### 📊 動作確認済み

```json
{
  "success": true,
  "processedUsers": 1,
  "totalGenerated": 1,
  "timestamp": "2025-09-11T03:22:32.819Z"
}
```

### 🎯 効果

1. **時刻精度**: プラン設定時刻で正確な投稿スケジューリング
2. **コンテンツ多様性**: 過去投稿と重複しない新鮮な内容生成
3. **自動バリエーション**: 投稿スタイルの自動多様化
4. **学習継続**: カスタムプロンプトとの統合維持

---

**最終更新**: 2025-09-11  
**実装者**: Claude Code AI Assistant  
**状態**: 投稿時刻修正 + 重複回避システム実装完了・デプロイ済み