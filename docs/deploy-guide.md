# Firebase Functions デプロイガイド

## 1. 事前準備

### 環境変数設定
```bash
# Firebase CLIで環境変数を設定
firebase functions:config:set \
  encryption.key="your-32-char-secret-key-change-this" \
  ollama.url="http://your-ollama-server:11434"

# 設定確認
firebase functions:config:get
```

### Firestore データベース作成
1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. プロジェクトを選択
3. 「Firestore Database」→「データベースを作成」
4. 場所: `asia-northeast1` (東京) を選択
5. セキュリティルール: 本番モードで開始

## 2. デプロイ手順

### ローカルテスト（推奨）
```bash
# Firebase Emulator起動
firebase emulators:start

# 別ターミナルでテスト実行
# http://localhost:4000 でEmulator UIが開く
```

### 本番デプロイ
```bash
# Functions のみデプロイ
firebase deploy --only functions

# Firestore ルールも含めて全体デプロイ
firebase deploy

# 特定のFunctionのみデプロイ
firebase deploy --only functions:preGenerateTweets
firebase deploy --only functions:postScheduledTweets
```

## 3. デプロイ後の確認

### Functions 動作確認
```bash
# ログ確認
firebase functions:log

# 特定Function のログ
firebase functions:log --only preGenerateTweets

# ヘルスチェック
curl https://your-region-your-project.cloudfunctions.net/healthCheck
```

### Firestore 確認
1. Firebase Console → Firestore Database
2. コレクションが正しく作成されているか確認
3. セキュリティルールが適用されているか確認

## 4. スケジュール設定確認

### Cloud Scheduler 確認
1. [Google Cloud Console](https://console.cloud.google.com/)
2. Cloud Scheduler ページ
3. 以下のジョブが作成されているか確認：
   - `firebase-schedule-preGenerateTweets` (毎晩23:00)
   - `firebase-schedule-postScheduledTweets` (毎朝10:00)
   - `firebase-schedule-retryFailedTweets` (6時間毎)

## 5. 認証設定

### Firebase Authentication 有効化
1. Firebase Console → Authentication
2. 「始める」をクリック
3. ログイン方法タブ
4. 「メール/パスワード」を有効化
5. （オプション）Google認証も有効化

## 6. 費用確認

### Firebase 使用量モニタリング
1. Firebase Console → 使用量
2. Functions実行時間を確認
3. Firestore読み書き回数を確認

### 無料枠の目安
- **Functions実行時間**: 月40,000GB秒まで無料
- **Firestore**: 日50,000読み書きまで無料
- **Cloud Scheduler**: 月3ジョブまで無料

## 7. トラブルシューティング

### よくあるエラー

#### デプロイエラー
```bash
# Node.jsバージョン確認
node --version  # v18以上が必要

# 依存関係再インストール
cd functions
rm -rf node_modules package-lock.json
npm install
```

#### 権限エラー
```bash
# Firebase ログイン再実行
firebase logout
firebase login

# プロジェクト確認
firebase projects:list
firebase use your-project-id
```

#### Functions実行エラー
```bash
# 詳細ログ確認
firebase functions:log --limit 50

# 特定のエラーパターン
# - "PERMISSION_DENIED" → Firestore ルール確認
# - "TIMEOUT" → Functions実行時間制限確認
# - "INVALID_ARGUMENT" → リクエストパラメータ確認
```

## 8. セキュリティ設定

### 重要な設定項目
1. **暗号化キー**: 必ず32文字以上の安全なキーに変更
2. **Firestore ルール**: 本番環境では厳格に設定
3. **Functions認証**: 認証必須のエンドポイントを確認
4. **Twitter API キー**: 環境変数で管理、ログに出力しない

### セキュリティチェックリスト
- [ ] 暗号化キーをデフォルトから変更
- [ ] Firestore ルールで適切な権限設定
- [ ] Twitter API認証情報の暗号化確認
- [ ] Functions ログに機密情報が含まれていないか確認
- [ ] HTTPSエンドポイントの認証確認

## 9. モニタリング設定

### アラート設定（推奨）
1. Functions エラー率 > 5%
2. Functions実行時間 > 300秒
3. Firestore読み書き数が無料枠の80%超
4. Twitter API制限エラー発生

### ダッシュボード
1. Firebase Console の「パフォーマンス」タブ
2. Google Cloud Console の「モニタリング」
3. Functions実行回数、エラー率、実행時間を確認